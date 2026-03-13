import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { resolveAIConfig } from '@/lib/services/ai-adapter';

interface ScoreRequest {
    imageUrl: string;
    adName?: string;
}

interface CreativeScores {
    composition: number;
    contrast: number;
    textRatio: number;
    hierarchy: number;
    total: number;
    label: string;
    suggestions: string[];
}

const ANALYSIS_PROMPT = `Analise esta imagem de anuncio publicitario (ad creative) e avalie nos seguintes criterios, cada um de 0 a 25 pontos:

1. **Composicao** (0-25): Regra dos tercos, equilibrio visual, ponto focal claro
2. **Contraste** (0-25): Contraste de cores, legibilidade, destaque visual
3. **Proporcao de Texto** (0-25): Quantidade de texto vs imagem. Menos texto = pontuacao maior (Meta recomenda <20% de texto)
4. **Hierarquia Visual** (0-25): Hierarquia clara, CTA proeminente, fluxo de leitura

Responda APENAS com JSON valido no formato:
{"composition": N, "contrast": N, "textRatio": N, "hierarchy": N, "suggestions": ["dica1", "dica2"]}`;

function computeLabel(total: number): string {
    if (total >= 80) return 'Excelente';
    if (total >= 60) return 'Bom';
    if (total >= 40) return 'Regular';
    return 'Fraco';
}

function clampScore(value: unknown): number {
    const n = typeof value === 'number' ? value : 0;
    return Math.max(0, Math.min(25, Math.round(n)));
}

/**
 * POST /api/ads-creative-score
 * Downloads an ad creative image and sends it to Gemini Vision
 * for quality scoring across 4 dimensions.
 */
export async function POST(req: NextRequest) {
    try {
        const body: ScoreRequest = await req.json();
        const { imageUrl, adName } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { success: false, error: 'imageUrl e obrigatorio.' },
                { status: 400 },
            );
        }

        // Resolve AI config (Gemini or Antigravity)
        const config = await resolveAIConfig();

        // Download the image
        const fetchUrl = imageUrl.includes('instagram') || imageUrl.includes('cdninstagram')
            ? `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
            : imageUrl.startsWith('/')
                ? `http://localhost:3000${imageUrl}`
                : imageUrl;

        const imgResponse = await fetch(fetchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
            signal: AbortSignal.timeout(15000),
        });

        if (!imgResponse.ok) {
            return NextResponse.json(
                { success: false, error: `Falha ao baixar imagem: HTTP ${imgResponse.status}` },
                { status: 400 },
            );
        }

        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.startsWith('image/') ? contentType.split(';')[0] : 'image/jpeg';
        const arrayBuf = await imgResponse.arrayBuffer();
        const imageBase64 = Buffer.from(arrayBuf).toString('base64');

        // Build the prompt with optional ad name context
        const contextLine = adName ? `\n\nNome do anuncio: "${adName}"` : '';
        const userPrompt = ANALYSIS_PROMPT + contextLine;

        // Call AI provider
        let analysisText: string;

        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: config.model,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: userPrompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: imageBase64,
                                },
                            },
                        ],
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.4,
                },
            });
            analysisText = response.text ?? '';
        } else {
            // OpenAI-compatible provider (Antigravity, OpenRouter, etc.)
            const baseUrl = config.baseUrl || 'https://api.antigravity.ai/v1';
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: userPrompt },
                                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                            ],
                        },
                    ],
                    temperature: 0.4,
                    max_tokens: 1024,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => 'Unknown');
                throw new Error(`AI provider error (${response.status}): ${errBody}`);
            }

            const data = await response.json();
            analysisText = data.choices?.[0]?.message?.content ?? '';
        }

        // Parse AI response
        let parsed: { composition: number; contrast: number; textRatio: number; hierarchy: number; suggestions: string[] };
        try {
            const cleaned = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            return NextResponse.json({
                success: false,
                error: 'A IA retornou um formato invalido. Tente novamente.',
                raw: analysisText.slice(0, 500),
            }, { status: 500 });
        }

        // Normalize scores
        const composition = clampScore(parsed.composition);
        const contrast = clampScore(parsed.contrast);
        const textRatio = clampScore(parsed.textRatio);
        const hierarchy = clampScore(parsed.hierarchy);
        const total = composition + contrast + textRatio + hierarchy;
        const label = computeLabel(total);

        const suggestions = Array.isArray(parsed.suggestions)
            ? parsed.suggestions.slice(0, 3).map(String)
            : [];

        const score: CreativeScores & { creativeId: string; analyzedAt: string } = {
            creativeId: adName || imageUrl.split('/').pop()?.split('?')[0] || 'unknown',
            total,
            composition,
            contrast,
            textRatio,
            hierarchy,
            label,
            suggestions,
            analyzedAt: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, score });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro ao analisar criativo.';
        console.error('[AdsCreativeScore] Erro:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
