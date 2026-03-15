import { NextRequest, NextResponse } from 'next/server';
import { generateAIContentWithSystem } from '@/lib/services/ai-adapter';
import type { AdCampaign, AdsKpiSummary } from '@/types/ads';

interface DiagnosisRequest {
    accountId: string;
    campaigns: AdCampaign[];
    kpi: AdsKpiSummary | null;
    datePreset: string;
}

function extractNumber(actions: { action_type: string; value: string }[] | undefined, type: string): number | null {
    const found = actions?.find(a => a.action_type === type);
    return found ? parseFloat(found.value) : null;
}

function buildPayload(req: DiagnosisRequest) {
    const campaignData = req.campaigns.map(c => {
        const ins = c.insights;
        const impressions = ins ? parseFloat(ins.impressions) || 0 : 0;
        const spend = ins ? parseFloat(ins.spend) || 0 : 0;
        const ctr = ins?.ctr ? parseFloat(ins.ctr) : null;
        const frequency = ins?.frequency ? parseFloat(ins.frequency) : null;

        // ROAS
        const roasAction = ins?.purchase_roas?.find(a => a.action_type === 'omni_purchase');
        const roas = roasAction ? parseFloat(roasAction.value) : null;

        // CPA
        const cpaAction = ins?.cost_per_action_type?.find(
            a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
        );
        const cpa = cpaAction ? parseFloat(cpaAction.value) : null;

        // Video metrics
        const v3s = extractNumber(ins?.video_thruplay_watched_actions, 'video_view') ??
            extractNumber(ins?.video_15_sec_watched_actions, 'video_view');
        const thruplay = extractNumber(ins?.video_thruplay_watched_actions, 'video_view');
        const vp25 = extractNumber(ins?.video_p25_watched_actions, 'video_view');
        const vp75 = extractNumber(ins?.video_p75_watched_actions, 'video_view');

        // Hook rate = 3s views / impressions (use p25 as proxy when 3s not available)
        const hook_rate = v3s && impressions > 0 ? (v3s / impressions) * 100 : null;
        const hold_rate = thruplay && v3s && v3s > 0 ? (thruplay / v3s) * 100 : null;
        const video_p25 = vp25 && impressions > 0 ? (vp25 / impressions) * 100 : null;
        const video_p75 = vp75 && impressions > 0 ? (vp75 / impressions) * 100 : null;

        return {
            id: c.id,
            name: c.name,
            objective: c.objective,
            spend: spend > 0 ? spend : null,
            impressions: impressions > 0 ? impressions : null,
            frequency,
            ctr,
            roas,
            cpa,
            video: (hook_rate !== null || hold_rate !== null) ? {
                hook_rate,
                hold_rate,
                video_p25,
                video_p75,
                thruplay: thruplay ?? null,
            } : null,
        };
    });

    return {
        account: {
            currency: req.kpi?.currency ?? 'BRL',
            time_window: req.datePreset,
            total_spend: req.kpi?.totalSpend ?? null,
            avg_frequency: req.kpi?.avgFrequency ?? null,
            roas: req.kpi?.roas ?? null,
        },
        campaigns: campaignData,
    };
}

const SYSTEM_PROMPT = `You are a senior Meta Ads analyst. Analyze ONLY the data provided in the JSON.
Never invent metrics or benchmarks. Mark as 'insufficient data' when sample is too small.
The account uses REACH objective (awareness), so ROAS and CPA may be null — this is normal.`;

const USER_PROMPT_TEMPLATE = `Analyze this Meta Ads account performance and return a JSON with:
- executive_summary: array of 3-5 bullet strings in Portuguese
- scorecards: array of { campaign_id, name, grade (A/B/C/D/F), diagnosis: string, alerts: string[] }
- priority_actions: array of { action: string, impact: 'high'|'medium'|'low', campaign_id? }
Use ONLY values present in this data: `;

export async function POST(req: NextRequest) {
    try {
        const body: DiagnosisRequest = await req.json();

        if (!body.campaigns || body.campaigns.length === 0) {
            return NextResponse.json({ error: 'Nenhuma campanha fornecida.' }, { status: 400 });
        }

        const payload = buildPayload(body);
        const userPrompt = USER_PROMPT_TEMPLATE + JSON.stringify(payload);

        const raw = await generateAIContentWithSystem(userPrompt, {
            systemPrompt: SYSTEM_PROMPT,
            jsonMode: true,
            temperature: 0.3,
        });

        let result: unknown;
        try {
            result = JSON.parse(raw);
        } catch {
            return NextResponse.json({ error: 'LLM retornou JSON inválido.', raw }, { status: 500 });
        }

        return NextResponse.json({ success: true, diagnosis: result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
