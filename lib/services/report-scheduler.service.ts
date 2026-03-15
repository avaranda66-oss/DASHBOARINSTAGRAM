import prisma from '@/lib/db';
import { getCampaigns, getInsights } from '@/lib/services/facebook-ads.service';
import { generatePdf } from '@/lib/services/pdf.service';
import { buildAdsReportHtml } from '@/lib/templates/ads-report-template';
import { sendReportEmail, isEmailConfigured } from '@/lib/services/email.service';
import type { ReportData } from '@/lib/templates/ads-report-template';
import type { AdsDatePreset } from '@/types/ads';

// ─── US-60 — Report Scheduler Service ────────────────────────────────────────

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
    email: string;
    frequency: ReportFrequency;
    accountId: string;
    accountName?: string;
    token: string;
    enabled: boolean;
    nextSendAt: string; // ISO date
    datePreset?: AdsDatePreset;
}

const SETTING_KEY = 'report-schedule';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function calculateNextSendAt(frequency: ReportFrequency): string {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            next.setHours(8, 0, 0, 0);
            break;
        case 'weekly':
            // Próxima segunda-feira 08:00
            const dayOfWeek = next.getDay();
            const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            next.setDate(next.getDate() + daysUntilMonday);
            next.setHours(8, 0, 0, 0);
            break;
        case 'monthly':
            // Dia 1 do próximo mês 08:00
            next.setMonth(next.getMonth() + 1, 1);
            next.setHours(8, 0, 0, 0);
            break;
    }

    return next.toISOString();
}

function datePresetForFrequency(frequency: ReportFrequency): AdsDatePreset {
    switch (frequency) {
        case 'daily': return 'yesterday';
        case 'weekly': return 'last_7d';
        case 'monthly': return 'last_30d';
    }
}

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

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function getSchedule(): Promise<ReportSchedule | null> {
    const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!setting?.value) return null;
    try {
        return JSON.parse(setting.value) as ReportSchedule;
    } catch {
        return null;
    }
}

export async function saveSchedule(schedule: ReportSchedule): Promise<void> {
    await prisma.setting.upsert({
        where: { key: SETTING_KEY },
        create: { key: SETTING_KEY, value: JSON.stringify(schedule) },
        update: { value: JSON.stringify(schedule) },
    });
}

// ─── PDF Generation (shared with /api/ads-report/pdf) ────────────────────────

async function generateReportPdf(
    token: string,
    accountId: string,
    datePreset: AdsDatePreset,
    accountName: string,
): Promise<{ pdfBuffer: Buffer; period: string }> {
    const [campaigns, insights] = await Promise.all([
        getCampaigns(token, accountId),
        getInsights(token, accountId, { level: 'campaign', datePreset }),
    ]);

    const insightMap = new Map(insights.map(i => [i.campaign_id, i]));

    const campaignData = campaigns.map(c => {
        const i = insightMap.get(c.id);
        return {
            name: c.name,
            status: c.effective_status,
            spend: parseFloat(i?.spend || '0') || 0,
            roas: parseFloat(i?.purchase_roas?.[0]?.value || '0') || 0,
            ctr: parseFloat(i?.outbound_clicks_ctr?.[0]?.value || i?.ctr || '0') || 0,
            cpc: parseFloat(i?.cpc || '0') || 0,
            impressions: parseInt(i?.impressions || '0') || 0,
            clicks: parseInt(i?.clicks || '0') || 0,
        };
    }).filter(c => c.impressions > 0 || c.spend > 0);

    const totalSpend = campaignData.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = campaignData.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = campaignData.reduce((s, c) => s + c.clicks, 0);
    const withRoas = campaignData.filter(c => c.roas > 0);
    const avgRoas = withRoas.length > 0
        ? withRoas.reduce((s, c) => s + c.roas, 0) / withRoas.length : 0;

    let totalConversions = 0;
    for (const i of insights) {
        if (i.actions) {
            for (const a of i.actions) {
                if (
                    a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                    a.action_type === 'offsite_conversion.fb_pixel_lead' ||
                    a.action_type === 'lead'
                ) totalConversions += parseInt(a.value) || 0;
            }
        }
    }

    const dateRange = dateRangeFromPreset(datePreset);
    const reportData: ReportData = {
        accountName,
        accountId,
        dateRange,
        campaigns: campaignData,
        summary: {
            totalSpend, avgRoas,
            avgCtr: totalImpressions > 0
                ? campaignData.reduce((s, c) => s + c.ctr * c.impressions, 0) / totalImpressions : 0,
            avgCpc: totalClicks > 0
                ? campaignData.reduce((s, c) => s + c.cpc * c.clicks, 0) / totalClicks : 0,
            avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
            totalImpressions, totalClicks, totalConversions,
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter(c => c.effective_status === 'ACTIVE').length,
        },
        currency: 'BRL',
        generatedAt: new Date().toLocaleString('pt-BR'),
    };

    const html = buildAdsReportHtml(reportData);
    const pdfBuffer = await generatePdf({ html });

    return { pdfBuffer, period: `${dateRange.start} → ${dateRange.end}` };
}

// ─── Send Now (manual trigger) ───────────────────────────────────────────────

export async function sendReportNow(
    email: string,
    token: string,
    accountId: string,
    accountName?: string,
    datePreset?: AdsDatePreset,
): Promise<{ success: boolean; message: string }> {
    if (!isEmailConfigured()) {
        return { success: false, message: 'Gmail não configurado. Adicione GMAIL_USER e GMAIL_APP_PASS ao .env.' };
    }

    try {
        const preset = datePreset || 'last_30d';
        const name = accountName || accountId;
        const { pdfBuffer, period } = await generateReportPdf(token, accountId, preset, name);

        const sent = await sendReportEmail({
            to: email,
            subject: `Relatório de Ads — ${name} — ${period}`,
            pdfBuffer,
            filename: `ads-report-${preset}-${Date.now()}.pdf`,
            accountName: name,
            period,
        });

        return sent
            ? { success: true, message: `Relatório enviado para ${email}` }
            : { success: false, message: 'Falha ao enviar email. Verifique as credenciais Gmail.' };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao gerar/enviar relatório';
        return { success: false, message: msg };
    }
}

// ─── Check & Send Scheduled Reports ──────────────────────────────────────────

export async function checkAndSendScheduledReports(): Promise<void> {
    const schedule = await getSchedule();
    if (!schedule || !schedule.enabled) return;

    const now = new Date();
    const nextSend = new Date(schedule.nextSendAt);

    if (now < nextSend) return; // Ainda não é hora

    if (!isEmailConfigured()) {
        console.warn('[report-scheduler] Gmail não configurado. Pulando envio agendado.');
        return;
    }


    try {
        const preset = schedule.datePreset || datePresetForFrequency(schedule.frequency);
        const name = schedule.accountName || schedule.accountId;
        const { pdfBuffer, period } = await generateReportPdf(
            schedule.token, schedule.accountId, preset, name,
        );

        const sent = await sendReportEmail({
            to: schedule.email,
            subject: `Relatório de Ads — ${name} — ${period}`,
            pdfBuffer,
            filename: `ads-report-${preset}-${Date.now()}.pdf`,
            accountName: name,
            period,
        });

        if (sent) {
            // Atualizar nextSendAt
            schedule.nextSendAt = calculateNextSendAt(schedule.frequency);
            await saveSchedule(schedule);
        } else {
            console.error('[report-scheduler] Falha ao enviar relatório agendado.');
        }
    } catch (e: unknown) {
        console.error('[report-scheduler] Erro:', e instanceof Error ? e.message : e);
    }
}
