// ─── Automated Rules Engine (US-64) ──────────────────────────────────────────
// Pure evaluation logic — zero side effects.
// Actions are executed externally (store calls ads-actions API).

import type {
    AdCampaign, RuleCondition, AutomationRule, RuleMetric,
    RuleOperator, RuleAction, RuleSimulationResult,
} from '@/types/ads';

// ─── Metric Extraction ──────────────────────────────────────────────────────

/** Extract a flat Record<RuleMetric, number> from campaign insights */
export function extractCampaignMetrics(campaign: AdCampaign): Record<RuleMetric, number> {
    const i = campaign.insights;
    if (!i) {
        return { cpa: 0, roas: 0, ctr: 0, cpc: 0, cpm: 0, spend: 0, conversions: 0, impressions: 0, frequency: 0 };
    }

    const spend = parseFloat(i.spend) || 0;
    const impressions = parseInt(i.impressions) || 0;
    const clicks = parseInt(i.clicks) || 0;
    const ctr = parseFloat(i.ctr || '0') || 0;
    const cpc = parseFloat(i.cpc || '0') || 0;
    const cpm = parseFloat(i.cpm || '0') || 0;
    const frequency = parseFloat(i.frequency || '0') || 0;

    // Conversions: sum of purchase + lead types
    let conversions = 0;
    if (i.actions) {
        const convTypes = new Set([
            'offsite_conversion.fb_pixel_purchase',
            'offsite_conversion.fb_pixel_lead',
            'offsite_conversion.fb_pixel_complete_registration',
            'lead',
        ]);
        for (const a of i.actions) {
            if (convTypes.has(a.action_type)) conversions += parseInt(a.value) || 0;
        }
    }

    // ROAS: prioritize omni_purchase, fallback to first entry
    let roas = 0;
    if (i.purchase_roas && i.purchase_roas.length > 0) {
        const omni = i.purchase_roas.find(r => r.action_type === 'omni_purchase');
        roas = parseFloat((omni || i.purchase_roas[0]).value) || 0;
    }

    const cpa = conversions > 0 ? spend / conversions : 0;

    return { cpa, roas, ctr, cpc, cpm, spend, conversions, impressions, frequency };
}

// ─── Condition Evaluation ────────────────────────────────────────────────────

export function evaluateCondition(condition: RuleCondition, metrics: Record<RuleMetric, number>): boolean {
    const actual = metrics[condition.metric] ?? 0;
    switch (condition.operator) {
        case 'gt': return actual > condition.value;
        case 'gte': return actual >= condition.value;
        case 'lt': return actual < condition.value;
        case 'lte': return actual <= condition.value;
        case 'eq': return Math.abs(actual - condition.value) < 0.001;
        default: return false;
    }
}

/** Evaluate all conditions (AND logic). Returns true if ALL conditions match. */
export function evaluateRule(rule: AutomationRule, campaign: AdCampaign): boolean {
    if (rule.conditions.length === 0) return false;
    const metrics = extractCampaignMetrics(campaign);
    return rule.conditions.every(c => evaluateCondition(c, metrics));
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export function simulateRule(rule: AutomationRule, campaigns: AdCampaign[]): RuleSimulationResult {
    const targets = rule.targetCampaignIds === 'all'
        ? campaigns
        : campaigns.filter(c => (rule.targetCampaignIds as string[]).includes(c.id));

    return {
        ruleId: rule.id,
        ruleName: rule.name,
        matchedCampaigns: targets.map(c => {
            const metrics = extractCampaignMetrics(c);
            const wouldTrigger = rule.conditions.every(cond => evaluateCondition(cond, metrics));
            return {
                campaignId: c.id,
                campaignName: c.name,
                currentValues: metrics as unknown as Record<string, number>,
                wouldTrigger,
                projectedAction: wouldTrigger ? formatAction(rule.action, rule.actionValue) : '—',
            };
        }),
    };
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<RuleMetric, string> = {
    cpa: 'CPA', roas: 'ROAS', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM',
    spend: 'Gasto', conversions: 'Conversões', impressions: 'Impressões', frequency: 'Frequência',
};

const OPERATOR_LABELS: Record<RuleOperator, string> = {
    gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=',
};

const ACTION_LABELS: Record<RuleAction, string> = {
    pause_campaign: 'Pausar campanha',
    increase_budget: 'Aumentar budget',
    decrease_budget: 'Diminuir budget',
    notify: 'Notificar',
};

export function formatCondition(c: RuleCondition): string {
    return `${METRIC_LABELS[c.metric]} ${OPERATOR_LABELS[c.operator]} ${c.value}`;
}

export function formatAction(action: RuleAction, value?: number): string {
    const label = ACTION_LABELS[action];
    if ((action === 'increase_budget' || action === 'decrease_budget') && value) {
        return `${label} ${value}%`;
    }
    return label;
}

export function formatConditionsSummary(conditions: RuleCondition[]): string {
    return conditions.map(formatCondition).join(' E ');
}

export { METRIC_LABELS, OPERATOR_LABELS, ACTION_LABELS };
