import { NextRequest, NextResponse } from 'next/server';
import { getAds, getInsights } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset } from '@/types/ads';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, timeRange } = body;
        const datePreset = timeRange ? undefined : (body.datePreset || 'last_30d');

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        // Buscar ads (com criativos) + insights por ad em paralelo
        const [ads, adInsights] = await Promise.all([
            getAds(token, accountId),
            getInsights(token, accountId, {
                level: 'ad',
                datePreset: datePreset as AdsDatePreset,
                timeRange,
            }),
        ]);

        // Merge insights nos ads
        const insightMap = new Map(adInsights.map(i => [i.ad_id, i]));
        const enrichedAds = ads.map(ad => ({
            ...ad,
            insights: insightMap.get(ad.id) || null,
        }));

        return NextResponse.json({
            success: true,
            ads: enrichedAds,
            totalAds: enrichedAds.length,
            adsWithCreative: enrichedAds.filter(a => a.creative?.thumbnail_url || a.creative?.image_url).length,
        });
    } catch (e: unknown) {
        console.error('[ads-creatives] Erro:', e);
        const message = e instanceof Error ? e.message : 'Erro interno.';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
