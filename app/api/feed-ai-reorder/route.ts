import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { resolveAIConfig } from '@/lib/services/ai-adapter';
import sharp from 'sharp';

interface ReorderRequest {
    scheduledPosts: { id: string; title: string; type: string; mediaUrl: string }[];
    existingImageUrls: string[];
    bio: string;
    username: string;
    startDate?: string; // ISO date string - when to start scheduling
}

/**
 * POST /api/feed-ai-reorder
 * Downloads scheduled + existing feed images, sends to Gemini for
 * multimodal visual analysis, and suggests optimal publication order.
 */
export async function POST(req: NextRequest) {
    try {
        const body: ReorderRequest = await req.json();
        const { scheduledPosts, existingImageUrls, bio, username, startDate } = body;

        if (!scheduledPosts || scheduledPosts.length < 2) {
            return NextResponse.json({
                success: false,
                error: 'São necessários pelo menos 2 posts agendados para reordenar.',
            }, { status: 400 });
        }

        const config = await resolveAIConfig();

        // Download and resize images for visual context
        const thumbSize = 150;
        const downloadImage = async (url: string): Promise<Buffer | null> => {
            try {
                const imgUrl = url.startsWith('/') ? `http://localhost:3000${url}` : url;
                const fetchUrl = (imgUrl.includes('instagram') || imgUrl.includes('cdninstagram'))
                    ? `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(imgUrl)}`
                    : imgUrl;
                const res = await fetch(fetchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
                    signal: AbortSignal.timeout(8000),
                });
                if (!res.ok) return null;
                const buf = await res.arrayBuffer();
                return await sharp(Buffer.from(buf))
                    .resize(thumbSize, thumbSize, { fit: 'cover' })
                    .jpeg({ quality: 75 })
                    .toBuffer();
            } catch {
                return null;
            }
        };

        // Download scheduled post images
        const scheduledImages: { id: string; buffer: Buffer | null }[] = await Promise.all(
            scheduledPosts.map(async (p) => ({
                id: p.id,
                buffer: await downloadImage(p.mediaUrl),
            }))
        );

        // Download existing feed images (top 6 for context)
        const existingBuffers: Buffer[] = [];
        for (const url of (existingImageUrls ?? []).slice(0, 6)) {
            const buf = await downloadImage(url);
            if (buf) existingBuffers.push(buf);
        }

        // Build composite: scheduled posts strip + existing feed strip
        const scheduledBuffersValid = scheduledImages.filter(s => s.buffer !== null);
        const totalCols = Math.max(scheduledBuffersValid.length, 1);
        const hasExisting = existingBuffers.length > 0;
        const rows = hasExisting ? 2 : 1;
        const existCols = Math.min(existingBuffers.length, 6);

        const stripWidth = Math.max(totalCols, existCols) * thumbSize;
        const stripHeight = rows * (thumbSize + 20); // 20px for label space

        const compositeInputs: sharp.OverlayOptions[] = [];

        // Row 1: Scheduled posts (numbered)
        scheduledBuffersValid.forEach((s, i) => {
            if (s.buffer) {
                compositeInputs.push({
                    input: s.buffer,
                    left: i * thumbSize,
                    top: 20,
                });
            }
        });

        // Row 2: Existing feed posts
        if (hasExisting) {
            existingBuffers.forEach((buf, i) => {
                compositeInputs.push({
                    input: buf,
                    left: i * thumbSize,
                    top: thumbSize + 40,
                });
            });
        }

        let gridBase64: string | null = null;
        if (compositeInputs.length > 0) {
            const gridBuffer = await sharp({
                create: {
                    width: stripWidth,
                    height: stripHeight,
                    channels: 3,
                    background: { r: 18, g: 18, b: 18 },
                },
            })
                .composite(compositeInputs)
                .jpeg({ quality: 80 })
                .toBuffer();
            gridBase64 = gridBuffer.toString('base64');
        }

        // Build description with IDs for reference
        const postsDescription = scheduledPosts.map((p, i) =>
            `Imagem ${i + 1}: ID="${p.id}" | Título: "${p.title}" | Tipo: ${p.type}`
        ).join('\n');

        // Compute start date for scheduling
        const scheduleStart = startDate ? new Date(startDate) : new Date();
        // If start date is in the past or today, move to tomorrow
        const now = new Date();
        if (scheduleStart <= now) {
            scheduleStart.setDate(now.getDate() + 1);
        }
        const startDateStr = scheduleStart.toISOString().split('T')[0];

        const prompt = `Você é um especialista em estratégia visual e calendário editorial de Instagram.

Perfil: @${username} (bio: "${bio || 'N/A'}")
Data de início para agendamento: ${startDateStr}
Total de criativos: ${scheduledPosts.length}

TAREFA: Determinar a melhor ORDEM DE PUBLICAÇÃO e DATAS/HORÁRIOS ideais para os criativos agendados.

COMO FUNCIONA O GRID DO INSTAGRAM:
- O grid mostra posts em linhas de 3 colunas
- O post mais RECENTE fica na posição 1 (topo-esquerda)
- Portanto, o ÚLTIMO publicado aparece PRIMEIRO no grid

IMAGEM ANEXADA:
- Linha superior: os ${scheduledBuffersValid.length} criativos AGENDADOS (numerados da esquerda para direita)${hasExisting ? `\n- Linha inferior: os ${existingBuffers.length} posts ATUAIS do feed (mais recentes primeiro)` : ''}

${postsDescription}

CRITÉRIOS PARA ORDENAR (em ordem de prioridade):
1. Coesão visual por linha — posts com estilo, paleta ou atmosfera SIMILAR devem ficar na MESMA LINHA do grid (cada linha = 3 posts). Agrupe criativos parecidos para criar linhas harmônicas, NÃO os separe.
2. Impacto do topo — o último publicado será o primeiro visto no grid (posição 1), escolha o mais impactante visualmente.
3. Transição suave — o primeiro publicado ficará adjacente aos posts existentes do feed, garantir que não desentoa.
4. Ritmo entre linhas — DENTRO de cada linha coesão, ENTRE linhas variação de tema/cor.

CRITÉRIOS PARA AGENDAMENTO DE DATAS/HORÁRIOS:
- Média de 2 posts por dia, distribuídos em dias espaçados
- Horário 1 (almoço): 11:30 — melhor para conteúdo informativo/educativo
- Horário 2 (fim de tarde): 18:00 — melhor para conteúdo inspiracional/lifestyle
- Em ALGUNS dias (a cada 3-4 dias), adicionar um 3º post às 20:00 — ideal para conteúdo de engajamento/interação
- Não agendar todos no mesmo dia — distribuir ao longo dos dias
- Começar a partir de ${startDateStr}
- Não agendar aos domingos (engajamento mais baixo)
- Fuso horário: America/Sao_Paulo (UTC-3)

REGRAS:
- Retorne TODOS os IDs, sem omitir nenhum
- Seja DETERMINÍSTICO: para inputs iguais, a mesma resposta
- A ordem retornada é de PUBLICAÇÃO (primeiro = publica primeiro = fica mais abaixo no grid)
- Cada item em scheduled_dates deve ter o ID e o datetime ISO 8601 no fuso de São Paulo

Retorne APENAS JSON:
{
  "ordered_ids": ["id1", "id2", ...],
  "scheduled_dates": [
    {"id": "id1", "datetime": "2026-03-13T11:30:00-03:00"},
    {"id": "id2", "datetime": "2026-03-13T18:00:00-03:00"}
  ],
  "reasoning": "Explicação curta da lógica de ordem + calendário"
}`;

        let responseText: string;

        if (config.provider === 'gemini' && gridBase64) {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: config.model,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
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
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            });
            responseText = response.text ?? '';
        } else if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: config.model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            });
            responseText = response.text ?? '';
        } else {
            const baseUrl = config.baseUrl || 'https://api.antigravity.ai/v1';
            const parts: any[] = [{ type: 'text', text: prompt }];
            if (gridBase64) {
                parts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${gridBase64}` } });
            }
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: parts }],
                    temperature: 0.1,
                    max_tokens: 1024,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => 'Unknown');
                throw new Error(`AI provider error (${response.status}): ${errBody}`);
            }

            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content ?? '';
        }

        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleaned);

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('[FeedAIReorder] Erro:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao reordenar com IA.',
        }, { status: 500 });
    }
}
