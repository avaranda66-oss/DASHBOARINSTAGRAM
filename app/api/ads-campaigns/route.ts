import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getAdSets, getAds, getAdAccount, getInsights } from '@/lib/services/facebook-ads.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, statusFilter, includeSets, includeAds } = body;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        // Buscar conta + campanhas em paralelo
        const [account, campaigns] = await Promise.all([
            getAdAccount(token, accountId),
            getCampaigns(token, accountId, statusFilter),
        ]);

        // Buscar insights por campanha no período padrão (últimos 30 dias)
        const datePreset = body.datePreset || 'last_30d';
        const campaignInsights = await getInsights(token, accountId, {
            level: 'campaign',
            datePreset,
        });

        // Merge insights nas campanhas
        const insightMap = new Map(campaignInsights.map(i => [i.campaign_id, i]));
        const enrichedCampaigns = campaigns.map(c => ({
            ...c,
            insights: insightMap.get(c.id) || null,
        }));

        // Opcionalmente buscar adsets e ads
        let adSets = null;
        let ads = null;

        if (includeSets) {
            adSets = await getAdSets(token, accountId);
            const adsetInsights = await getInsights(token, accountId, { level: 'adset', datePreset });
            const adsetInsightMap = new Map(adsetInsights.map(i => [i.adset_id, i]));
            adSets = adSets.map(s => ({ ...s, insights: adsetInsightMap.get(s.id) || null }));
        }

        if (includeAds) {
            ads = await getAds(token, accountId);
        }

        return NextResponse.json({
            success: true,
            account,
            campaigns: enrichedCampaigns,
            adSets,
            ads,
        });
    } catch (e: any) {
        console.error('[ads-campaigns] Erro:', e);
        return NextResponse.json(
            { success: false, error: e.message || 'Erro interno.' },
            { status: 500 },
        );
    }
}
