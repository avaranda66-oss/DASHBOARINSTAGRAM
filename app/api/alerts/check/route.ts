// =============================================================================
// app/api/alerts/check/route.ts — Endpoint de Verificação de Alertas
//
// POST body: { token: string; accountId: string; recipient?: string }
// Retorna: { alerts: AlertCondition[]; emailsSent: number }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
    computeIntelligenceMetrics,
    computeKpiSummary,
    getInsights,
    getCampaigns,
} from '@/lib/services/facebook-ads.service';
import { evaluateAlerts } from '@/lib/services/alert-engine.service';
import { sendAlertEmail } from '@/lib/services/email.service';
import { buildSurvivalData, kaplanMeier } from '@/lib/utils/creative-survival';
import { calculateAllPacingAlerts } from '@/lib/utils/budget-pacing';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as { token?: string; accountId?: string; recipient?: string };
        const { token, accountId, recipient } = body;

        if (!token || !accountId) {
            return NextResponse.json({ error: 'token e accountId são obrigatórios' }, { status: 400 });
        }

        // ── Buscar dados da conta ─────────────────────────────────────────
        const [accountInsights, campaigns] = await Promise.all([
            getInsights(token, accountId, { level: 'account', datePreset: 'last_14d' }).catch(() => []),
            getCampaigns(token, accountId).catch(() => []),
        ]);

        const kpi = computeKpiSummary(accountInsights, campaigns);

        // ── Calcular Intelligence Metrics (fatigue + survival) ────────────
        const intelligence = await computeIntelligenceMetrics(token, accountId, kpi, 'last_14d');

        // ── Curva de Sobrevivência KM ─────────────────────────────────────
        const survivalData = buildSurvivalData(intelligence.adDailyInsights);
        const survivalCurve = kaplanMeier(survivalData);

        // ── Budget Pacing ─────────────────────────────────────────────────
        const pacingAlerts = calculateAllPacingAlerts(campaigns);

        // ── Avaliar Alertas ───────────────────────────────────────────────
        const alerts = evaluateAlerts(
            intelligence.fatigueScores,
            survivalCurve,
            kpi,
            pacingAlerts,
        );

        // ── Enviar email para alertas critical/warning ────────────────────
        let emailsSent = 0;
        const alertsToNotify = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');

        if (alertsToNotify.length > 0 && recipient) {
            const accountName = `Conta ${accountId}`;
            const sent = await sendAlertEmail(alertsToNotify, accountName, recipient);
            if (sent) emailsSent = 1;
        }

        return NextResponse.json({ alerts, emailsSent });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('[alerts/check] Falha:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
