import { NextRequest, NextResponse } from 'next/server';
import { getDailyInsights, getInsights, computeKpiSummary } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset, AdsKpiDelta } from '@/types/ads';

const fmt = (d: Date) => d.toISOString().split('T')[0];
const sub = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() - days); return r; };

/**
 * FASE 3 — Delta contextual por preset.
 * Cada preset tem uma comparação semanticamente correta:
 *   today      → vs ontem (não anteontem)
 *   yesterday  → vs mesmo dia semana passada (posição sazonal idêntica)
 *   last_7d    → vs 7d anteriores (correto)
 *   last_14d   → vs 14d anteriores (correto)
 *   this_month → vs mês passado calendário (não 30d antes)
 *   last_month → vs mês retrasado
 */
function getPreviousPeriodRange(
    datePreset?: string,
    timeRange?: { since: string; until: string },
): { since: string; until: string } {
    if (timeRange) {
        const since = new Date(timeRange.since);
        const until = new Date(timeRange.until);
        const days = Math.round((until.getTime() - since.getTime()) / 86_400_000) + 1;
        const prevUntil = sub(since, 1);
        return { since: fmt(sub(prevUntil, days - 1)), until: fmt(prevUntil) };
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Casos especiais com semântica correta
    if (datePreset === 'today') {
        const yesterday = sub(today, 1);
        return { since: fmt(yesterday), until: fmt(yesterday) };
    }
    if (datePreset === 'yesterday') {
        // Compara com mesmo dia da semana passada (mesma posição sazonal)
        const d = sub(today, 8); // ontem foi today-1, semana antes = today-8
        return { since: fmt(d), until: fmt(d) };
    }
    if (datePreset === 'this_month') {
        // Mês passado: primeiro ao último dia do mês anterior
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastOfPrevMonth = sub(firstOfMonth, 1);
        const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
        return { since: fmt(firstOfPrevMonth), until: fmt(lastOfPrevMonth) };
    }
    if (datePreset === 'last_month') {
        // last_month = mês passado → comparar com retrasado (2 meses atrás)
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastOfPrevMonth = sub(firstOfMonth, 1);                    // último dia do mês passado
        const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1); // 1º do mês passado
        const lastOfTwoMonthsAgo = sub(firstOfPrevMonth, 1);            // último dia de 2 meses atrás
        const firstOfTwoMonthsAgo = new Date(lastOfTwoMonthsAgo.getFullYear(), lastOfTwoMonthsAgo.getMonth(), 1); // 1º de 2 meses atrás
        return { since: fmt(firstOfTwoMonthsAgo), until: fmt(lastOfTwoMonthsAgo) };
    }

    // Caso geral: período simétrico anterior
    const daysMap: Record<string, number> = {
        last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90,
    };
    const days = daysMap[datePreset ?? 'last_30d'] ?? 30;
    const prevUntil = sub(today, days + 1);
    return { since: fmt(sub(prevUntil, days - 1)), until: fmt(prevUntil) };
}

function delta(curr: number, prev: number): number | null {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100 * 10) / 10;
}

/**
 * FASE 2 — Smart Fallback de Período.
 * Se o preset solicitado retornar 0 linhas diárias, tenta presets maiores
 * até encontrar dados. Retorna qual preset foi efetivamente usado.
 */
const FALLBACK_CHAIN: Record<string, AdsDatePreset[]> = {
    today:      ['today', 'yesterday', 'last_7d'],
    yesterday:  ['yesterday', 'last_7d', 'last_14d'],
    last_7d:    ['last_7d', 'last_14d', 'last_30d'],
    last_14d:   ['last_14d', 'last_30d'],
    last_30d:   ['last_30d', 'last_90d'],
    last_90d:   ['last_90d'],
    this_month: ['this_month', 'last_30d'],
    last_month: ['last_month', 'last_30d'],
};

async function getDailyWithFallback(
    token: string,
    accountId: string,
    requestedPreset?: AdsDatePreset,
    timeRange?: { since: string; until: string },
): Promise<{ daily: Awaited<ReturnType<typeof getDailyInsights>>; usedPreset: string | null }> {
    // Range customizado não tem fallback — dados são o que a API retornar
    if (timeRange) {
        const daily = await getDailyInsights(token, accountId, undefined, timeRange);
        return { daily, usedPreset: null };
    }

    const chain = FALLBACK_CHAIN[requestedPreset ?? 'last_30d'] ?? ['last_30d'];
    for (const preset of chain) {
        const daily = await getDailyInsights(token, accountId, preset, undefined);
        if (daily.length > 0) {
            return { daily, usedPreset: preset === requestedPreset ? null : preset };
        }
    }
    return { daily: [], usedPreset: null };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, timeRange, level = 'campaign', attributionWindow } = body;
        const datePreset = timeRange ? undefined : (body.datePreset || 'last_30d') as AdsDatePreset;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        const prevRange = getPreviousPeriodRange(datePreset, timeRange);

        // Buscar tudo em paralelo — getCampaigns removido (já vem via ads-campaigns, economiza 1 request)
        const [{ daily: dailyData, usedPreset }, insights, currAccountInsights, prevInsights] = await Promise.all([
            getDailyWithFallback(token, accountId, datePreset, timeRange),
            getInsights(token, accountId, {
                level: level as any,
                datePreset,
                timeRange,
                attributionWindow,
            }),
            getInsights(token, accountId, {
                level: 'account',
                datePreset,
                timeRange,
                attributionWindow,
            }),
            getInsights(token, accountId, {
                level: 'account',
                datePreset: undefined,
                timeRange: prevRange,
            }),
        ]);

        console.log(`[ads-insights] preset=${datePreset}, usedPreset=${usedPreset ?? 'same'}, daily=${dailyData.length}, insights=${insights.length}`);

        // Passa [] para campanhas nas funções de delta — contagem ativo/pausado não é necessária lá
        const kpiSummary = computeKpiSummary(insights, []);
        const currKpiForDelta = computeKpiSummary(currAccountInsights, []);
        const prevKpi = computeKpiSummary(prevInsights, []);

        const kpiDelta: AdsKpiDelta = {
            totalSpend:        delta(currKpiForDelta.totalSpend, prevKpi.totalSpend),
            totalImpressions:  delta(currKpiForDelta.totalImpressions, prevKpi.totalImpressions),
            totalClicks:       delta(currKpiForDelta.totalClicks, prevKpi.totalClicks),
            totalReach:        delta(currKpiForDelta.totalReach, prevKpi.totalReach),
            avgCtr:            delta(currKpiForDelta.avgCtr, prevKpi.avgCtr),
            avgCpc:            delta(currKpiForDelta.avgCpc, prevKpi.avgCpc),
            avgCpm:            delta(currKpiForDelta.avgCpm, prevKpi.avgCpm),
            avgFrequency:      delta(currKpiForDelta.avgFrequency, prevKpi.avgFrequency),
            totalConversions:  delta(currKpiForDelta.totalConversions, prevKpi.totalConversions),
            roas:              delta(currKpiForDelta.roas, prevKpi.roas),
            cpa:               delta(currKpiForDelta.cpa, prevKpi.cpa),
            totalEngagements:  delta(currKpiForDelta.totalEngagements, prevKpi.totalEngagements),
            costPerEngagement: delta(currKpiForDelta.costPerEngagement, prevKpi.costPerEngagement),
        };

        return NextResponse.json({
            success: true,
            daily: dailyData,
            // usedPreset: preset que foi efetivamente usado (null = mesmo solicitado)
            usedPreset,
            insights,
            kpiSummary,
            kpiDelta,
        });
    } catch (e: any) {
        console.error('[ads-insights] Erro:', e);
        const msg: string = e.message || '';
        const isAuthError =
            msg.includes('190') ||
            msg.includes('OAuthException') ||
            msg.includes('Invalid OAuth') ||
            msg.includes('access token') ||
            msg.includes('Error validating access token');
        if (isAuthError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'TOKEN_EXPIRED',
                    errorMessage: 'Token Meta expirado ou inválido. Renove em business.facebook.com → Configurações → Tokens de acesso.',
                },
                { status: 401 },
            );
        }
        return NextResponse.json(
            { success: false, error: msg || 'Erro interno.' },
            { status: 500 },
        );
    }
}
