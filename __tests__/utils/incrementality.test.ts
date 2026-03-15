import { describe, it, expect } from 'vitest';
import {
  fitITS,
  welchTTest,
  bootstrapDiffMeans,
  requiredDaysForLift,
  minimumDetectableEffect,
} from '@/lib/utils/incrementality';
import { generateLevelShift } from '@/__tests__/_fixtures/time-series';

// ─── fitITS (Interrupted Time Series) ────────────────────────────────────────

describe('fitITS', () => {
  it('detects known level shift (beta2)', () => {
    const data = generateLevelShift(50, 25, 20);
    const result = fitITS(data, 25);

    // beta2 should be close to 20 (the injected level shift)
    expect(result.beta[2]).toBeGreaterThan(10); // at least half the shift
    expect(result.beta[2]).toBeLessThan(30); // not more than 1.5x
    expect(result.rSquared).toBeGreaterThan(0.5); // good fit
  });

  it('beta has 4 coefficients [b0, b1, b2, b3]', () => {
    const data = generateLevelShift(40, 20, 10);
    const result = fitITS(data, 20);

    expect(result.beta).toHaveLength(4);
    result.beta.forEach(b => {
      expect(isFinite(b)).toBe(true);
    });
  });

  it('residuals have same length as data', () => {
    const data = generateLevelShift(30, 15, 10);
    const result = fitITS(data, 15);

    expect(result.residuals).toHaveLength(data.length);
  });

  it('causalEffects has length = post-intervention period', () => {
    const data = generateLevelShift(40, 20, 10);
    const result = fitITS(data, 20);

    expect(result.causalEffects).toHaveLength(20); // 40 - 20
  });

  it('cumulativeEffect is sum of causalEffects (rounded to 2 decimals)', () => {
    const data = generateLevelShift(40, 20, 15);
    const result = fitITS(data, 20);

    const expectedSum = result.causalEffects.reduce((a, b) => a + b, 0);
    // cumulativeEffect rounds to 2 decimal places, causalEffects round to 4
    expect(result.cumulativeEffect).toBeCloseTo(expectedSum, 1);
  });

  it('R² is between 0 and 1', () => {
    const data = generateLevelShift(40, 20, 10);
    const result = fitITS(data, 20);

    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });

  it('sigma2 is positive', () => {
    const data = generateLevelShift(40, 20, 10);
    const result = fitITS(data, 20);

    expect(result.sigma2).toBeGreaterThan(0);
  });

  it('no level shift → beta2 near zero', () => {
    // Constant data, no shift
    const data = Array.from({ length: 40 }, () => 50);
    const result = fitITS(data, 20);

    expect(Math.abs(result.beta[2])).toBeLessThan(1);
  });

  it('stores interventionIndex correctly', () => {
    const data = generateLevelShift(40, 20, 10);
    const result = fitITS(data, 20);
    expect(result.interventionIndex).toBe(20);
  });
});

// ─── welchTTest ──────────────────────────────────────────────────────────────

describe('welchTTest', () => {
  it('detects significant difference between two groups', () => {
    const group1 = [10, 12, 11, 13, 10, 12, 11, 14, 10, 13];
    const group2 = [20, 22, 21, 23, 20, 22, 21, 24, 20, 23];
    const result = welchTTest(group1, group2);

    expect(result.pValue).toBeLessThan(0.05);
    expect(result.significant).toBe(true);
    expect(result.t).toBeLessThan(0); // group1 < group2
  });

  it('returns not significant for similar groups', () => {
    const group1 = [10, 11, 12, 10, 11, 12, 10, 11];
    const group2 = [10, 11, 12, 10, 11, 12, 11, 10];
    const result = welchTTest(group1, group2);

    expect(result.pValue).toBeGreaterThan(0.05);
    expect(result.significant).toBe(false);
  });

  it('t statistic is finite', () => {
    const result = welchTTest([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    expect(isFinite(result.t)).toBe(true);
  });

  it('degrees of freedom is positive', () => {
    const result = welchTTest([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    expect(result.df).toBeGreaterThan(0);
  });

  it('p-value is between 0 and 1', () => {
    const result = welchTTest([1, 2, 3, 4], [5, 6, 7, 8]);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

// ─── bootstrapDiffMeans ──────────────────────────────────────────────────────

describe('bootstrapDiffMeans', () => {
  it('CI contains true difference for known shifted groups', () => {
    const group1 = [10, 11, 12, 10, 11, 12, 10, 11, 12, 10];
    const group2 = [20, 21, 22, 20, 21, 22, 20, 21, 22, 20];
    const result = bootstrapDiffMeans(group1, group2);

    // True diff is about -10
    expect(result.lower).toBeLessThan(-5);
    expect(result.upper).toBeLessThan(0);
    expect(result.point).toBeLessThan(-5);
  });

  it('returns valid bootstrap result structure', () => {
    const result = bootstrapDiffMeans([1, 2, 3], [4, 5, 6]);
    expect(result).toHaveProperty('lower');
    expect(result).toHaveProperty('upper');
    expect(result).toHaveProperty('point');
    expect(result.lower).toBeLessThanOrEqual(result.upper);
  });
});

// ─── requiredDaysForLift ─────────────────────────────────────────────────────

describe('requiredDaysForLift', () => {
  it('returns MDEResult with positive daysPerGroup', () => {
    // Signature: requiredDaysForLift(lift, mu, sigma, alpha?, power?)
    const result = requiredDaysForLift(0.10, 100, 20);
    expect(result.daysPerGroup).toBeGreaterThan(0);
    expect(isFinite(result.daysPerGroup)).toBe(true);
    expect(result.mdePercent).toBeCloseTo(10, 0); // 0.10 * 100 = 10%
  });

  it('more days needed for smaller lift', () => {
    const result5pct = requiredDaysForLift(0.05, 100, 20);
    const result10pct = requiredDaysForLift(0.10, 100, 20);
    expect(result5pct.daysPerGroup).toBeGreaterThan(result10pct.daysPerGroup);
  });
});

// ─── minimumDetectableEffect ─────────────────────────────────────────────────

describe('minimumDetectableEffect', () => {
  it('returns MDEResult with positive mdePercent', () => {
    // Signature: minimumDetectableEffect(daysPerGroup, mu, sigma, alpha?, power?)
    const result = minimumDetectableEffect(30, 100, 20);
    expect(result.mdePercent).toBeGreaterThan(0);
    expect(isFinite(result.mdePercent)).toBe(true);
    expect(result.daysPerGroup).toBe(30);
  });

  it('MDE decreases as daysPerGroup increases (same mu/sigma)', () => {
    const mde14 = minimumDetectableEffect(14, 100, 20);
    const mde30 = minimumDetectableEffect(30, 100, 20);
    const mde90 = minimumDetectableEffect(90, 100, 20);

    expect(mde14.mdePercent).toBeGreaterThan(mde30.mdePercent);
    expect(mde30.mdePercent).toBeGreaterThan(mde90.mdePercent);
  });

  it('mdePercent is positive for reasonable inputs', () => {
    const result = minimumDetectableEffect(30, 100, 20);
    expect(result.mdePercent).toBeGreaterThan(0);
  });
});
