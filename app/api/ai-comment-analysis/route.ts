import { NextResponse } from 'next/server';
import { generateAIContentWithSystem, resolveAIConfig } from '@/lib/services/ai-adapter';

export const maxDuration = 60; // Allow more time for batch AI processing

export async function POST(req: Request) {
    try {
        const config = await resolveAIConfig();
        const { comments, mode = 'analysis' } = await req.json();

        if (!Array.isArray(comments) || comments.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum comentário enviado' }, { status: 400 });
        }

        const isReplyMode = mode === 'reply_suggestion';

        const systemPrompt = isReplyMode ? `Você é o social media da 'A Varanda', um restaurante/lanchonete super acolhedor e de alta qualidade.
Sua missão é gerar sugestões de respostas para os comentários dos clientes.
Diretrizes de resposta:
1. Seja caloroso, amigável e use um tom de proximidade (ex: "Que alegria ler isso!", "Te esperamos aqui!").
2. Se for uma dúvida, responda de forma prestativa sugerindo que entrem em contato pelo Direct ou confiram o cardápio.
3. Use emojis adequados ao nicho de gastronomia (😋, ❤️, 🍔, ✨).
4. As respostas devem ser CURTAS (máx 20 palavras).
5. Retorne APENAS um JSON estrito no formato: { "suggestions": { "commentId": "Sua sugestão de resposta", "commentId2": "Sua sugestão de resposta" } }
6. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL. NUNCA use outros idiomas (coreano, chinês, inglês, etc).` : `Você é um analista de engajamento social e customer success especializado em redes sociais de negócios (especialmente gastronomia).
Você receberá uma lista de comentários do Instagram em formato JSON.
Sua missão é ler as entrelinhas de cada comentário e retornar uma "Opinião da IA" curta e direta (máx 15 palavras) para o dono do negócio.

REGRAS:
1. Retorne APENAS um JSON estrito.
2. O formato do JSON deve ser exatamente: { "opinions": { "commentId": "Sua opinião curta", "commentId2": "Sua opinião curta" } }
3. Seja amigável porém muito analítico e focado em negócios na sua opinião.
4. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL. NUNCA use outros idiomas (coreano, chinês, inglês, etc).`;

        // Limit the batch to prevent massive token usage in a single request
        const batchSize = 50;
        const processingComments = comments.slice(0, batchSize);

        const promptPayload = JSON.stringify(
            processingComments.map((c: any) => ({
                id: c.id,
                text: c.text,
                author: c.ownerUsername,
                opinion: c.aiOpinion // Context for the reply
            }))
        );

        const rawText = await generateAIContentWithSystem(promptPayload, {
            systemPrompt,
            jsonMode: true,
            temperature: isReplyMode ? 0.7 : 0.2,
        }, config);

        let resultData;
        try {
            resultData = JSON.parse(rawText);
        } catch (e) {
            console.error("Falha ao fazer parse do JSON da IA:", rawText);
            throw new Error("A IA não retornou um JSON válido.");
        }

        return NextResponse.json({
            success: true,
            opinions: resultData.opinions || {},
            suggestions: resultData.suggestions || {}
        });

    } catch (error) {
        console.error('Erro na API de Análise de Comentário:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
