import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getInsights } from '@/lib/services/facebook-ads.service';
import { generatePdf, getDetectedBrowser } from '@/lib/services/pdf.service';
import { buildAdsReportHtml } from '@/lib/templates/ads-report-template';
import type { ReportData } from '@/lib/templates/ads-report-template';
import type { AdsDatePreset } from '@/types/ads';

// ─── Date Preset → Human Label ──────────────────────────────────────────────

const PRESET_LABELS: Record<string, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    last_7d: 'Últimos 7 dias',
    last_14d: 'Últimos 14 dias',
    last_30d: 'Últimos 30 dias',
    last_90d: 'Últimos 90 dias',
    this_month: 'Este mês',
    last_month: 'Mês passado',
};

function dateRangeFromPreset(preset: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const daysAgo = (n: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    };

    switch (preset) {
        case 'today': return { start: end, end };
        case 'yesterday': return { start: daysAgo(1), end: daysAgo(1) };
        case 'last_7d': return { start: daysAgo(7), end };
        case 'last_14d': return { start: daysAgo(14), end };
        case 'last_30d': return { start: daysAgo(30), end };
        case 'last_90d': return { start: daysAgo(90), end };
        default: return { start: daysAgo(30), end };
    }
}

// ─── GET /api/ads-report/pdf ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        const { searchParams } = req.nextUrl;
        const token = searchParams.get('token');
        const accountId = searchParams.get('accountId');
        const datePreset = (searchParams.get('datePreset') || 'last_30d') as AdsDatePreset;
        const accountName = searchParams.get('accountName') || accountId || 'Conta';

        if (!token || !accountId) {
            return NextResponse.json(
                { success: false, error: 'token e accountId são obrigatórios.' },
                { status: 400 },
            );
        }

        // 1. Fetch campaigns + insights in parallel
        const [campaigns, insights] = await Promise.all([
            getCampaigns(token, accountId),
            getInsights(token, accountId, { level: 'campaign', datePreset }),
        ]);

        // 2. Merge insights into campaigns
        const insightMap = new Map(insights.map(i => [i.campaign_id, i]));

        const campaignData = campaigns.map(c => {
            const i = insightMap.get(c.id);
            const spend = parseFloat(i?.spend || '0') || 0;
            const ctr = parseFloat(i?.outbound_clicks_ctr?.[0]?.value || i?.ctr || '0') || 0;
            const cpc = parseFloat(i?.cpc || '0') || 0;
            const roas = parseFloat(i?.purchase_roas?.[0]?.value || '0') || 0;
            const impressions = parseInt(i?.impressions || '0') || 0;
            const clicks = parseInt(i?.clicks || '0') || 0;
            return {
                name: c.name,
                status: c.effective_status,
                spend, roas, ctr, cpc, impressions, clicks,
            };
        }).filter(c => c.impressions > 0 || c.spend > 0);

        // 3. Calculate summary
        const totalSpend = campaignData.reduce((s, c) => s + c.spend, 0);
        const totalImpressions = campaignData.reduce((s, c) => s + c.impressions, 0);
        const totalClicks = campaignData.reduce((s, c) => s + c.clicks, 0);
        const withRoas = campaignData.filter(c => c.roas > 0);
        const avgRoas = withRoas.length > 0
            ? withRoas.reduce((s, c) => s + c.roas, 0) / withRoas.length
            : 0;

        let totalConversions = 0;
        for (const i of insights) {
            if (i.actions) {
                for (const a of i.actions) {
                    if (
                        a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                        a.action_type === 'offsite_conversion.fb_pixel_lead' ||
                        a.action_type === 'lead'
                    ) {
                        totalConversions += parseInt(a.value) || 0;
                    }
                }
            }
        }

        const reportData: ReportData = {
            accountName,
            accountId,
            dateRange: dateRangeFromPreset(datePreset),
            campaigns: campaignData,
            summary: {
                totalSpend,
                avgRoas,
                avgCtr: totalImpressions > 0
                    ? campaignData.reduce((s, c) => s + c.ctr * c.impressions, 0) / totalImpressions
                    : 0,
                avgCpc: totalClicks > 0
                    ? campaignData.reduce((s, c) => s + c.cpc * c.clicks, 0) / totalClicks
                    : 0,
                avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
                totalImpressions,
                totalClicks,
                totalConversions,
                totalCampaigns: campaigns.length,
                activeCampaigns: campaigns.filter(c => c.effective_status === 'ACTIVE').length,
            },
            currency: 'BRL',
            generatedAt: new Date().toLocaleString('pt-BR'),
        };

        // 4. Build HTML
        const html = buildAdsReportHtml(reportData);

        // 5. Generate PDF
        const pdfBuffer = await generatePdf({ html });

        const elapsed = Date.now() - startTime;

        const filename = `ads-report-${datePreset}-${Date.now()}.pdf`;

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });
    } catch (e: unknown) {
        const elapsed = Date.now() - startTime;
        console.error(`[ads-report/pdf] Erro após ${elapsed}ms:`, e);
        const message = e instanceof Error ? e.message : 'Erro ao gerar PDF.';

        if (message.includes('Chrome') || message.includes('Edge') || message.includes('puppeteer')) {
            return NextResponse.json(
                { success: false, error: message, browser: getDetectedBrowser() },
                { status: 500 },
            );
        }

        if (elapsed >= 30_000) {
            return NextResponse.json(
                { success: false, error: 'Timeout ao gerar PDF. Tente novamente.' },
                { status: 504 },
            );
        }

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
