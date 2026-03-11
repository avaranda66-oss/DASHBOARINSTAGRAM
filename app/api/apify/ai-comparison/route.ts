import { NextRequest, NextResponse } from 'next/server';
import { generateAIContent, resolveAIConfig } from '@/lib/services/ai-adapter';

export async function POST(req: NextRequest) {
    try {
        const config = await resolveAIConfig();

        const body = await req.json();
        const { client, competitors, question, periodSummary } = body;

        if (!client || !competitors) {
            return NextResponse.json({ success: false, error: 'Client e competitors são obrigatórios' }, { status: 400 });
        }

        const formatProfile = (p: any) => `
Perfil: @${p.handle}
- Posts Analisados no Período: ${p.postCount}
- Período Analisado: ${p.diffDays} dias (${p.dateRange})
- Engajamento/Post Médio: ${p.avgEngagement}
- Likes/Post Médio: ${p.avgLikes}
- Comentários/Post Médio: ${p.avgComments}
- Sentimento dos Comentários: ${p.commentSentiment.pctPos}% Positivos | ${p.commentSentiment.pctNeu}% Neutros | ${p.commentSentiment.pctNeg}% Negativos
- Engajamento Qualificado (Engajamento ajustado pelo Sentimento): ${p.qualifiedEngagement}
- Engajamento Reels: ${p.engagementRateReels}%
- Frequência: ${p.postsPerWeek !== null ? `${p.postsPerWeek} posts/semana` : 'N/D'} | ${p.postsPerMonth !== null ? `${p.postsPerMonth} posts/mês` : 'N/D'}
- Tipo de Conteúdo: ${p.imageCount} Imagens, ${p.videoCount} Vídeos, ${p.carouselCount} Carrosséis
`;

        const dataContext = `
Resumo do Período Filtrado: ${periodSummary}

Cliente Principal (Sua Marca):
${formatProfile(client)}

Concorrentes:
${competitors.map((c: any) => formatProfile(c)).join('\n\n')}
`;

        const userQuestion = question && question.trim()
            ? question.trim()
            : 'Faça uma análise competitiva detalhada. Compare meu perfil com os concorrentes, aponte onde o concorrente ganha, onde eu ganho, e dê 3 estratégias cirúrgicas para superá-lo.';

        const prompt = `Você é um analista estrategista focado em marketing de redes sociais de alta performance. Analise os dados de comparação de concorrentes do Instagram abaixo e responda em português brasileiro.

${dataContext}

Pergunta do usuário / Objetivo da análise:
${userQuestion}

Instruções RIGOROSAS:
1. NÃO dê conselhos genéricos como "use áudios em alta", "engaje com o público", "faça Reels".
2. Baseie TUDO nos dados fornecidos: se o concorrente tem mais engajamento em Carrosséis, aponte isso numericamente e sugira o que ele pode estar fazendo de diferente (ex: "Eles estão focando 50% mais em carrosséis, que geram X mais engajamento. Adote carrosséis educativos ou de portfólio").
3. Analise o gap de Frequência vs Engajamento: O concorrente posta muito mais ou menos? A qualidade bate a quantidade? Como isso afeta o resultado final?
4. Utilize os dados de **Sentimento dos Comentários** e **Engajamento Qualificado** para avaliar a profundidade e a recepção da comunidade. Quem tem uma comunidade mais engajada e positiva?
5. Trate o "Cliente Principal" como a marca para a qual você está prestando consultoria estratégica. Exija ação imediata, mas realista.
6. Formate o texto com seções curtas, bullet points diretos ao ponto e destaque os números mais gritantes em negrito.
7. Máximo 600 palavras. Aja como um mentor exigente e analítico.`;

        const text = await generateAIContent(prompt, config);

        return NextResponse.json({ success: true, data: text });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro na análise comparativa IA';
        console.error('[API /apify/ai-comparison] Error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
