import { NextRequest, NextResponse } from 'next/server';
import { computeIntelligenceMetrics, computeKpiSummary, getInsights, getCampaigns } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset } from '@/types/ads';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, datePreset = 'last_14d', kpiSummary } = body;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        // If KPI summary not provided, compute it
        let kpi = kpiSummary;
        if (!kpi) {
            const [insights, campaigns] = await Promise.all([
                getInsights(token, accountId, { level: 'campaign', datePreset: datePreset as AdsDatePreset }),
                getCampaigns(token, accountId),
            ]);
            kpi = computeKpiSummary(insights, campaigns);
        }

        const metrics = await computeIntelligenceMetrics(
            token, accountId, kpi, datePreset as AdsDatePreset,
        );

        return NextResponse.json({ success: true, metrics });
    } catch (e: unknown) {
        console.error('[ads-intelligence] Erro:', e);
        const message = e instanceof Error ? e.message : 'Erro interno.';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
