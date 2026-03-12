import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { resolveAIConfig } from '@/lib/services/ai-adapter';
import sharp from 'sharp';

interface AnalysisRequest {
    imageUrls: string[];          // URLs of the feed images (up to 21)
    bio: string;
    username: string;
    followersCount: number;
    avgEngagement: number;
    contentBreakdown: { images: number; videos: number; carousels: number };
    scheduledCount?: number;
    scheduledTitles?: string[];
    pinnedCount?: number;
}

/**
 * POST /api/feed-visual-analysis
 * Downloads feed images, composites them into a grid,
 * and sends to Gemini for multimodal visual analysis.
 */
export async function POST(req: NextRequest) {
    try {
        const body: AnalysisRequest = await req.json();
        const { imageUrls, bio, username, followersCount, avgEngagement, contentBreakdown, scheduledCount, scheduledTitles, pinnedCount } = body;

        if (!imageUrls || imageUrls.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma imagem fornecida.' }, { status: 400 });
        }

        const config = await resolveAIConfig();

        // 1. Download images and resize to thumbnails
        const thumbSize = 200;
        const maxImages = Math.min(imageUrls.length, 21);
        const cols = 3;
        const rows = Math.ceil(maxImages / cols);

        const thumbnails: { buffer: Buffer; index: number }[] = [];

        await Promise.allSettled(
            imageUrls.slice(0, maxImages).map(async (url, index) => {
                try {
                    const imgUrl = url.startsWith('/') ? `http://localhost:3000${url}` : url;
                    const fetchUrl = imgUrl.includes('instagram') || imgUrl.includes('cdninstagram')
                        ? `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(imgUrl)}`
                        : imgUrl;

                    const res = await fetch(fetchUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
                        signal: AbortSignal.timeout(10000),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const arrayBuf = await res.arrayBuffer();
                    const resized = await sharp(Buffer.from(arrayBuf))
                        .resize(thumbSize, thumbSize, { fit: 'cover' })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    thumbnails.push({ buffer: resized, index });
                } catch (err) {
                    console.warn(`[FeedAnalysis] Falha ao baixar imagem ${index}: ${(err as Error).message}`);
                }
            })
        );

        if (thumbnails.length < 3) {
            return NextResponse.json({
                success: false,
                error: `Apenas ${thumbnails.length} imagens puderam ser baixadas. Mínimo: 3.`,
            }, { status: 400 });
        }

        // Sort by original index
        thumbnails.sort((a, b) => a.index - b.index);

        // 2. Composite into a grid image
        const gridWidth = cols * thumbSize;
        const gridHeight = rows * thumbSize;

        const compositeInputs = thumbnails.map((t) => ({
            input: t.buffer,
            left: (t.index % cols) * thumbSize,
            top: Math.floor(t.index / cols) * thumbSize,
        }));

        const gridBuffer = await sharp({
            create: {
                width: gridWidth,
                height: gridHeight,
                channels: 3,
                background: { r: 18, g: 18, b: 18 },
            },
        })
            .composite(compositeInputs)
            .jpeg({ quality: 85 })
            .toBuffer();

        const gridBase64 = gridBuffer.toString('base64');

        // 3. Build Gemini prompt
        const systemPrompt = `Você é um especialista em branding visual e estratégia de Instagram. Analise o grid do feed e forneça recomendações detalhadas e acionáveis em português brasileiro.

REGRAS:
- Seja específico e prático nas recomendações
- Referencie posts por posição no grid (1 = topo-esquerda, numeração da esquerda para direita, de cima para baixo)
- Cores em formato hexadecimal
- Bio deve manter a essência mas melhorar a apresentação
- Considere o nicho/segmento aparente do perfil
- Máximo 4 posts problemáticos (apenas os que REALMENTE prejudicam a harmonia)
- Máximo 8 recomendações
- Para "posts_problematicos", foque APENAS em posts que quebram a harmonia visual do feed como um todo (ex: paleta de cores muito diferente, iluminação/saturação drasticamente diferente, imagem de baixa qualidade, foto escura demais). NÃO marque posts apenas por terem estilo artístico diferente — variedade é saudável. O post precisa DESTOAR NEGATIVAMENTE do padrão visual geral.
- IMPORTANTE: Posts fixados (marcados como PINNED) NÃO devem ser listados como problemáticos, pois o dono do perfil escolheu fixá-los intencionalmente.`;

        const pinnedN = pinnedCount ?? 0;
        const schedN = scheduledCount ?? 0;

        let layoutInfo = '';
        if (pinnedN > 0) {
            layoutInfo += `\n\nPOSTS FIXADOS: Posições 1-${pinnedN} são posts FIXADOS pelo dono do perfil. Eles foram escolhidos intencionalmente para ficarem no topo. NÃO os inclua em posts_problematicos.`;
        }
        if (schedN > 0) {
            const schedStart = pinnedN + 1;
            const schedEnd = pinnedN + schedN;
            layoutInfo += `\n\nCRIATIVOS AGENDADOS: Posições ${schedStart}-${schedEnd} são criativos que AINDA NÃO foram publicados. Analise como se integrarão visualmente ao feed existente (posições ${schedEnd + 1} em diante).${scheduledTitles?.length ? `\nTítulos: ${scheduledTitles.join(', ')}` : ''}`;
        }
        if (pinnedN === 0 && schedN === 0) {
            layoutInfo = '';
        }

        const userPrompt = `Analise este feed do Instagram de @${username}.

Grid do feed (${thumbnails.length} posts, lidos da esquerda para direita, de cima para baixo):
[IMAGEM DO GRID ANEXADA]${layoutInfo}

Contexto:
- Bio atual: "${bio || 'Não disponível'}"
- Seguidores: ${followersCount || 'Não informado'}
- Taxa de engajamento média: ${avgEngagement ? avgEngagement.toFixed(2) + '%' : 'Não calculado'}
- Distribuição: ${contentBreakdown.images} fotos, ${contentBreakdown.videos} vídeos, ${contentBreakdown.carousels} carrosséis

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "scores": {
    "harmonia_visual": <1-10>,
    "consistencia_marca": <1-10>,
    "diversidade_conteudo": <1-10>,
    "apelo_visual": <1-10>
  },
  "paleta_detectada": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "paleta_recomendada": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "posts_problematicos": [
    {"posicao": <1-${thumbnails.length}>, "motivo": "explicação curta"}
  ],
  "sequencia_recomendada": null,
  "bio_sugerida": "nova bio sugerida com emojis e CTA",
  "destaques_sugeridos": ["Nome1", "Nome2", "Nome3", "Nome4"],
  "recomendacoes": [
    "Recomendação específica e acionável 1",
    "Recomendação específica e acionável 2"
  ],
  "resumo_geral": "Parágrafo de 2-3 frases com avaliação geral do feed"
}`;

        // 4. Call Gemini with multimodal content
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
                                    mimeType: 'image/jpeg',
                                    data: gridBase64,
                                },
                            },
                        ],
                    },
                ],
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json',
                    temperature: 0.7,
                },
            });
            analysisText = response.text ?? '';
        } else {
            // Fallback for non-Gemini providers (text-only analysis)
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
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: userPrompt },
                                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${gridBase64}` } },
                            ],
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 4096,
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

        // 5. Parse JSON response
        let analysis;
        try {
            const cleaned = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            analysis = JSON.parse(cleaned);
        } catch {
            return NextResponse.json({
                success: false,
                error: 'A IA retornou um formato inválido. Tente novamente.',
                raw: analysisText.slice(0, 500),
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, analysis });
    } catch (error: any) {
        console.error('[FeedAnalysis] Erro:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao analisar feed.',
        }, { status: 500 });
    }
}
