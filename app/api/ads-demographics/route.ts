import { NextRequest, NextResponse } from 'next/server';
import { getInsightsWithBreakdown } from '@/lib/services/facebook-ads.service';
import type { AdsDatePreset, DemographicBreakdown, PlacementBreakdown, AdActionStat } from '@/types/ads';

/**
 * US-69 — Age & Gender Breakdown
 * US-70 — Placement Analysis
 *
 * POST /api/ads-demographics
 * Body: { token, accountId, datePreset?, timeRange? }
 * Response: { success, demographics: DemographicBreakdown[], placements: PlacementBreakdown[] }
 */

function sumActions(actions: AdActionStat[] | undefined, types: string[]): number {
    if (!actions?.length) return 0;
    return actions
        .filter(a => types.includes(a.action_type))
        .reduce((s, a) => s + parseFloat(a.value || '0'), 0);
}

function extractRoas(roas?: AdActionStat[]): number {
    if (!roas?.length) return 0;
    const omni = roas.find(a => a.action_type === 'omni_purchase');
    const purchase = roas.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase');
    const r = omni ?? purchase ?? roas[0];
    return r ? parseFloat(r.value || '0') : 0;
}

const CONV_TYPES = ['offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'lead'];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, accountId, datePreset, timeRange } = body;

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'Token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        const opts = {
            datePreset: (datePreset || 'last_30d') as AdsDatePreset,
            timeRange: timeRange as { since: string; until: string } | undefined,
        };

        // Busca age/gender e placement em paralelo
        const [ageGenderRaw, placementRaw] = await Promise.all([
            getInsightsWithBreakdown(token, accountId, ['age', 'gender'], opts),
            getInsightsWithBreakdown(token, accountId, ['publisher_platform', 'platform_position'], opts),
        ]);

        // Transformar age/gender
        const demographics: DemographicBreakdown[] = ageGenderRaw.map(r => {
            const impressions = parseInt(r.impressions) || 0;
            const clicks = parseInt((r as any).inline_link_clicks || r.clicks) || 0;
            const spend = parseFloat(r.spend) || 0;
            return {
                age: (r as any).age || 'unknown',
                gender: (r as any).gender || 'unknown',
                impressions,
                clicks,
                spend,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                conversions: sumActions(r.actions, CONV_TYPES),
                roas: extractRoas(r.purchase_roas),
            };
        });

        // Transformar placement
        const placements: PlacementBreakdown[] = placementRaw.map(r => {
            const impressions = parseInt(r.impressions) || 0;
            const clicks = parseInt((r as any).inline_link_clicks || r.clicks) || 0;
            const spend = parseFloat(r.spend) || 0;
            return {
                publisher_platform: (r as any).publisher_platform || 'unknown',
                platform_position: (r as any).platform_position || 'unknown',
                impressions,
                clicks,
                spend,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                conversions: sumActions(r.actions, CONV_TYPES),
                roas: extractRoas(r.purchase_roas),
            };
        });

        return NextResponse.json({ success: true, demographics, placements });
    } catch (e: any) {
        console.error('[ads-demographics] Erro:', e);
        const msg: string = e.message || '';
        const isAuthError =
            msg.includes('190') ||
            msg.includes('OAuthException') ||
            msg.includes('access token');
        if (isAuthError) {
            return NextResponse.json(
                { success: false, error: 'TOKEN_EXPIRED', errorMessage: 'Token Meta expirado.' },
                { status: 401 },
            );
        }
        return NextResponse.json(
            { success: false, error: msg || 'Erro interno.' },
            { status: 500 },
        );
    }
}
