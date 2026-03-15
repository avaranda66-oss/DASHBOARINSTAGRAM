// =============================================================================
// advanced-indicators.test.ts — Tests for advertising elasticity & creative half-life
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  advertisingElasticity,
  creativeHalfLife,
  diminishingReturns,
} from '@/lib/utils/advanced-indicators';
import { approxEqual, isClean, withinRange } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// advertisingElasticity
// =============================================================================
describe('advertisingElasticity', () => {
  it('recovers known elasticity from synthetic log-log data', () => {
    // revenue = 10 * spend^0.7  →  log(revenue) = log(10) + 0.7*log(spend)
    const spend = [100, 200, 400, 800, 1600, 3200];
    const revenue = spend.map(s => 10 * Math.pow(s, 0.7));

    const result = advertisingElasticity(spend, revenue);

    expect(approxEqual(result.elasticity, 0.7, 0.05)).toBe(true);
    expect(result.rSquared).toBeGreaterThan(0.95);
    expect(result.confidence).toBe('high');
  });

  it('returns "diminishing returns" interpretation when elasticity < 1', () => {
    // revenue = spend^0.4 → elasticity ~0.4 → strongly diminishing
    const spend = [50, 100, 200, 400, 800];
    const revenue = spend.map(s => Math.pow(s, 0.4));

    const result = advertisingElasticity(spend, revenue);

    expect(result.elasticity).toBeLessThan(1);
    expect(result.elasticity).toBeGreaterThan(0);
    // elasticity < 0.5 → "fortemente decrescentes"
    expect(result.interpretation).toContain('decrescentes');
  });

  it('returns "increasing returns" when elasticity > 1', () => {
    // revenue = spend^1.5 → elasticity ~1.5
    const spend = [10, 20, 40, 80, 160];
    const revenue = spend.map(s => Math.pow(s, 1.5));

    const result = advertisingElasticity(spend, revenue);

    expect(result.elasticity).toBeGreaterThan(1);
    expect(result.interpretation).toContain('crescentes');
  });

  it('returns insufficient data for fewer than 3 points', () => {
    const result = advertisingElasticity([100, 200], [50, 100]);

    expect(result.elasticity).toBe(0);
    expect(result.rSquared).toBe(0);
    expect(result.confidence).toBe('low');
    expect(result.interpretation).toContain('insuficientes');
  });

  it('returns insufficient data when arrays have different lengths', () => {
    const result = advertisingElasticity([100, 200, 300], [50, 100]);

    expect(result.elasticity).toBe(0);
    expect(result.confidence).toBe('low');
  });

  it('filters out zero and negative values gracefully', () => {
    // Include zeros — should be filtered, leaving fewer valid pairs
    const spend = [0, 100, 200, 0, 400, 800];
    const revenue = [0, 50, 80, 0, 130, 200];

    const result = advertisingElasticity(spend, revenue);

    // Should still compute from the 4 valid pairs
    expect(isClean(result.elasticity)).toBe(true);
    expect(isClean(result.rSquared)).toBe(true);
  });

  it('returns insufficient when all values are zero', () => {
    const result = advertisingElasticity([0, 0, 0, 0], [0, 0, 0, 0]);

    expect(result.elasticity).toBe(0);
    expect(result.confidence).toBe('low');
  });

  it('assigns confidence based on rSquared thresholds', () => {
    // Perfect linear log-log → high confidence
    const spend = [10, 100, 1000, 10000, 100000];
    const revenue = spend.map(s => 5 * Math.pow(s, 0.8));

    const result = advertisingElasticity(spend, revenue);

    expect(result.confidence).toBe('high');
    expect(result.rSquared).toBeGreaterThanOrEqual(0.7);
  });

  it('detects negative elasticity when spending hurts revenue', () => {
    // Construct data where more spend → less revenue
    const spend = [100, 200, 400, 800, 1600];
    const revenue = [500, 400, 300, 200, 100];

    const result = advertisingElasticity(spend, revenue);

    expect(result.elasticity).toBeLessThan(0);
    expect(result.interpretation).toContain('prejudicando');
  });
});

// =============================================================================
// creativeHalfLife
// =============================================================================
describe('creativeHalfLife', () => {
  it('recovers known half-life from exponential decay within 20%', () => {
    // CTR(t) = 5 * e^(-0.1 * t) → halfLife = ln(2)/0.1 ≈ 6.93
    const expectedHalfLife = Math.log(2) / 0.1;
    const dailyCTRs = Array.from({ length: 20 }, (_, t) => 5 * Math.exp(-0.1 * t));

    const result = creativeHalfLife(dailyCTRs);

    expect(result.halfLife).not.toBe(Infinity);
    expect(approxEqual(result.halfLife, expectedHalfLife, expectedHalfLife * 0.2)).toBe(true);
    expect(result.lambda).toBeGreaterThan(0);
    expect(result.daysAnalyzed).toBe(20);
  });

  it('returns Infinity half-life for flat CTRs (no decay)', () => {
    const flatCTRs = Array(15).fill(3.5);

    const result = creativeHalfLife(flatCTRs);

    expect(result.halfLife).toBe(Infinity);
    expect(result.lambda).toBeLessThanOrEqual(0);
    expect(result.decayRate).toContain('Sem decaimento');
  });

  it('returns Infinity half-life for increasing CTRs', () => {
    // CTR going up → lambda should be <= 0
    const risingCTRs = Array.from({ length: 10 }, (_, t) => 2 + t * 0.3);

    const result = creativeHalfLife(risingCTRs);

    expect(result.halfLife).toBe(Infinity);
  });

  it('classifies fast decay (halfLife < 3 days)', () => {
    // lambda = 0.5 → halfLife = ln(2)/0.5 ≈ 1.39
    const fastDecay = Array.from({ length: 10 }, (_, t) => 4 * Math.exp(-0.5 * t));

    const result = creativeHalfLife(fastDecay);

    expect(result.halfLife).toBeLessThan(3);
    expect(result.decayRate).toContain('rapido');
  });

  it('classifies slow decay (halfLife > 14 days)', () => {
    // lambda = 0.03 → halfLife = ln(2)/0.03 ≈ 23.1
    const slowDecay = Array.from({ length: 30 }, (_, t) => 3 * Math.exp(-0.03 * t));

    const result = creativeHalfLife(slowDecay);

    expect(result.halfLife).toBeGreaterThan(14);
    expect(result.decayRate).toContain('durabilidade');
  });

  it('returns insufficient data for fewer than 3 positive values', () => {
    const result = creativeHalfLife([2.5, 2.0]);

    expect(result.halfLife).toBe(Infinity);
    expect(result.lambda).toBe(0);
    expect(result.decayRate).toContain('insuficientes');
  });

  it('filters zeros and handles them gracefully', () => {
    // Include zeros in the middle
    const ctrs = [5, 4.5, 0, 0, 4.0, 3.5, 3.0, 0, 2.5, 2.0];

    const result = creativeHalfLife(ctrs);

    // After filtering zeros, should have 7 valid points
    expect(result.daysAnalyzed).toBe(7);
    expect(isClean(result.halfLife) || result.halfLife === Infinity).toBe(true);
  });

  it('handles all-zero array', () => {
    const result = creativeHalfLife([0, 0, 0, 0, 0]);

    expect(result.halfLife).toBe(Infinity);
    expect(result.daysAnalyzed).toBe(0);
  });

  it('returns rounded values', () => {
    const ctrs = Array.from({ length: 10 }, (_, t) => 5 * Math.exp(-0.15 * t));
    const result = creativeHalfLife(ctrs);

    // halfLife rounded to 2 decimals, lambda to 4 decimals
    if (result.halfLife !== Infinity) {
      const decimals = result.halfLife.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});

// =============================================================================
// diminishingReturns
// =============================================================================
describe('diminishingReturns', () => {
  it('returns insufficient data for fewer than 3 points', () => {
    const result = diminishingReturns([100, 200], [50, 80]);

    expect(result.Vmax).toBe(0);
    expect(result.interpretation).toContain('insuficientes');
  });

  it('returns clean numeric values for valid Michaelis-Menten data', () => {
    // result = (100 * spend) / (500 + spend) → Vmax=100, Km=500
    const spend = [100, 200, 500, 1000, 2000, 5000];
    const result_arr = spend.map(s => (100 * s) / (500 + s));

    const result = diminishingReturns(spend, result_arr);

    expect(isClean(result.Vmax)).toBe(true);
    expect(isClean(result.Km)).toBe(true);
    expect(withinRange(result.saturationPercent, 0, 100)).toBe(true);
  });

  it('filters out zero values', () => {
    const spend = [0, 100, 200, 0, 500, 1000];
    const results = [0, 16.7, 28.6, 0, 50, 66.7];

    const result = diminishingReturns(spend, results);

    expect(isClean(result.Vmax) || result.Vmax === 0).toBe(true);
  });
});
