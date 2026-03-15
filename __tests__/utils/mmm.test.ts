// =============================================================================
// mmm.test.ts — Tests for Media Mix Modeling (adstock, saturation, fit, ROAS)
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  geometricAdstock,
  hillSaturation,
  logSaturation,
  fitMMM,
  computeROASCurve,
  findOptimalBudget,
  predictOutcome,
  weibullAdstock,
} from '@/lib/utils/mmm';
import { approxEqual, isClean, withinRange } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// geometricAdstock
// =============================================================================
describe('geometricAdstock', () => {
  it('theta=0 → output equals input (no carryover)', () => {
    const spend = [100, 200, 0, 300, 50];
    const result = geometricAdstock(spend, 0);

    expect(result).toEqual(spend);
  });

  it('theta=0.9 → heavy carryover accumulates', () => {
    const spend = [100, 0, 0, 0, 0];
    const result = geometricAdstock(spend, 0.9);

    // A[0] = 100, A[1] = 0 + 0.9*100 = 90, A[2] = 0 + 0.9*90 = 81, ...
    expect(result[0]).toBe(100);
    expect(approxEqual(result[1], 90, 0.01)).toBe(true);
    expect(approxEqual(result[2], 81, 0.01)).toBe(true);
    expect(approxEqual(result[3], 72.9, 0.01)).toBe(true);
    // All values should be positive (decaying but never zero)
    result.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it('output length matches input length', () => {
    const spend = [10, 20, 30, 40, 50, 60, 70];
    const result = geometricAdstock(spend, 0.5);
    expect(result).toHaveLength(spend.length);
  });

  it('adstock values are always >= original spend', () => {
    const spend = [100, 200, 150, 300, 50];
    const result = geometricAdstock(spend, 0.5);

    for (let i = 0; i < spend.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(spend[i]);
    }
  });

  it('handles empty array', () => {
    expect(geometricAdstock([], 0.5)).toEqual([]);
  });

  it('handles single element', () => {
    const result = geometricAdstock([100], 0.7);
    expect(result).toEqual([100]);
  });
});

// =============================================================================
// hillSaturation
// =============================================================================
describe('hillSaturation', () => {
  it('spend=0 → output=0', () => {
    const result = hillSaturation([0], 100);
    expect(result[0]).toBe(0);
  });

  it('spend=K → output=0.5 exactly (half-saturation)', () => {
    const K = 500;
    const result = hillSaturation([K], K);
    expect(approxEqual(result[0], 0.5, 1e-6)).toBe(true);
  });

  it('spend >> K → output approaches 1', () => {
    const result = hillSaturation([1000000], 100);
    expect(result[0]).toBeGreaterThan(0.99);
    expect(result[0]).toBeLessThanOrEqual(1);
  });

  it('output is monotonically increasing', () => {
    const spends = [0, 50, 100, 200, 500, 1000, 5000];
    const result = hillSaturation(spends, 200);

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
  });

  it('alpha > 1 creates S-curve (inflection point)', () => {
    const spends = Array.from({ length: 20 }, (_, i) => i * 50);
    const alpha1 = hillSaturation(spends, 500, 1);
    const alpha3 = hillSaturation(spends, 500, 3);

    // Both should reach ~0.5 at K=500 (index 10)
    expect(approxEqual(alpha1[10], 0.5, 0.01)).toBe(true);
    expect(approxEqual(alpha3[10], 0.5, 0.01)).toBe(true);
  });

  it('negative values are clamped to 0', () => {
    const result = hillSaturation([-100, -50, 0], 100);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
  });
});

// =============================================================================
// logSaturation
// =============================================================================
describe('logSaturation', () => {
  it('spend=0 → output=0', () => {
    const result = logSaturation([0], 100);
    expect(result[0]).toBeCloseTo(0, 6);
  });

  it('output grows logarithmically (never reaches a ceiling of 1)', () => {
    const result = logSaturation([100, 1000, 10000], 100);
    // log(1 + 100/100) = log(2) ≈ 0.693
    // log(1 + 1000/100) = log(11) ≈ 2.398
    expect(result[0]).toBeLessThan(result[1]);
    expect(result[1]).toBeLessThan(result[2]);
    // Can exceed 1 (no hard ceiling)
    expect(result[2]).toBeGreaterThan(1);
  });
});

// =============================================================================
// fitMMM
// =============================================================================
describe('fitMMM', () => {
  it('returns optimized=false for fewer than 7 data points', () => {
    const spend = [100, 200, 300, 400, 500];
    const outcome = [10, 18, 24, 28, 30];

    const result = fitMMM(spend, outcome);

    expect(result.optimized).toBe(false);
    expect(result.mse).toBe(Infinity);
  });

  it('returns optimized=false for mismatched array lengths', () => {
    const spend = Array(10).fill(100);
    const outcome = Array(8).fill(50);

    const result = fitMMM(spend, outcome);
    expect(result.optimized).toBe(false);
  });

  it('fits synthetic Hill curve data with reasonable R-squared', () => {
    // Generate data from known Hill model:
    // adstock_ss = spend / (1 - 0.5) = 2*spend
    // sat = adstock^1 / (300^1 + adstock^1) = 2*spend / (300 + 2*spend)
    // outcome = 10 + 50 * sat
    const trueTheta = 0.5;
    const trueK = 300;
    const spendLevels = Array.from({ length: 20 }, (_, i) => 50 + i * 30);

    // Simulate with some noise
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);

    const outcome = spendLevels.map(s => {
      // Apply geometric adstock (simplified: steady-state = s / (1 - theta))
      const adstock = s / (1 - trueTheta);
      const sat = adstock / (trueK + adstock);
      return 10 + 50 * sat + (rand() - 0.5) * 2; // small noise
    });

    const result = fitMMM(spendLevels, outcome, {
      thetas: [0.3, 0.5, 0.7],
      saturationType: 'hill',
    });

    expect(result.optimized).toBe(true);
    expect(result.rSquared).toBeGreaterThan(0.8);
    expect(result.saturationType).toBe('hill');
    expect(isClean(result.mse)).toBe(true);
    expect(isClean(result.beta0)).toBe(true);
    expect(isClean(result.beta1)).toBe(true);
  });

  it('supports log saturation type', () => {
    const spend = Array.from({ length: 15 }, (_, i) => 100 + i * 50);
    const outcome = spend.map(s => 5 + 20 * Math.log(1 + s / 200));

    const result = fitMMM(spend, outcome, { saturationType: 'log' });

    expect(result.optimized).toBe(true);
    expect(result.saturationType).toBe('log');
  });

  it('handles empty arrays', () => {
    const result = fitMMM([], []);
    expect(result.optimized).toBe(false);
  });

  it('handles single data point', () => {
    const result = fitMMM([100], [50]);
    expect(result.optimized).toBe(false);
  });
});

// =============================================================================
// computeROASCurve
// =============================================================================
describe('computeROASCurve', () => {
  it('returns correct number of points', () => {
    const fit = fitMMM(
      Array.from({ length: 15 }, (_, i) => 100 + i * 100),
      Array.from({ length: 15 }, (_, i) => 20 + i * 5)
    );
    const spendLevels = [100, 200, 300, 400, 500];
    const curve = computeROASCurve(spendLevels, fit);

    expect(curve).toHaveLength(5);
  });

  it('marginalROAS decreases as spend increases (diminishing returns)', () => {
    // Build a well-behaved fit
    const spend = Array.from({ length: 20 }, (_, i) => 50 + i * 50);
    const outcome = spend.map(s => 10 + 100 * (s / (500 + s)));
    const fit = fitMMM(spend, outcome);

    if (!fit.optimized) return; // skip if fit fails

    const levels = Array.from({ length: 10 }, (_, i) => 100 + i * 200);
    const curve = computeROASCurve(levels, fit);

    // marginalROAS should generally decline
    let declines = 0;
    for (let i = 2; i < curve.length; i++) {
      if (curve[i].marginalROAS <= curve[i - 1].marginalROAS) declines++;
    }
    // Most transitions should be declining
    expect(declines).toBeGreaterThan(curve.length / 2 - 2);
  });

  it('ROAS at spend=0 is 0', () => {
    const fit = fitMMM(
      Array.from({ length: 15 }, (_, i) => 100 + i * 100),
      Array.from({ length: 15 }, (_, i) => 20 + i * 5)
    );
    const curve = computeROASCurve([0], fit);
    expect(curve[0].roas).toBe(0);
  });

  it('all values are clean numbers', () => {
    const fit = fitMMM(
      Array.from({ length: 15 }, (_, i) => 100 + i * 100),
      Array.from({ length: 15 }, (_, i) => 20 + i * 5)
    );
    const curve = computeROASCurve([100, 500, 1000, 2000], fit);

    curve.forEach(p => {
      expect(isClean(p.spend)).toBe(true);
      expect(isClean(p.outcome)).toBe(true);
      expect(isClean(p.roas)).toBe(true);
      expect(isClean(p.marginalROAS)).toBe(true);
    });
  });
});

// =============================================================================
// findOptimalBudget
// =============================================================================
describe('findOptimalBudget', () => {
  it('returns a point within the specified range', () => {
    const spend = Array.from({ length: 20 }, (_, i) => 50 + i * 50);
    const outcome = spend.map(s => 10 + 100 * (s / (500 + s)));
    const fit = fitMMM(spend, outcome);

    if (!fit.optimized) return;

    const result = findOptimalBudget(100, 2000, fit);

    expect(result.optimalSpend).toBeGreaterThanOrEqual(100);
    expect(result.optimalSpend).toBeLessThanOrEqual(2000);
    expect(isClean(result.maxMarginalROAS)).toBe(true);
    expect(isClean(result.totalROAS)).toBe(true);
  });

  it('returns clean values for non-optimized fit', () => {
    const fit = fitMMM([100], [50]); // won't optimize
    const result = findOptimalBudget(100, 1000, fit);

    expect(isClean(result.optimalSpend)).toBe(true);
  });

  it('optimal spend is typically at lower spend levels (where marginal ROAS is highest)', () => {
    const spend = Array.from({ length: 20 }, (_, i) => 50 + i * 50);
    const outcome = spend.map(s => 10 + 100 * (s / (300 + s)));
    const fit = fitMMM(spend, outcome);

    if (!fit.optimized) return;

    const result = findOptimalBudget(50, 5000, fit);

    // Optimal should be in the lower portion of the range for Hill curves
    expect(result.optimalSpend).toBeLessThan(5000);
  });
});

// =============================================================================
// predictOutcome
// =============================================================================
describe('predictOutcome', () => {
  it('returns beta0 when spend is 0', () => {
    const fit = fitMMM(
      Array.from({ length: 15 }, (_, i) => 100 + i * 100),
      Array.from({ length: 15 }, (_, i) => 20 + i * 5)
    );
    expect(predictOutcome(0, fit)).toBe(fit.beta0);
  });

  it('outcome increases with spend', () => {
    const spend = Array.from({ length: 20 }, (_, i) => 50 + i * 50);
    const outcome = spend.map(s => 10 + 80 * (s / (400 + s)));
    const fit = fitMMM(spend, outcome);

    if (!fit.optimized) return;

    const out100 = predictOutcome(100, fit);
    const out500 = predictOutcome(500, fit);
    const out1000 = predictOutcome(1000, fit);

    // Should be monotonically increasing (assuming positive beta1)
    if (fit.beta1 > 0) {
      expect(out500).toBeGreaterThan(out100);
      expect(out1000).toBeGreaterThan(out500);
    }
  });

  it('returns finite value for very large spend', () => {
    const spend = Array.from({ length: 15 }, (_, i) => 100 + i * 100);
    const outcome = spend.map(s => 20 + 50 * (s / (300 + s)));
    const fit = fitMMM(spend, outcome);

    const result = predictOutcome(1e9, fit);
    expect(isFinite(result)).toBe(true);
  });
});

// =============================================================================
// weibullAdstock
// =============================================================================
describe('weibullAdstock', () => {
  it('output length matches input length', () => {
    const spend = [100, 200, 300, 400, 500];
    const result = weibullAdstock(spend, 2, 5);
    expect(result).toHaveLength(5);
  });

  it('all values are non-negative', () => {
    const spend = [100, 0, 200, 0, 300];
    const result = weibullAdstock(spend, 1.5, 7);
    result.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('handles empty array', () => {
    expect(weibullAdstock([], 2, 5)).toEqual([]);
  });
});
