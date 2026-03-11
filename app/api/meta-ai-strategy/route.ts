import { NextRequest, NextResponse } from 'next/server';
import { generateAIContent, resolveAIConfig } from '@/lib/services/ai-adapter';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { posts, summary } = body;

        if (!posts || !Array.isArray(posts) || posts.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Dados de posts obrigatórios.' },
                { status: 400 }
            );
        }

        const config = await resolveAIConfig();

        // Montar contexto com os dados mais relevantes
        const topByReach = [...posts].sort((a: any, b: any) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 5);
        const topBySaves = [...posts].sort((a: any, b: any) => (b.saved ?? 0) - (a.saved ?? 0)).slice(0, 3);

        // Análise de hashtags localmente
        const hashtagMap: Record<string, { count: number; totalReach: number }> = {};
        posts.forEach((p: any) => {
            const tags: string[] = p.hashtags ?? [];
            tags.forEach((tag: string) => {
                if (!hashtagMap[tag]) hashtagMap[tag] = { count: 0, totalReach: 0 };
                hashtagMap[tag].count += 1;
                hashtagMap[tag].totalReach += p.reach ?? 0;
            });
        });
        const topHashtags = Object.entries(hashtagMap)
            .map(([tag, d]) => ({ tag, count: d.count, avgReach: Math.round(d.totalReach / d.count) }))
            .sort((a, b) => b.avgReach - a.avgReach)
            .slice(0, 10);

        // Análise por dia da semana
        const dayMap: Record<string, { count: number; totalReach: number }> = {};
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        posts.forEach((p: any) => {
            if (!p.timestamp) return;
            const day = days[new Date(p.timestamp).getDay()];
            if (!dayMap[day]) dayMap[day] = { count: 0, totalReach: 0 };
            dayMap[day].count += 1;
            dayMap[day].totalReach += p.reach ?? 0;
        });
        const bestDay = Object.entries(dayMap)
            .map(([day, d]) => ({ day, avgReach: Math.round(d.totalReach / d.count) }))
            .sort((a, b) => b.avgReach - a.avgReach)[0];

        // Tipo de conteúdo com melhor desempenho
        const typeMap: Record<string, { count: number; totalReach: number; totalSaves: number }> = {};
        posts.forEach((p: any) => {
            const t = p.type ?? 'Image';
            if (!typeMap[t]) typeMap[t] = { count: 0, totalReach: 0, totalSaves: 0 };
            typeMap[t].count += 1;
            typeMap[t].totalReach += p.reach ?? 0;
            typeMap[t].totalSaves += p.saved ?? 0;
        });
        const typeRanking = Object.entries(typeMap)
            .map(([type, d]) => ({
                type,
                avgReach: Math.round(d.totalReach / d.count),
                avgSaves: Math.round(d.totalSaves / d.count),
                count: d.count,
            }))
            .sort((a, b) => b.avgReach - a.avgReach);

        const contextData = `
=== DADOS DO INSTAGRAM (${posts.length} posts analisados) ===

MÉTRICAS GERAIS:
- Alcance médio por post: ${summary?.avgReach ?? Math.round(posts.reduce((s: number, p: any) => s + (p.reach ?? 0), 0) / posts.length)}
- Total de saves: ${posts.reduce((s: number, p: any) => s + (p.saved ?? 0), 0)}
- Total de shares: ${posts.reduce((s: number, p: any) => s + (p.shares ?? 0), 0)}
- Taxa de engajamento real: ${summary?.avgEngagementRate ?? '?'}%
- Total de likes: ${posts.reduce((s: number, p: any) => s + p.likesCount, 0)}

DESEMPENHO POR TIPO DE CONTEÚDO:
${typeRanking.map(t => `- ${t.type}: ${t.count} posts, alcance médio ${t.avgReach}, saves médio ${t.avgSaves}`).join('\n')}

MELHOR DIA PARA POSTAR: ${bestDay?.day ?? 'Indefinido'} (alcance médio ${bestDay?.avgReach ?? 0})

TOP 5 HASHTAGS POR ALCANCE:
${topHashtags.slice(0, 5).map(h => `- ${h.tag}: usada ${h.count}x, alcance médio ${h.avgReach}`).join('\n')}

TOP 5 POSTS POR ALCANCE:
${topByReach.map((p: any, i: number) => `${i + 1}. "${(p.caption ?? '').slice(0, 80)}..." — Alcance: ${p.reach ?? 0}, Saves: ${p.saved ?? 0}, Shares: ${p.shares ?? 0}`).join('\n')}

TOP 3 POSTS POR SAVES:
${topBySaves.map((p: any, i: number) => `${i + 1}. "${(p.caption ?? '').slice(0, 80)}..." — Saves: ${p.saved ?? 0}, Alcance: ${p.reach ?? 0}`).join('\n')}
`;

        const prompt = `Você é um estrategista sênior de Instagram com 10 anos de experiência em crescimento orgânico.
Analise os dados abaixo e gere um relatório estratégico PRÁTICO e DIRETO.

${contextData}

Gere exatamente nesta estrutura:

## 🏆 Melhor Formato de Conteúdo
(qual tipo performa melhor e por quê, com dados concretos)

## 📅 Melhor Dia e Horário para Postar
(baseado nos dados de quando seus posts têm mais alcance)

## #️⃣ Top 3 Hashtags Mais Eficazes
(cite as hashtags pelo nome, explique o porquê do desempenho)

## ⚠️ 3 Pontos de Atenção
(o que está com baixo desempenho e por quê)

## ✅ 3 Ações Concretas para as Próximas 4 Semanas
(seja específico: "poste X tipo de conteúdo Y vezes por semana com hashtag Z")

Use bullets, números e emojis. Seja direto. Máximo 600 palavras. Português brasileiro.`;

        const text = await generateAIContent(prompt, config);

        return NextResponse.json({ success: true, data: text });
    } catch (error: any) {
        console.error('[/api/meta-ai-strategy] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro ao gerar estratégia.' },
            { status: 500 }
        );
    }
}
