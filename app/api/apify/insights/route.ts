import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const postSchema = z.object({
    type: z.string(),
    caption: z.string().nullable().optional(),
    hashtags: z.array(z.string()).nullable().optional(),
    likesCount: z.number(),
    commentsCount: z.number(),
    videoViewCount: z.number().nullable().optional(),
    timestamp: z.string().nullable().optional(),
});

const requestSchema = z.object({
    posts: z.array(postSchema).min(1),
    summary: z.object({
        totalPosts: z.number(),
        totalLikes: z.number(),
        totalComments: z.number(),
        totalViews: z.number(),
        avgLikesPerPost: z.number(),
        avgCommentsPerPost: z.number(),
        avgEngagementRate: z.number(),
    }),
});

// Simple sentiment analysis via keyword/emoji matching (PT-BR focused)
const POSITIVE_SIGNALS = ['❤️', '🔥', '😍', '👏', '💪', '🙌', '✨', '🎉', 'parabéns', 'incrível', 'lindo', 'top', 'amei', 'show', 'maravilhoso', 'perfeito', 'sensacional', 'arrasou', 'demais'];
const NEGATIVE_SIGNALS = ['😢', '😡', '👎', '💔', 'ruim', 'horrível', 'péssimo', 'decepcionante', 'fraco', 'pior'];

function analyzeSentiment(captions: string[]): { positive: number; neutral: number; negative: number } {
    let positive = 0, neutral = 0, negative = 0;
    for (const caption of captions) {
        const lower = (caption ?? '').toLowerCase();
        const posScore = POSITIVE_SIGNALS.filter(s => lower.includes(s)).length;
        const negScore = NEGATIVE_SIGNALS.filter(s => lower.includes(s)).length;
        if (posScore > negScore) positive++;
        else if (negScore > posScore) negative++;
        else neutral++;
    }
    return { positive, neutral, negative };
}

interface PostData {
    type: string;
    caption?: string | null;
    hashtags?: string[] | null;
    likesCount: number;
    commentsCount: number;
    videoViewCount?: number | null;
    timestamp?: string | null;
}

function generateInsightsHtml(posts: PostData[], summary: { totalPosts: number; totalLikes: number; totalComments: number; totalViews: number; avgLikesPerPost: number; avgCommentsPerPost: number; avgEngagementRate: number }): string {
    const sections: string[] = [];

    // 1. Best performing content type
    const typeStats: Record<string, { count: number; totalLikes: number; totalComments: number }> = {};
    for (const p of posts) {
        if (!typeStats[p.type]) typeStats[p.type] = { count: 0, totalLikes: 0, totalComments: 0 };
        typeStats[p.type].count++;
        typeStats[p.type].totalLikes += p.likesCount;
        typeStats[p.type].totalComments += p.commentsCount;
    }
    const typeRanking = Object.entries(typeStats)
        .map(([type, s]) => ({
            type,
            avgEngagement: Math.round((s.totalLikes + s.totalComments) / s.count),
            count: s.count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);

    const typeLabels: Record<string, string> = { Image: 'Posts (imagem)', Video: 'Reels/Vídeos', Sidecar: 'Carrosséis' };
    if (typeRanking.length > 0) {
        const best = typeRanking[0];
        sections.push(`<div class="insight-card">
            <span class="insight-emoji">📊</span>
            <h4>Tipo de Conteúdo Mais Eficaz</h4>
            <p><strong>${typeLabels[best.type] ?? best.type}</strong> geram em média <strong>${best.avgEngagement.toLocaleString('pt-BR')}</strong> interações por post.</p>
            <ul>${typeRanking.map(t => `<li>${typeLabels[t.type] ?? t.type}: ${t.avgEngagement.toLocaleString('pt-BR')} interações/post (${t.count} posts)</li>`).join('')}</ul>
        </div>`);
    }

    // 2. Best posting times
    const hourBuckets: Record<string, { count: number; totalEng: number }> = {};
    const dayBuckets: Record<string, { count: number; totalEng: number }> = {};
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    for (const p of posts) {
        if (!p.timestamp) continue;
        try {
            const d = new Date(p.timestamp);
            const hour = d.getHours();
            const day = dayNames[d.getDay()];
            const eng = p.likesCount + p.commentsCount;
            const hKey = `${hour}h`;
            if (!hourBuckets[hKey]) hourBuckets[hKey] = { count: 0, totalEng: 0 };
            hourBuckets[hKey].count++;
            hourBuckets[hKey].totalEng += eng;
            if (!dayBuckets[day]) dayBuckets[day] = { count: 0, totalEng: 0 };
            dayBuckets[day].count++;
            dayBuckets[day].totalEng += eng;
        } catch { /* skip bad dates */ }
    }
    const bestHours = Object.entries(hourBuckets)
        .map(([h, s]) => ({ hour: h, avgEng: Math.round(s.totalEng / s.count) }))
        .sort((a, b) => b.avgEng - a.avgEng)
        .slice(0, 3);
    const bestDays = Object.entries(dayBuckets)
        .map(([d, s]) => ({ day: d, avgEng: Math.round(s.totalEng / s.count) }))
        .sort((a, b) => b.avgEng - a.avgEng)
        .slice(0, 3);

    if (bestHours.length > 0) {
        sections.push(`<div class="insight-card">
            <span class="insight-emoji">⏰</span>
            <h4>Melhores Horários para Postar</h4>
            <ul>${bestHours.map(h => `<li><strong>${h.hour}</strong> — média de ${h.avgEng.toLocaleString('pt-BR')} interações</li>`).join('')}</ul>
            <h4 style="margin-top: 8px">Melhores Dias</h4>
            <ul>${bestDays.map(d => `<li><strong>${d.day}</strong> — média de ${d.avgEng.toLocaleString('pt-BR')} interações</li>`).join('')}</ul>
        </div>`);
    }

    // 3. Top hashtags
    const hashtagStats: Record<string, { count: number; totalEng: number }> = {};
    for (const p of posts) {
        if (!p.hashtags) continue;
        const eng = p.likesCount + p.commentsCount;
        for (const h of p.hashtags) {
            const tag = h.toLowerCase();
            if (!hashtagStats[tag]) hashtagStats[tag] = { count: 0, totalEng: 0 };
            hashtagStats[tag].count++;
            hashtagStats[tag].totalEng += eng;
        }
    }
    const topHashtags = Object.entries(hashtagStats)
        .filter(([, s]) => s.count >= 2)
        .map(([tag, s]) => ({ tag, avgEng: Math.round(s.totalEng / s.count), count: s.count }))
        .sort((a, b) => b.avgEng - a.avgEng)
        .slice(0, 8);

    if (topHashtags.length > 0) {
        sections.push(`<div class="insight-card">
            <span class="insight-emoji">#️⃣</span>
            <h4>Hashtags Mais Eficientes</h4>
            <ul>${topHashtags.map(h => `<li><strong>${h.tag}</strong> — ${h.avgEng.toLocaleString('pt-BR')} interações/post (usada ${h.count}x)</li>`).join('')}</ul>
        </div>`);
    }

    // 4. Sentiment analysis
    const captions = posts.map(p => p.caption ?? '').filter(c => c.length > 0);
    if (captions.length > 0) {
        const sentiment = analyzeSentiment(captions);
        const total = sentiment.positive + sentiment.neutral + sentiment.negative;
        const pctPos = Math.round((sentiment.positive / total) * 100);
        const pctNeu = Math.round((sentiment.neutral / total) * 100);
        const pctNeg = Math.round((sentiment.negative / total) * 100);
        sections.push(`<div class="insight-card">
            <span class="insight-emoji">💬</span>
            <h4>Sentimento das Legendas</h4>
            <div class="sentiment-bar">
                <div class="sentiment-pos" style="width: ${pctPos}%" title="Positivo ${pctPos}%"></div>
                <div class="sentiment-neu" style="width: ${pctNeu}%" title="Neutro ${pctNeu}%"></div>
                <div class="sentiment-neg" style="width: ${pctNeg}%" title="Negativo ${pctNeg}%"></div>
            </div>
            <p>🟢 Positivo: ${pctPos}% · ⚪ Neutro: ${pctNeu}% · 🔴 Negativo: ${pctNeg}%</p>
        </div>`);
    }

    // 5. Recommendations
    const recs: string[] = [];
    if (typeRanking.length > 1) {
        const worst = typeRanking[typeRanking.length - 1];
        const best = typeRanking[0];
        if (best.avgEngagement > worst.avgEngagement * 1.5) {
            recs.push(`Invista mais em <strong>${typeLabels[best.type] ?? best.type}</strong> — esse formato gera ${Math.round((best.avgEngagement / worst.avgEngagement) * 100 - 100)}% mais interações que ${typeLabels[worst.type] ?? worst.type}.`);
        }
    }
    if (bestHours.length > 0) {
        recs.push(`Agende seus posts para <strong>${bestHours[0].hour}</strong> — é o horário com maior engajamento médio.`);
    }
    if (summary.avgCommentsPerPost < summary.avgLikesPerPost * 0.03) {
        recs.push(`A taxa de comentários está baixa. Tente usar <strong>CTAs nas legendas</strong> (perguntas diretas, enquetes) para estimular a interação.`);
    }
    if (topHashtags.length > 0) {
        recs.push(`Continue usando <strong>${topHashtags[0].tag}</strong> — é a hashtag com melhor performance.`);
    }
    const postsWithoutHashtags = posts.filter(p => !p.hashtags || p.hashtags.length === 0).length;
    if (postsWithoutHashtags > posts.length * 0.3) {
        recs.push(`<strong>${Math.round((postsWithoutHashtags / posts.length) * 100)}% dos posts</strong> não possuem hashtags. Adicionar hashtags relevantes pode aumentar o alcance em até 30%.`);
    }

    if (recs.length > 0) {
        sections.push(`<div class="insight-card">
            <span class="insight-emoji">💡</span>
            <h4>Recomendações para Melhorar</h4>
            <ul>${recs.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>`);
    }

    return sections.join('');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 },
            );
        }

        const html = generateInsightsHtml(parsed.data.posts, parsed.data.summary);
        return NextResponse.json({ success: true, data: html });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
