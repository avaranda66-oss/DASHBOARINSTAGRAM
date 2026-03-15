// =============================================================================
// alert-engine.service.ts — Loop Preditivo de Alertas
// US: predictive-alert-loop
//
// Decide quando disparar alertas com base em fadiga criativa,
// curva de sobrevivência KM, saturação de audiência e pacing de budget.
// =============================================================================

import type { CreativeFatigueScore, AdsKpiSummary, BudgetPacingAlert } from '@/types/ads';
import type { KMPoint } from '@/lib/utils/creative-survival';
import { getSurvivalAt } from '@/lib/utils/creative-survival';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertType =
    | 'creative_fatigue'
    | 'survival_warning'
    | 'budget_exhaustion'
    | 'frequency_saturation';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertCondition {
    type: AlertType;
    severity: AlertSeverity;
    campaignId?: string;
    adId?: string;
    message: string;
    metric: string;
    currentValue: number;
    threshold: number;
    daysUntilEvent?: number; // para survival/budget
}

// ─── evaluateAlerts ───────────────────────────────────────────────────────────

/**
 * Avalia condições de alerta a partir de métricas de inteligência.
 * Retorna lista de AlertCondition ordenada por severidade (critical → warning → info).
 */
export function evaluateAlerts(
    fatigueScores: CreativeFatigueScore[],
    survivalCurve: KMPoint[],
    kpi: AdsKpiSummary,
    pacingAlerts: BudgetPacingAlert[] = [],
): AlertCondition[] {
    const alerts: AlertCondition[] = [];

    // ── 1. Fadiga Criativa ─────────────────────────────────────────────────
    for (const f of fatigueScores) {
        if (f.level === 'severe') {
            alerts.push({
                type: 'creative_fatigue',
                severity: 'critical',
                adId: f.adId,
                message: `Criativo "${f.adName}" em fadiga severa (score ${f.score.toFixed(2)}) — pausa imediata recomendada.`,
                metric: 'fatigue_score',
                currentValue: f.score,
                threshold: 0.3,
            });
        } else if (f.level === 'moderate') {
            alerts.push({
                type: 'creative_fatigue',
                severity: 'warning',
                adId: f.adId,
                message: `Criativo "${f.adName}" com fadiga moderada (score ${f.score.toFixed(2)}) — monitorar de perto.`,
                metric: 'fatigue_score',
                currentValue: f.score,
                threshold: 0.5,
            });
        }
    }

    // ── 2. Survival Warning — S(7) < 0.4 ──────────────────────────────────
    if (survivalCurve.length > 0) {
        const s7 = getSurvivalAt(survivalCurve, 7);
        if (s7 < 0.4) {
            alerts.push({
                type: 'survival_warning',
                severity: 'warning',
                message: `Apenas ${(s7 * 100).toFixed(0)}% dos criativos sobrevivem 7 dias — renovação acelerada necessária.`,
                metric: 'survival_7d',
                currentValue: s7,
                threshold: 0.4,
                daysUntilEvent: 7,
            });
        }
    }

    // ── 3. Saturação de Frequência ─────────────────────────────────────────
    if (kpi.avgFrequency > 5.0) {
        alerts.push({
            type: 'frequency_saturation',
            severity: 'warning',
            message: `Frequência média ${kpi.avgFrequency.toFixed(2)} — audiência saturada (threshold: 5.0). Expanda o público.`,
            metric: 'avg_frequency',
            currentValue: kpi.avgFrequency,
            threshold: 5.0,
        });
    }

    // ── 4. Budget Exhaustion — via pacing alerts ───────────────────────────
    for (const p of pacingAlerts) {
        if (p.daysUntilExhaustion !== null && p.daysUntilExhaustion <= 3) {
            alerts.push({
                type: 'budget_exhaustion',
                severity: 'critical',
                campaignId: p.campaignId,
                message: `Campanha "${p.campaignName}" esgota budget em ~${Math.ceil(p.daysUntilExhaustion)}d ao ritmo atual.`,
                metric: 'days_until_exhaustion',
                currentValue: p.daysUntilExhaustion,
                threshold: 3,
                daysUntilEvent: Math.ceil(p.daysUntilExhaustion),
            });
        } else if (p.daysUntilExhaustion !== null && p.daysUntilExhaustion <= 7) {
            alerts.push({
                type: 'budget_exhaustion',
                severity: 'warning',
                campaignId: p.campaignId,
                message: `Campanha "${p.campaignName}" esgota budget em ~${Math.ceil(p.daysUntilExhaustion)}d.`,
                metric: 'days_until_exhaustion',
                currentValue: p.daysUntilExhaustion,
                threshold: 7,
                daysUntilEvent: Math.ceil(p.daysUntilExhaustion),
            });
        }
    }

    // Ordenar: critical primeiro, depois warning, depois info
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
