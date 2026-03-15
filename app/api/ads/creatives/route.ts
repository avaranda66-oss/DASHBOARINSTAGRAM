import { NextRequest, NextResponse } from 'next/server';
import { getAds, getInsights } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset, AdCreative, CreativeClassification } from '@/types/ads';

const FB_BENCHMARK_CTR = 1.25; // F&B industry benchmark CTR %

function classifyCreative(ctr: number): CreativeClassification {
    if (ctr > FB_BENCHMARK_CTR * 1.5) return 'TOP_PERFORMER';
    if (ctr >= FB_BENCHMARK_CTR * 0.8) return 'MÉDIO';
    return 'UNDERPERFORM';
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const token = searchParams.get('token');
        const accountId = searchParams.get('accountId');
        const campaignId = searchParams.get('campaignId');
        const datePreset = (searchParams.get('datePreset') || 'last_30d') as AdsDatePreset;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        const [ads, adInsights] = await Promise.all([
            getAds(token, accountId),
            getInsights(token, accountId, {
                level: 'ad',
                datePreset,
            }),
        ]);

        const insightMap = new Map(adInsights.map(i => [i.ad_id, i]));

        let creatives: AdCreative[] = ads
            .filter(ad => ad.creative)
            .map(ad => {
                const i = insightMap.get(ad.id);
                const spend = parseFloat(i?.spend || '0') || 0;
                const impressions = parseInt(i?.impressions || '0') || 0;
                const clicks = parseInt(i?.clicks || '0') || 0;
                const ctr = parseFloat(i?.ctr || '0') || 0;
                const cpc = parseFloat(i?.cpc || '0') || 0;
                const frequency = parseFloat(i?.frequency || '0') || 0;
                const roasRaw = parseFloat(i?.purchase_roas?.[0]?.value || '0') || 0;
                const roas = roasRaw > 0 ? roasRaw : null;

                let conversions = 0;
                if (i?.actions) {
                    for (const a of i.actions) {
                        if (
                            a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                            a.action_type === 'offsite_conversion.fb_pixel_lead' ||
                            a.action_type === 'lead'
                        ) {
                            conversions += parseInt(a.value) || 0;
                        }
                    }
                }

                return {
                    adId: ad.id,
                    adName: ad.name,
                    status: ad.status,
                    effectiveStatus: ad.effective_status,
                    creative: {
                        id: ad.creative!.id,
                        name: ad.creative!.title || undefined,
                        thumbnailUrl: ad.creative!.thumbnail_url || undefined,
                        body: ad.creative!.body || undefined,
                        title: ad.creative!.title || undefined,
                        imageUrl: ad.creative!.image_url || undefined,
                    },
                    metrics: { spend, impressions, clicks, ctr, cpc, frequency, roas, conversions },
                    classification: classifyCreative(ctr),
                } satisfies AdCreative;
            });

        // Filter by campaign if provided
        if (campaignId) {
            const campaignAdIds = new Set(
                ads.filter(a => a.campaign_id === campaignId).map(a => a.id),
            );
            creatives = creatives.filter(c => campaignAdIds.has(c.adId));
        }

        return NextResponse.json({
            success: true,
            creatives,
            total: creatives.length,
        });
    } catch (e: unknown) {
        console.error('[ads/creatives] Erro:', e);
        const message = e instanceof Error ? e.message : 'Erro interno.';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
