import { NextRequest, NextResponse } from 'next/server';
import { getDailyInsights, getInsights, computeKpiSummary, getCampaigns } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset } from '@/types/ads';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, datePreset = 'last_30d', timeRange, level = 'campaign' } = body;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        // Buscar tudo em paralelo
        const [dailyData, insights, campaigns] = await Promise.all([
            getDailyInsights(token, accountId, datePreset as AdsDatePreset),
            getInsights(token, accountId, {
                level: level as any,
                datePreset: datePreset as AdsDatePreset,
                timeRange,
            }),
            getCampaigns(token, accountId),
        ]);

        // Computar KPIs resumidos
        const kpiSummary = computeKpiSummary(insights, campaigns);

        return NextResponse.json({
            success: true,
            daily: dailyData,
            insights,
            kpiSummary,
        });
    } catch (e: any) {
        console.error('[ads-insights] Erro:', e);
        return NextResponse.json(
            { success: false, error: e.message || 'Erro interno.' },
            { status: 500 },
        );
    }
}
