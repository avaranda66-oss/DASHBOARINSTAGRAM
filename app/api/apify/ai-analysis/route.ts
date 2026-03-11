import { NextRequest, NextResponse } from 'next/server';
import { generateAIContent, resolveAIConfig } from '@/lib/services/ai-adapter';

export async function POST(req: NextRequest) {
    try {
        const config = await resolveAIConfig();

        const body = await req.json();
        const { posts, summary, question } = body;

        if (!posts || !summary) {
            return NextResponse.json({ success: false, error: 'Posts e summary são obrigatórios' }, { status: 400 });
        }

        // Build context from the data
        const dataContext = `
Dados do perfil Instagram (${summary.totalPosts} posts analisados):
- Total de Likes: ${summary.totalLikes}
- Total de Comentários: ${summary.totalComments}
- Total de Views: ${summary.totalViews}
- Média de Likes/post: ${summary.avgLikesPerPost}
- Média de Comentários/post: ${summary.avgCommentsPerPost}
- Taxa de Engajamento Média: ${summary.avgEngagementRate}%
- Sentimento dos Comentários: ${summary.commentSentiment?.pctPos || 0}% Positivos | ${summary.commentSentiment?.pctNeu || 0}% Neutros | ${summary.commentSentiment?.pctNeg || 0}% Negativos
- Engajamento Qualificado (Ajustado pelo Sentimento): ${summary.qualifiedEngagement || 'N/D'}

Últimos ${Math.min(posts.length, 20)} posts:
${posts.slice(0, 20).map((p: { type: string; likesCount: number; commentsCount: number; videoViewCount?: number | null; caption?: string; hashtags?: string[]; timestamp?: string }, i: number) => `${i + 1}. [${p.type}] Likes: ${p.likesCount}, Comments: ${p.commentsCount}${p.videoViewCount ? `, Views: ${p.videoViewCount}` : ''} | Caption: "${(p.caption ?? '').slice(0, 100)}" | Hashtags: ${(p.hashtags ?? []).slice(0, 5).join(', ')} | Data: ${p.timestamp ?? 'N/D'}`).join('\n')}
`;

        const userQuestion = question && question.trim()
            ? question.trim()
            : 'Faça uma análise completa deste perfil: pontos fortes, oportunidades de melhoria, sugestões de conteúdo e estratégias para crescer.';

        const prompt = `Você é um analista estrategista focado em marketing de redes sociais de alta performance. Analise os dados abaixo e responda em português brasileiro.

${dataContext}

Pergunta do usuário: ${userQuestion}

Instruções RIGOROSAS:
1. NÃO dê conselhos genéricos como "use áudios em alta" ou "poste com mais frequência" se os dados não suportarem.
2. Baseie TUDO nos dados fornecidos: analise a performance por formato, o Sentimento dos Comentários e o Engajamento Qualificado para entender a recepção da comunidade de forma qualitativa e quantitativa.
3. Responda de forma direta, organizada com títulos e bullet points. Destaque os números mais relevantes em negrito.
4. Máximo 700 palavras. Aja como um mentor exigente e analítico.`;

        const text = await generateAIContent(prompt, config);

        return NextResponse.json({ success: true, data: text });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro na análise IA';
        console.error('[API /apify/ai-analysis] Error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
