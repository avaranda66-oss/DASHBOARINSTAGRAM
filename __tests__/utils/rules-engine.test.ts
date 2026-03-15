// =============================================================================
// rules-engine.test.ts — Tests for the Automated Rules Engine (US-64)
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  extractCampaignMetrics,
  evaluateCondition,
  evaluateRule,
  simulateRule,
  formatCondition,
  formatAction,
  formatConditionsSummary,
  METRIC_LABELS,
  OPERATOR_LABELS,
  ACTION_LABELS,
} from '@/lib/utils/rules-engine';
import type { RuleCondition, AutomationRule } from '@/types/ads';
import {
  activeCampaign,
  noBudgetCampaign,
  zeroSpendCampaign,
  noInsightsCampaign,
} from '@/__tests__/_fixtures/campaigns';
import { approxEqual, isClean } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// extractCampaignMetrics
// =============================================================================
describe('extractCampaignMetrics', () => {
  it('extracts CPA from activeCampaign (spend / conversions)', () => {
    const m = extractCampaignMetrics(activeCampaign);
    // spend=25.50, conversions=12+5=17 → CPA = 25.50/17 ≈ 1.5
    expect(approxEqual(m.cpa, 25.50 / 17, 0.01)).toBe(true);
  });

  it('extracts ROAS from purchase_roas (omni_purchase)', () => {
    const m = extractCampaignMetrics(activeCampaign);
    expect(m.roas).toBe(3.5);
  });

  it('extracts CTR correctly', () => {
    const m = extractCampaignMetrics(activeCampaign);
    expect(m.ctr).toBe(3.0);
  });

  it('extracts CPC correctly', () => {
    const m = extractCampaignMetrics(activeCampaign);
    expect(approxEqual(m.cpc, 0.0567, 0.001)).toBe(true);
  });

  it('extracts CPM correctly', () => {
    const m = extractCampaignMetrics(activeCampaign);
    expect(m.cpm).toBe(1.70);
  });

  it('extracts frequency correctly', () => {
    const m = extractCampaignMetrics(activeCampaign);
    expect(m.frequency).toBe(2.1);
  });

  it('sums conversions from purchase + lead actions', () => {
    const m = extractCampaignMetrics(activeCampaign);
    // 12 purchases + 5 leads = 17
    expect(m.conversions).toBe(17);
  });

  it('returns all zeros when campaign has no insights', () => {
    const m = extractCampaignMetrics(noInsightsCampaign);
    expect(m.cpa).toBe(0);
    expect(m.roas).toBe(0);
    expect(m.ctr).toBe(0);
    expect(m.cpc).toBe(0);
    expect(m.cpm).toBe(0);
    expect(m.spend).toBe(0);
    expect(m.conversions).toBe(0);
    expect(m.impressions).toBe(0);
    expect(m.frequency).toBe(0);
  });

  it('returns CPA = 0 when no conversion actions exist', () => {
    const m = extractCampaignMetrics(noBudgetCampaign);
    // noBudgetCampaign has no actions array
    expect(m.conversions).toBe(0);
    expect(m.cpa).toBe(0);
  });

  it('all extracted values are clean numbers', () => {
    const m = extractCampaignMetrics(activeCampaign);
    for (const key of Object.keys(m)) {
      expect(isClean(m[key as keyof typeof m])).toBe(true);
    }
  });
});

// =============================================================================
// evaluateCondition
// =============================================================================
describe('evaluateCondition', () => {
  const metrics = { cpa: 10, roas: 3.5, ctr: 2.0, cpc: 0.5, cpm: 5, spend: 100, conversions: 20, impressions: 5000, frequency: 2 };

  it('operator "gt": true when actual > value', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gt', value: 9 }, metrics)).toBe(true);
  });

  it('operator "gt": false when actual === value (boundary)', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gt', value: 10 }, metrics)).toBe(false);
  });

  it('operator "gt": false when actual < value', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gt', value: 11 }, metrics)).toBe(false);
  });

  it('operator "gte": true when actual === value', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gte', value: 10 }, metrics)).toBe(true);
  });

  it('operator "gte": true when actual > value', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gte', value: 9 }, metrics)).toBe(true);
  });

  it('operator "gte": false when actual < value', () => {
    expect(evaluateCondition({ metric: 'cpa', operator: 'gte', value: 11 }, metrics)).toBe(false);
  });

  it('operator "lt": true when actual < value', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'lt', value: 4 }, metrics)).toBe(true);
  });

  it('operator "lt": false when actual === value (boundary)', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'lt', value: 3.5 }, metrics)).toBe(false);
  });

  it('operator "lte": true when actual === value', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'lte', value: 3.5 }, metrics)).toBe(true);
  });

  it('operator "lte": false when actual > value', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'lte', value: 3 }, metrics)).toBe(false);
  });

  it('operator "eq": true when actual ≈ value (within 0.001)', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'eq', value: 3.5 }, metrics)).toBe(true);
    expect(evaluateCondition({ metric: 'roas', operator: 'eq', value: 3.5005 }, metrics)).toBe(true);
  });

  it('operator "eq": false when actual differs significantly', () => {
    expect(evaluateCondition({ metric: 'roas', operator: 'eq', value: 3.6 }, metrics)).toBe(false);
  });

  it('defaults to 0 for missing metric', () => {
    const sparse = { cpa: 5 } as any;
    expect(evaluateCondition({ metric: 'roas', operator: 'gt', value: -1 }, sparse)).toBe(true);
  });
});

// =============================================================================
// evaluateRule
// =============================================================================
describe('evaluateRule', () => {
  const makeRule = (conditions: RuleCondition[]): AutomationRule => ({
    id: 'rule_test',
    name: 'Test Rule',
    conditions,
    action: 'notify',
    targetCampaignIds: 'all',
    enabled: true,
  });

  it('returns false for empty conditions', () => {
    const rule = makeRule([]);
    expect(evaluateRule(rule, activeCampaign)).toBe(false);
  });

  it('returns true when all conditions match', () => {
    const rule = makeRule([
      { metric: 'roas', operator: 'gte', value: 3 },
      { metric: 'ctr', operator: 'gt', value: 2 },
    ]);
    expect(evaluateRule(rule, activeCampaign)).toBe(true);
  });

  it('returns false when one condition fails (AND logic)', () => {
    const rule = makeRule([
      { metric: 'roas', operator: 'gte', value: 3 },
      { metric: 'ctr', operator: 'gt', value: 100 }, // impossible
    ]);
    expect(evaluateRule(rule, activeCampaign)).toBe(false);
  });

  it('works with noInsightsCampaign (all metrics = 0)', () => {
    const rule = makeRule([{ metric: 'spend', operator: 'gt', value: 0 }]);
    expect(evaluateRule(rule, noInsightsCampaign)).toBe(false);
  });
});

// =============================================================================
// simulateRule
// =============================================================================
describe('simulateRule', () => {
  it('matches all campaigns when targetCampaignIds = "all"', () => {
    const rule: AutomationRule = {
      id: 'rule_sim',
      name: 'Sim Rule',
      conditions: [{ metric: 'spend', operator: 'gt', value: 0 }],
      action: 'notify',
      targetCampaignIds: 'all',
      enabled: true,
    };
    const campaigns = [activeCampaign, zeroSpendCampaign, noInsightsCampaign];
    const result = simulateRule(rule, campaigns);

    expect(result.matchedCampaigns.length).toBe(3);
    expect(result.ruleId).toBe('rule_sim');
    expect(result.ruleName).toBe('Sim Rule');
  });

  it('filters campaigns by targetCampaignIds', () => {
    const rule: AutomationRule = {
      id: 'rule_filter',
      name: 'Filter Rule',
      conditions: [{ metric: 'spend', operator: 'gt', value: 0 }],
      action: 'pause_campaign',
      targetCampaignIds: ['camp_001'],
      enabled: true,
    };

    const result = simulateRule(rule, [activeCampaign, zeroSpendCampaign]);
    expect(result.matchedCampaigns.length).toBe(1);
    expect(result.matchedCampaigns[0].campaignId).toBe('camp_001');
  });

  it('wouldTrigger matches manual evaluateRule result', () => {
    const rule: AutomationRule = {
      id: 'rule_verify',
      name: 'Verify Rule',
      conditions: [{ metric: 'roas', operator: 'gte', value: 3 }],
      action: 'increase_budget',
      actionValue: 20,
      targetCampaignIds: 'all',
      enabled: true,
    };

    const campaigns = [activeCampaign, noBudgetCampaign, zeroSpendCampaign];
    const simResult = simulateRule(rule, campaigns);

    for (const match of simResult.matchedCampaigns) {
      const campaign = campaigns.find(c => c.id === match.campaignId)!;
      const expected = evaluateRule(rule, campaign);
      expect(match.wouldTrigger).toBe(expected);
    }
  });

  it('projectedAction shows formatted action when triggered', () => {
    const rule: AutomationRule = {
      id: 'rule_action',
      name: 'Action Rule',
      conditions: [{ metric: 'spend', operator: 'gt', value: 0 }],
      action: 'increase_budget',
      actionValue: 15,
      targetCampaignIds: 'all',
      enabled: true,
    };

    const result = simulateRule(rule, [activeCampaign]);
    const match = result.matchedCampaigns[0];
    expect(match.wouldTrigger).toBe(true);
    expect(match.projectedAction).toContain('15%');
  });
});

// =============================================================================
// Formatters
// =============================================================================
describe('formatCondition', () => {
  it('produces a readable string', () => {
    const c: RuleCondition = { metric: 'cpa', operator: 'gt', value: 50 };
    expect(formatCondition(c)).toBe('CPA > 50');
  });

  it('uses correct operator labels', () => {
    expect(formatCondition({ metric: 'roas', operator: 'gte', value: 3 })).toBe('ROAS ≥ 3');
    expect(formatCondition({ metric: 'ctr', operator: 'lt', value: 1 })).toBe('CTR < 1');
    expect(formatCondition({ metric: 'cpc', operator: 'lte', value: 0.5 })).toBe('CPC ≤ 0.5');
    expect(formatCondition({ metric: 'spend', operator: 'eq', value: 100 })).toBe('Gasto = 100');
  });
});

describe('formatAction', () => {
  it('returns label for simple actions', () => {
    expect(formatAction('pause_campaign')).toBe('Pausar campanha');
    expect(formatAction('notify')).toBe('Notificar');
  });

  it('appends percentage for budget actions', () => {
    expect(formatAction('increase_budget', 20)).toBe('Aumentar budget 20%');
    expect(formatAction('decrease_budget', 10)).toBe('Diminuir budget 10%');
  });

  it('omits percentage when value is undefined', () => {
    expect(formatAction('increase_budget')).toBe('Aumentar budget');
  });
});

describe('formatConditionsSummary', () => {
  it('joins multiple conditions with " E "', () => {
    const conditions: RuleCondition[] = [
      { metric: 'cpa', operator: 'gt', value: 50 },
      { metric: 'roas', operator: 'lt', value: 2 },
    ];
    expect(formatConditionsSummary(conditions)).toBe('CPA > 50 E ROAS < 2');
  });

  it('returns single condition without separator', () => {
    const conditions: RuleCondition[] = [
      { metric: 'ctr', operator: 'gte', value: 3 },
    ];
    expect(formatConditionsSummary(conditions)).toBe('CTR ≥ 3');
  });

  it('returns empty string for empty conditions array', () => {
    expect(formatConditionsSummary([])).toBe('');
  });
});
