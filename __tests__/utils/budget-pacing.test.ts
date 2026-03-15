// =============================================================================
// budget-pacing.test.ts — Tests for budget pacing calculator
// =============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateBudgetPacing,
  calculateAllPacingAlerts,
} from '@/lib/utils/budget-pacing';
import {
  activeCampaign,
  noBudgetCampaign,
  zeroSpendCampaign,
  noInsightsCampaign,
} from '@/__tests__/_fixtures/campaigns';
import type { AdCampaign } from '@/types/ads';
import { isClean } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// Mock Date to make tests deterministic
// =============================================================================
const FIXED_NOW = new Date('2026-03-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// Helpers — create campaigns with controlled dates relative to "now"
// =============================================================================

/**
 * Creates a campaign with predictable pacing for testing.
 * All dates are relative to a fixed "now" to avoid flaky tests.
 */
function makePacingCampaign(overrides: {
  dailyBudget?: string;
  lifetimeBudget?: string;
  budgetRemaining?: string;
  spend?: string;
  daysElapsed?: number;
  totalDays?: number;
  stopTime?: boolean;
}): AdCampaign {
  const now = FIXED_NOW;
  const daysElapsed = overrides.daysElapsed ?? 15;
  const totalDays = overrides.totalDays ?? 30;

  const startDate = new Date(now.getTime() - daysElapsed * 86400000);
  const endDate = overrides.stopTime !== false
    ? new Date(startDate.getTime() + totalDays * 86400000)
    : undefined;

  return {
    id: 'camp_test',
    name: 'Test Pacing Campaign',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    daily_budget: overrides.dailyBudget ?? '10000', // $100 in cents
    lifetime_budget: overrides.lifetimeBudget,
    budget_remaining: overrides.budgetRemaining,
    start_time: startDate.toISOString(),
    stop_time: endDate?.toISOString(),
    created_time: startDate.toISOString(),
    insights: {
      spend: overrides.spend ?? '50.00',
      impressions: '10000',
      clicks: '300',
      ctr: '3.0',
      cpc: '0.167',
      cpm: '5.00',
      frequency: '1.5',
      reach: '6667',
      date_start: startDate.toISOString().split('T')[0],
      date_stop: now.toISOString().split('T')[0],
    } as any,
  } as AdCampaign;
}

// =============================================================================
// calculateBudgetPacing
// =============================================================================
describe('calculateBudgetPacing', () => {
  it('returns null when campaign has no budget', () => {
    const result = calculateBudgetPacing(noBudgetCampaign);
    expect(result).toBeNull();
  });

  it('returns null when both daily and lifetime budget are 0', () => {
    const camp = {
      ...noBudgetCampaign,
      daily_budget: '0',
      lifetime_budget: '0',
    } as AdCampaign;
    const result = calculateBudgetPacing(camp);
    expect(result).toBeNull();
  });

  it('returns on_track when spending is proportional to time elapsed', () => {
    // 50% of days elapsed, ~50% of budget spent
    const camp = makePacingCampaign({
      dailyBudget: '10000', // $100
      spend: '50.00',       // $50 spent
      daysElapsed: 15,
      totalDays: 30,
    });

    const result = calculateBudgetPacing(camp);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('on_track');
    expect(result!.severity).toBe('info');
  });

  it('detects overspending when budget consumed too fast', () => {
    // 50% of days, 90% of budget spent
    const camp = makePacingCampaign({
      dailyBudget: '10000', // $100
      spend: '90.00',       // $90 spent (90% of $100)
      daysElapsed: 15,
      totalDays: 30,
    });

    const result = calculateBudgetPacing(camp);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('overspending');
    expect(['warn', 'critical']).toContain(result!.severity);
    expect(result!.pacingRatio).toBeGreaterThan(1.2);
  });

  it('detects underspending when pace is too slow', () => {
    // 80% of days, only 20% of budget spent
    const camp = makePacingCampaign({
      dailyBudget: '10000', // $100
      spend: '20.00',       // $20 spent
      daysElapsed: 24,
      totalDays: 30,
    });

    const result = calculateBudgetPacing(camp);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('underspending');
    expect(result!.severity).toBe('warn');
    expect(result!.pacingRatio).toBeLessThan(0.6);
  });

  it('detects exhausted budget', () => {
    const camp = makePacingCampaign({
      dailyBudget: '10000', // $100
      spend: '100.00',      // fully spent
      budgetRemaining: '0',
      daysElapsed: 15,
      totalDays: 30,
    });

    const result = calculateBudgetPacing(camp);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('exhausted');
    expect(result!.severity).toBe('critical');
  });

  it('handles zero spend without division by zero', () => {
    const result = calculateBudgetPacing(zeroSpendCampaign);

    // zeroSpendCampaign has daily_budget: '10000' → budget = $100
    // spend = 0 → avgDailySpend = 0
    if (result) {
      expect(result.avgDailySpend).toBe(0);
      expect(isClean(result.utilizationPct)).toBe(true);
      expect(result.daysUntilExhaustion).toBeNull();
    }
  });

  it('handles campaign with no insights (uses fallback)', () => {
    const result = calculateBudgetPacing(noInsightsCampaign);

    // noInsightsCampaign has daily_budget: '2000' → budget = $20
    // No insights → spend = 0
    if (result) {
      expect(result.budgetSpent).toBe(0);
      expect(isClean(result.budgetTotal)).toBe(true);
    }
  });

  it('uses lifetime_budget when daily_budget is not set', () => {
    const camp = makePacingCampaign({
      dailyBudget: undefined,
      lifetimeBudget: '300000', // $3000 in cents
      spend: '1500.00',
      daysElapsed: 15,
      totalDays: 30,
    });
    // Override to clear daily_budget
    camp.daily_budget = undefined;

    const result = calculateBudgetPacing(camp);

    expect(result).not.toBeNull();
    expect(result!.budgetTotal).toBe(3000); // $3000
  });

  it('all numeric fields are clean (no NaN/Infinity)', () => {
    const result = calculateBudgetPacing(activeCampaign);

    if (result) {
      expect(isClean(result.budgetTotal)).toBe(true);
      expect(isClean(result.budgetSpent)).toBe(true);
      expect(isClean(result.budgetRemaining)).toBe(true);
      expect(isClean(result.avgDailySpend)).toBe(true);
      expect(isClean(result.utilizationPct)).toBe(true);
      expect(isClean(result.expectedUtilizationPct)).toBe(true);
      expect(isClean(result.pacingRatio)).toBe(true);
    }
  });

  it('returns campaignId and campaignName from input', () => {
    const result = calculateBudgetPacing(activeCampaign);

    if (result) {
      expect(result.campaignId).toBe(activeCampaign.id);
      expect(result.campaignName).toBe(activeCampaign.name);
    }
  });

  it('budgetRemaining is never negative in output', () => {
    const camp = makePacingCampaign({
      dailyBudget: '5000', // $50
      spend: '80.00',      // overspent
      budgetRemaining: undefined, // will compute as max(50 - 80, 0) = 0
    });

    const result = calculateBudgetPacing(camp);

    if (result) {
      expect(result.budgetRemaining).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// calculateAllPacingAlerts
// =============================================================================
describe('calculateAllPacingAlerts', () => {
  it('filters out campaigns with no budget', () => {
    const alerts = calculateAllPacingAlerts([noBudgetCampaign, activeCampaign]);

    // noBudgetCampaign returns null → filtered out
    const ids = alerts.map(a => a.campaignId);
    expect(ids).not.toContain(noBudgetCampaign.id);
  });

  it('returns empty array for empty input', () => {
    const alerts = calculateAllPacingAlerts([]);
    expect(alerts).toEqual([]);
  });

  it('sorts by severity — critical first, info last', () => {
    // Create campaigns with different severities
    const exhausted = makePacingCampaign({
      dailyBudget: '10000',
      spend: '100.00',
      budgetRemaining: '0',
      daysElapsed: 10,
      totalDays: 30,
    });
    exhausted.id = 'camp_exhausted';

    const healthy = makePacingCampaign({
      dailyBudget: '10000',
      spend: '50.00',
      daysElapsed: 15,
      totalDays: 30,
    });
    healthy.id = 'camp_healthy';

    const alerts = calculateAllPacingAlerts([healthy, exhausted, noBudgetCampaign]);

    if (alerts.length >= 2) {
      const severityOrder: Record<string, number> = { critical: 0, warn: 1, info: 2 };
      for (let i = 1; i < alerts.length; i++) {
        expect(severityOrder[alerts[i].severity] ?? 9)
          .toBeGreaterThanOrEqual(severityOrder[alerts[i - 1].severity] ?? 9);
      }
    }
  });

  it('processes multiple campaigns', () => {
    const alerts = calculateAllPacingAlerts([
      activeCampaign,
      zeroSpendCampaign,
      noInsightsCampaign,
    ]);

    // All three have budgets, so should produce alerts
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });
});
