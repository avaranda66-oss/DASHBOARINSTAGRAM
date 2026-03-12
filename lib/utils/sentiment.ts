import { InstagramPostMetrics } from '@/types/analytics';

const POSITIVE_EMOJIS = ['❤️', '🔥', '😍', '👏', '💪', '🙌', '✨', '🎉', '🥰', '🤩', '😻', '🤤', '🤤🤤', '🤤🤤🤤', '😩', '🫠'];
const NEGATIVE_EMOJIS = ['😡', '👎', '💔', '🤮', '🙄', '🤬', '🤡'];

// Updated to use a single highly optimized Regex that catches repeated letters (pt-BR internet slang) 
// and common buying intent phrases ("eu quero", "água na boca", "melhor").
const POSITIVE_REGEX = /\b(parab[ée]ns|incr[ií]vel|lind[ao]+s?|to+p|amei+|sho+w|maravilh[ao]+s?|perfeit[ao]+s?|perfei[çc][ãa]o|sensacional|arras[ao]u?|demais|dms|excelente|ótimo|bom|del[ií]cia|gostoso|fantástico|adoro+|amo+|espet[áa]culo|espetacular|encantad[ao]+|sucesso|surreal|recomendo|melhor(es)?|quero+|[aá]gua na boca)\b/gi;

const NEGATIVE_REGEX = /\b(ruim|horr[ií]vel|p[é]ssim[ao]|decepcionante|fraco|pior|ódio|caro|lixo|nojento|frio|demora|mal|péssimo)\b/gi;

const BUYING_INTENT_REGEX = /\b(onde compro|onde comprar|como compro|como comprar|quanto custa|qual o pre[çc]o|pre[çc]o|valor|quero comprar|quero um|quero uma|eu quero|tem pra vender|tem para vender|encomenda|encomendo|onde acho|onde encontro|link|site|loja|delivery|entrega|faz entrega|aceita encomenda|cardapio|card[áa]pio|hor[áa]rio|funciona|abre|endere[çc]o|contato|whatsapp|whats|zap)\b/gi;

const URGENCY_KEYWORDS_REGEX = /\b([úu]ltimas? vagas?|s[oó] hoje|limitado|acaba|esgotando|[úu]ltimas? unidades?|desconto|promo[çc][ãa]o|por tempo limitado|corre|aproveite?|n[ãa]o perca|agora|imperd[ií]vel|exclusiv[oa])\b/gi;

const SENSORY_REGEX = /\b(veja|imagine|brilhante|cores?|visual|bonit[oa]|ou[çc]a|som|m[úu]sica|sil[êe]ncio|sinta|toque|suave|quente|frio|textura|sabor|delicioso|doce|amargo|salgado|crocante|aroma|perfume|cheiro|fragr[âa]ncia)\b/gi;

const AUTHORITY_REGEX = /\b(\d+\s*%|\d+\s*anos?|estudo|pesquisa|ciência|cient[ií]fico|comprovad[oa]|certificad[oa]|especialista|expert|profissional|referência|prêmio|award|reconhecid[oa])\b/gi;

export type SentimentResult = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'BRAND_REPLY';

export function analyzeSingleComment(
    text: string,
    commentOwnerUsername?: string,
    postOwnerUsername?: string
): { sentiment: SentimentResult, positiveScore: number, negativeScore: number } {
    if (!text || text.trim().length === 0) {
        return { sentiment: 'NEUTRAL', positiveScore: 0, negativeScore: 0 };
    }

    // 1. BRAND REPLY FILTER
    // If the person commenting is the owner of the post, it's a customer service reply.
    // It should not negatively impact the sentiment score of the community.
    if (commentOwnerUsername && postOwnerUsername && commentOwnerUsername === postOwnerUsername) {
        return { sentiment: 'BRAND_REPLY', positiveScore: 0, negativeScore: 0 };
    }

    const lower = text.toLowerCase();

    // 2. EFFORT MULTIPLIER (Human Factor)
    const wordCount = lower.split(/[\s,.;!?'"()]+/).filter(w => w.length > 2).length;

    let effortMultiplier = 1.0;
    if (wordCount >= 3 && wordCount <= 7) effortMultiplier = 2.0;
    else if (wordCount >= 8 && wordCount <= 14) effortMultiplier = 3.5;
    else if (wordCount >= 15) effortMultiplier = 5.0;

    let curPos = 0;
    let curNeg = 0;

    // Weight 1: Emojis are devalued to 0.5 to prevent emoji spam from beating real text
    curPos += POSITIVE_EMOJIS.filter(s => lower.includes(s)).length * 0.5;
    curNeg += NEGATIVE_EMOJIS.filter(s => lower.includes(s)).length * 0.5;

    // Weight 2: Meaningful words via Regex Slang Matcher. effortMultiplier ONLY applies to words
    const wordsPos = (lower.match(POSITIVE_REGEX) || []).length * 2.0;
    const wordsNeg = (lower.match(NEGATIVE_REGEX) || []).length * 2.0;

    curPos += wordsPos * effortMultiplier;
    curNeg += wordsNeg * effortMultiplier;

    let sentiment: SentimentResult = 'NEUTRAL';
    if (curPos > curNeg) sentiment = 'POSITIVE';
    else if (curNeg > curPos) sentiment = 'NEGATIVE';

    return { sentiment, positiveScore: curPos, negativeScore: curNeg };
}

export function analyzeCommentsSentiment(posts: InstagramPostMetrics[]) {
    let rawPos = 0, rawNeu = 0, rawNeg = 0;

    let totalCommentWords = 0;
    let validCommentsCount = 0;

    const allComments = posts.flatMap(p =>
        (p.latestComments || []).map(c => ({ text: c.text, owner: c.ownerUsername, postOwner: p.ownerUsername }))
    );

    let brandCount = 0;

    // We will count the actual NUMBER of comments in each category for the global percentage,
    // so it matches the Raio-X view. 
    let countPos = 0, countNeu = 0, countNeg = 0;

    for (const c of allComments) {
        if (!c.text || c.text.trim().length === 0) continue;

        const result = analyzeSingleComment(c.text, c.owner, c.postOwner);

        // Brand replies don't count towards community totals at all
        if (result.sentiment === 'BRAND_REPLY') {
            brandCount++;
            continue;
        }

        validCommentsCount++;
        const words = c.text.split(/[\s,.;!?'"()]+/).filter((w: string) => w.length > 2).length;
        totalCommentWords += words;

        if (result.sentiment === 'POSITIVE') {
            rawPos += result.positiveScore;
            countPos++;
        }
        else if (result.sentiment === 'NEGATIVE') {
            rawNeg += result.negativeScore;
            countNeg++;
        }
        else {
            rawNeu += 1;
            countNeu++;
        }
    }

    // The percentage should reflect the AMOUNT of comments in each category, not the arbitrary internal score sum
    const totalCategorized = countPos + countNeu + countNeg;

    const pctPos = totalCategorized > 0 ? Math.round((countPos / totalCategorized) * 100) : 0;
    const pctNeu = totalCategorized > 0 ? Math.round((countNeu / totalCategorized) * 100) : 0;
    const pctNeg = totalCategorized > 0 ? Math.round((countNeg / totalCategorized) * 100) : 0;

    const avgWordsPerComment = validCommentsCount > 0 ? totalCommentWords / validCommentsCount : 0;
    const communityBonus = Math.min(avgWordsPerComment * 0.01, 0.10);

    // Positivity multiplier still uses the raw scores internally to gauge "passion" vs "hate",
    // but the displayed UI percentages now perfectly match the categorized comment counts.
    const totalScore = rawPos + rawNeu + rawNeg;
    const positivityMultiplier = totalScore > 0
        ? ((rawPos + (rawNeu * 0.5)) / totalScore) + communityBonus
        : 1;

    return {
        positive: rawPos, neutral: rawNeu, negative: rawNeg,
        brand: brandCount,
        pctPos, pctNeu, pctNeg,
        total: validCommentsCount,
        positivityMultiplier
    };
}

// =============================================================================
// Buying Intent Detection
// =============================================================================

/**
 * Detecta comentarios com intencao de compra usando regex PT-BR.
 * Retorna lista de comentarios com buying intent e score geral.
 */
export function detectBuyingIntent(
    comments: { id: string; text: string; ownerUsername: string }[]
): {
    intentComments: { id: string; text: string; ownerUsername: string; keywords: string[] }[];
    intentCount: number;
    totalComments: number;
    intentRate: number;
} {
    const intentComments: { id: string; text: string; ownerUsername: string; keywords: string[] }[] = [];

    for (const comment of comments) {
        if (!comment.text) continue;
        const matches = comment.text.match(BUYING_INTENT_REGEX);
        if (matches && matches.length > 0) {
            intentComments.push({
                id: comment.id,
                text: comment.text,
                ownerUsername: comment.ownerUsername,
                keywords: [...new Set(matches.map(m => m.toLowerCase()))],
            });
        }
    }

    return {
        intentComments,
        intentCount: intentComments.length,
        totalComments: comments.length,
        intentRate: comments.length > 0 ? Math.round((intentComments.length / comments.length) * 10000) / 100 : 0,
    };
}

// =============================================================================
// Urgency/Scarcity Detection (Cialdini)
// =============================================================================

/**
 * Detecta gatilhos de urgencia/escassez no caption de posts.
 */
export function detectUrgencyTriggers(caption: string): {
    hasUrgency: boolean;
    triggers: string[];
    count: number;
} {
    if (!caption) return { hasUrgency: false, triggers: [], count: 0 };
    const matches = caption.match(URGENCY_KEYWORDS_REGEX);
    if (!matches || matches.length === 0) return { hasUrgency: false, triggers: [], count: 0 };

    return {
        hasUrgency: true,
        triggers: [...new Set(matches.map(m => m.toLowerCase()))],
        count: matches.length,
    };
}

// =============================================================================
// Sensory Language Score (Lindstrom)
// =============================================================================

/**
 * Detecta palavras sensoriais no caption. Posts com linguagem multisensorial
 * geram mais saves e memorabilidade.
 */
export function sensoryLanguageScore(caption: string): {
    score: number;
    sensoryWords: string[];
    count: number;
    classification: 'multisensorial' | 'sensorial' | 'neutro';
} {
    if (!caption) return { score: 0, sensoryWords: [], count: 0, classification: 'neutro' };

    const matches = caption.match(SENSORY_REGEX);
    if (!matches || matches.length === 0) return { score: 0, sensoryWords: [], count: 0, classification: 'neutro' };

    const uniqueWords = [...new Set(matches.map(m => m.toLowerCase()))];
    // Score baseado em variedade (palavras unicas) vs quantidade
    const score = Math.min(uniqueWords.length * 20, 100);

    let classification: 'multisensorial' | 'sensorial' | 'neutro';
    if (uniqueWords.length >= 3) classification = 'multisensorial';
    else if (uniqueWords.length >= 1) classification = 'sensorial';
    else classification = 'neutro';

    return { score, sensoryWords: uniqueWords, count: uniqueWords.length, classification };
}

// =============================================================================
// Authority Signal Detection (Cialdini)
// =============================================================================

/**
 * Detecta sinais de autoridade no caption: numeros, estatisticas, certificacoes.
 */
export function detectAuthoritySignals(caption: string): {
    hasAuthority: boolean;
    signals: string[];
    count: number;
} {
    if (!caption) return { hasAuthority: false, signals: [], count: 0 };
    const matches = caption.match(AUTHORITY_REGEX);
    if (!matches || matches.length === 0) return { hasAuthority: false, signals: [], count: 0 };

    return {
        hasAuthority: true,
        signals: [...new Set(matches.map(m => m.toLowerCase()))],
        count: matches.length,
    };
}
