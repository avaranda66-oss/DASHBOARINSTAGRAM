// ─── Budget Pacing Calculator (US-63) ────────────────────────────────────────
// Pure functions — zero dependencies, zero side effects.
// Meta API stores budgets in CENTS (daily_budget: "5000" = $50.00).

import type { AdCampaign, BudgetPacingAlert, PacingStatus } from '@/types/ads';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCents(v?: string): number {
    return v ? (parseFloat(v) || 0) / 100 : 0;
}

function daysBetween(a: string, b: string): number {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(Math.ceil(ms / 86_400_000), 0);
}

// ─── Core ────────────────────────────────────────────────────────────────────

export function calculateBudgetPacing(campaign: AdCampaign): BudgetPacingAlert | null {
    const dailyBudget = parseCents(campaign.daily_budget);
    const lifetimeBudget = parseCents(campaign.lifetime_budget);
    const budgetTotal = lifetimeBudget || dailyBudget;

    // Sem budget configurado → sem pacing
    if (budgetTotal <= 0) return null;

    const spend = campaign.insights ? parseFloat(campaign.insights.spend) || 0 : 0;
    const budgetRemaining = campaign.budget_remaining
        ? parseCents(campaign.budget_remaining)
        : Math.max(budgetTotal - spend, 0);

    const now = new Date();
    const startDate = campaign.insights?.date_start || campaign.start_time || campaign.created_time;
    const endDate = campaign.stop_time || campaign.insights?.date_stop;

    const daysElapsed = Math.max(daysBetween(startDate, now.toISOString()), 1);

    // Para daily budget sem end date, usamos ciclo de 30 dias como referência
    const totalPeriodDays = endDate
        ? daysBetween(startDate, endDate)
        : (dailyBudget > 0 ? 30 : 30);

    const daysRemaining = Math.max(totalPeriodDays - daysElapsed, 0);

    const avgDailySpend = spend / daysElapsed;

    // Pacing: quanto já gastou vs quanto deveria ter gasto
    const expectedUtilizationPct = totalPeriodDays > 0
        ? Math.min((daysElapsed / totalPeriodDays) * 100, 100)
        : 100;

    const utilizationPct = budgetTotal > 0 ? (spend / budgetTotal) * 100 : 0;

    // Pacing ratio: >1 = gastando mais rápido que o ideal
    const pacingRatio = expectedUtilizationPct > 0
        ? utilizationPct / expectedUtilizationPct
        : (utilizationPct > 0 ? 999 : 1);

    const daysUntilExhaustion = avgDailySpend > 0
        ? budgetRemaining / avgDailySpend
        : null;

    // Classificação
    let status: PacingStatus;
    let severity: BudgetPacingAlert['severity'];
    let message: string;

    if (budgetRemaining <= 0 || utilizationPct >= 99) {
        status = 'exhausted';
        severity = 'critical';
        message = `Budget esgotado — ${utilizationPct.toFixed(0)}% consumido.`;
    } else if (pacingRatio > 1.2) {
        status = 'overspending';
        severity = pacingRatio > 1.5 ? 'critical' : 'warn';
        message = daysUntilExhaustion !== null
            ? `Ritmo acelerado — budget esgota em ~${Math.ceil(daysUntilExhaustion)}d se mantiver R$${avgDailySpend.toFixed(0)}/dia.`
            : `Overspend: ${utilizationPct.toFixed(0)}% usado (esperado: ${expectedUtilizationPct.toFixed(0)}%).`;
    } else if (pacingRatio < 0.6) {
        status = 'underspending';
        severity = 'warn';
        message = `Subgasto — apenas ${utilizationPct.toFixed(0)}% do budget usado (esperado: ${expectedUtilizationPct.toFixed(0)}%).`;
    } else {
        status = 'on_track';
        severity = 'info';
        message = `Pacing saudável — ${utilizationPct.toFixed(0)}% usado, ~${daysRemaining}d restantes.`;
    }

    return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status,
        budgetTotal,
        budgetSpent: spend,
        budgetRemaining,
        avgDailySpend,
        daysElapsed,
        daysRemaining,
        daysUntilExhaustion,
        utilizationPct,
        expectedUtilizationPct,
        pacingRatio,
        message,
        severity,
    };
}

/** Calcula pacing de todas as campanhas com budget, ordena por severidade */
export function calculateAllPacingAlerts(campaigns: AdCampaign[]): BudgetPacingAlert[] {
    const severityOrder: Record<string, number> = { critical: 0, warn: 1, info: 2 };

    return campaigns
        .map(calculateBudgetPacing)
        .filter((a): a is BudgetPacingAlert => a !== null)
        .sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
}
