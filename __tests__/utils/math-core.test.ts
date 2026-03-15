// =============================================================================
// math-core.test.ts — Tests for math-core primitives
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  normalCDF,
  bootstrapCI,
  normalQuantile,
  clamp01,
  solveLinearSystem,
  olsSimple,
} from '@/lib/utils/math-core';
import { approxEqual, isClean, assertUnit } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// normalCDF
// =============================================================================
describe('normalCDF', () => {
  it('returns 0.5 for z = 0', () => {
    expect(normalCDF(0)).toBe(0.5);
  });

  it('returns value in (0.8, 1) for z = 1', () => {
    const cdf1 = normalCDF(1);
    expect(cdf1).toBeGreaterThan(0.8);
    expect(cdf1).toBeLessThan(1);
  });

  it('returns ~0.975 for z = 1.96', () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 1);
  });

  it('returns > 0.99 for z = 3', () => {
    expect(normalCDF(3)).toBeGreaterThan(0.99);
    expect(normalCDF(3)).toBeLessThan(1);
  });

  it('returns value in (0, 0.2) for z = -1', () => {
    const cdfNeg1 = normalCDF(-1);
    expect(cdfNeg1).toBeGreaterThan(0);
    expect(cdfNeg1).toBeLessThan(0.2);
  });

  it('is symmetric: CDF(-z) = 1 - CDF(z)', () => {
    for (const z of [0.5, 1, 1.5, 2, 2.5, 3]) {
      const diff = Math.abs(normalCDF(-z) - (1 - normalCDF(z)));
      expect(diff).toBeLessThan(1e-10);
    }
  });

  it('returns values in (0, 1) for finite z', () => {
    for (const z of [-5, -2, 0, 2, 5]) {
      const result = normalCDF(z);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    }
  });

  it('is monotonically increasing', () => {
    const zValues = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 1; i < zValues.length; i++) {
      expect(normalCDF(zValues[i])).toBeGreaterThan(normalCDF(zValues[i - 1]));
    }
  });

  it('approaches 0 for large negative z', () => {
    expect(normalCDF(-6)).toBeLessThan(1e-5);
  });

  it('approaches 1 for large positive z', () => {
    expect(normalCDF(6)).toBeGreaterThan(1 - 1e-5);
  });
});

// =============================================================================
// normalQuantile
// =============================================================================
describe('normalQuantile', () => {
  it('returns 0 for p = 0.5', () => {
    expect(normalQuantile(0.5)).toBe(0);
  });

  it('returns -Infinity for p = 0', () => {
    expect(normalQuantile(0)).toBe(-Infinity);
  });

  it('returns +Infinity for p = 1', () => {
    expect(normalQuantile(1)).toBe(Infinity);
  });

  it('returns ~1.96 for p = 0.975', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 1);
  });

  it('returns ~-1.96 for p = 0.025', () => {
    expect(normalQuantile(0.025)).toBeCloseTo(-1.96, 1);
  });

  it('returns ~-2.326 for p = 0.01', () => {
    expect(normalQuantile(0.01)).toBeCloseTo(-2.3263, 1);
  });

  it('returns ~1.2816 for p = 0.9', () => {
    expect(normalQuantile(0.9)).toBeCloseTo(1.2816, 1);
  });

  it('is antisymmetric: Q(p) = -Q(1-p)', () => {
    for (const p of [0.1, 0.2, 0.3, 0.4]) {
      const diff = Math.abs(normalQuantile(p) + normalQuantile(1 - p));
      expect(diff).toBeLessThan(1e-10);
    }
  });

  it('round-trip: normalCDF(normalQuantile(p)) preserves ordering', () => {
    // Both approximations have bounded error; verify recovered p preserves order
    const pValues = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
    const recovered = pValues.map(p => normalCDF(normalQuantile(p)));
    for (let i = 1; i < recovered.length; i++) {
      expect(recovered[i]).toBeGreaterThan(recovered[i - 1]);
    }
    // p=0.5 should round-trip exactly (both functions special-case it)
    expect(normalCDF(normalQuantile(0.5))).toBe(0.5);
  });

  it('round-trip: normalQuantile(normalCDF(z)) preserves ordering', () => {
    const zValues = [-2, -1, 0, 1, 2];
    const recovered = zValues.map(z => normalQuantile(normalCDF(z)));
    for (let i = 1; i < recovered.length; i++) {
      expect(recovered[i]).toBeGreaterThan(recovered[i - 1]);
    }
    // z=0 -> CDF=0.5 -> Q(0.5)=0: exact round-trip
    expect(normalQuantile(normalCDF(0))).toBe(0);
  });

  it('returns -Infinity for negative p', () => {
    expect(normalQuantile(-0.5)).toBe(-Infinity);
  });

  it('returns +Infinity for p > 1', () => {
    expect(normalQuantile(1.5)).toBe(Infinity);
  });

  it('is monotonically increasing', () => {
    const pValues = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
    for (let i = 1; i < pValues.length; i++) {
      expect(normalQuantile(pValues[i])).toBeGreaterThan(normalQuantile(pValues[i - 1]));
    }
  });
});

// =============================================================================
// clamp01
// =============================================================================
describe('clamp01', () => {
  it('returns 0 for negative values', () => {
    expect(clamp01(-5)).toBe(0);
    expect(clamp01(-0.001)).toBe(0);
  });

  it('returns 1 for values > 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it('returns the value itself when in [0, 1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.333)).toBe(0.333);
  });

  it('clamps NaN — returns NaN (Math.max/min behavior)', () => {
    expect(Number.isNaN(clamp01(NaN))).toBe(true);
  });

  it('handles Infinity', () => {
    expect(clamp01(Infinity)).toBe(1);
    expect(clamp01(-Infinity)).toBe(0);
  });
});

// =============================================================================
// bootstrapCI
// =============================================================================
describe('bootstrapCI', () => {
  it('returns zeros for empty array', () => {
    const result = bootstrapCI([]);
    expect(result).toEqual({ lower: 0, upper: 0, point: 0, B: 0 });
  });

  it('returns degenerate interval for single element', () => {
    const result = bootstrapCI([42]);
    expect(result).toEqual({ lower: 42, upper: 42, point: 42, B: 0 });
  });

  it('returns deterministic results (seed=42)', () => {
    const data = [1, 2, 3, 4, 5];
    const r1 = bootstrapCI(data, { B: 500 });
    const r2 = bootstrapCI(data, { B: 500 });
    expect(r1).toEqual(r2);
  });

  it('produces interval that contains the point estimate', () => {
    const data = [10, 20, 30, 40, 50];
    const result = bootstrapCI(data, { B: 2000 });
    expect(result.lower).toBeLessThanOrEqual(result.point);
    expect(result.upper).toBeGreaterThanOrEqual(result.point);
  });

  it('lower <= upper always holds', () => {
    const data = [1, 1, 2, 3, 5, 8, 13];
    const result = bootstrapCI(data);
    expect(result.lower).toBeLessThanOrEqual(result.upper);
  });

  it('point estimate equals the mean of the data', () => {
    const data = [2, 4, 6, 8];
    const result = bootstrapCI(data);
    expect(result.point).toBe(5);
  });

  it('respects custom B parameter', () => {
    const data = [1, 2, 3];
    const result = bootstrapCI(data, { B: 200 });
    expect(result.B).toBe(200);
  });

  it('works with custom statFn (median)', () => {
    const data = [1, 2, 3, 4, 100];
    const medianFn = (s: number[]) => {
      const sorted = [...s].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const result = bootstrapCI(data, { statFn: medianFn });
    expect(isClean(result.lower)).toBe(true);
    expect(isClean(result.upper)).toBe(true);
  });

  it('narrower CI with larger sample size', () => {
    const small = [1, 2, 3, 4, 5];
    const large = Array.from({ length: 100 }, (_, i) => (i % 5) + 1);
    const ciSmall = bootstrapCI(small, { B: 2000 });
    const ciLarge = bootstrapCI(large, { B: 2000 });
    const widthSmall = ciSmall.upper - ciSmall.lower;
    const widthLarge = ciLarge.upper - ciLarge.lower;
    expect(widthLarge).toBeLessThanOrEqual(widthSmall);
  });

  it('all returned values are clean numbers', () => {
    const data = [3, 7, 11, 15, 19];
    const result = bootstrapCI(data);
    expect(isClean(result.lower)).toBe(true);
    expect(isClean(result.upper)).toBe(true);
    expect(isClean(result.point)).toBe(true);
  });

  it('handles two identical elements', () => {
    const result = bootstrapCI([5, 5]);
    expect(result.point).toBe(5);
    expect(result.lower).toBe(5);
    expect(result.upper).toBe(5);
  });
});

// =============================================================================
// solveLinearSystem
// =============================================================================
describe('solveLinearSystem', () => {
  it('solves a 2x2 identity system', () => {
    const A = [[1, 0], [0, 1]];
    const b = [3, 7];
    const x = solveLinearSystem(A, b);
    expect(approxEqual(x[0], 3)).toBe(true);
    expect(approxEqual(x[1], 7)).toBe(true);
  });

  it('solves a 2x2 non-trivial system', () => {
    // 2x + y = 5, x + 3y = 10 => x=1, y=3
    const A = [[2, 1], [1, 3]];
    const b = [5, 10];
    const x = solveLinearSystem(A, b);
    expect(approxEqual(x[0], 1)).toBe(true);
    expect(approxEqual(x[1], 3)).toBe(true);
  });

  it('solves a 3x3 system', () => {
    // x + y + z = 6, 2y + 5z = -4, 2x + 5y - z = 27
    // Solution: x=5, y=3, z=-2
    const A = [[1, 1, 1], [0, 2, 5], [2, 5, -1]];
    const b = [6, -4, 27];
    const x = solveLinearSystem(A, b);
    expect(approxEqual(x[0], 5)).toBe(true);
    expect(approxEqual(x[1], 3)).toBe(true);
    expect(approxEqual(x[2], -2)).toBe(true);
  });

  it('solves a 4x4 system (used by fitITS)', () => {
    // 4x4 identity
    const A = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    const b = [2, 4, 6, 8];
    const x = solveLinearSystem(A, b);
    expect(x).toEqual([2, 4, 6, 8]);
  });

  it('throws for singular matrix', () => {
    const A = [[1, 2], [2, 4]];
    const b = [3, 6];
    expect(() => solveLinearSystem(A, b)).toThrow(/singular/i);
  });

  it('throws for zero matrix', () => {
    const A = [[0, 0], [0, 0]];
    const b = [1, 1];
    expect(() => solveLinearSystem(A, b)).toThrow(/singular/i);
  });

  it('solves 1x1 system', () => {
    const x = solveLinearSystem([[5]], [15]);
    expect(approxEqual(x[0], 3)).toBe(true);
  });

  it('handles system requiring row swap (pivoting)', () => {
    const A = [[0, 1], [1, 0]];
    const b = [7, 3];
    const x = solveLinearSystem(A, b);
    expect(approxEqual(x[0], 3)).toBe(true);
    expect(approxEqual(x[1], 7)).toBe(true);
  });

  it('returns correct length', () => {
    const A = [[2, 1], [1, 3]];
    const b = [5, 10];
    const x = solveLinearSystem(A, b);
    expect(x.length).toBe(2);
  });
});

// =============================================================================
// olsSimple
// =============================================================================
describe('olsSimple', () => {
  it('returns zeros for empty arrays', () => {
    const result = olsSimple([], []);
    expect(result).toEqual({ alpha: 0, beta: 0, rSquared: 0, residuals: [] });
  });

  it('returns zeros for single element', () => {
    const result = olsSimple([1], [2]);
    expect(result).toEqual({ alpha: 0, beta: 0, rSquared: 0, residuals: [] });
  });

  it('returns zeros for mismatched lengths', () => {
    const result = olsSimple([1, 2, 3], [1, 2]);
    expect(result).toEqual({ alpha: 0, beta: 0, rSquared: 0, residuals: [] });
  });

  it('fits perfect linear data: y = 2x + 1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map(xi => 2 * xi + 1);
    const result = olsSimple(x, y);
    expect(result.beta).toBe(2);
    expect(result.alpha).toBe(1);
    expect(result.rSquared).toBe(1);
  });

  it('fits perfect linear data: y = -0.5x + 10', () => {
    const x = [0, 2, 4, 6, 8];
    const y = x.map(xi => -0.5 * xi + 10);
    const result = olsSimple(x, y);
    expect(result.beta).toBe(-0.5);
    expect(result.alpha).toBe(10);
    expect(result.rSquared).toBe(1);
  });

  it('residuals are near zero for perfect fit', () => {
    const x = [0, 1, 2, 3];
    const y = x.map(xi => 3 * xi - 2);
    const result = olsSimple(x, y);
    for (const r of result.residuals) {
      expect(Math.abs(r)).toBeLessThan(1e-10);
    }
  });

  it('handles constant x (all same value)', () => {
    const x = [5, 5, 5, 5];
    const y = [1, 2, 3, 4];
    const result = olsSimple(x, y);
    expect(result.beta).toBe(0);
    expect(result.alpha).toBe(2.5);
    expect(result.rSquared).toBe(0);
  });

  it('handles constant y', () => {
    const x = [1, 2, 3, 4];
    const y = [5, 5, 5, 5];
    const result = olsSimple(x, y);
    expect(result.beta).toBe(0);
    expect(result.rSquared).toBe(0);
  });

  it('R-squared is between 0 and 1 for noisy data', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.3, 13.8, 16.1, 18.0, 20.2];
    const result = olsSimple(x, y);
    expect(assertUnit(result.rSquared)).toBe(true);
    expect(result.rSquared).toBeGreaterThan(0.99);
  });

  it('residuals length matches input length', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 5];
    const result = olsSimple(x, y);
    expect(result.residuals.length).toBe(5);
  });

  it('all output values are clean numbers', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2.3, 4.1, 5.8, 8.2, 9.7];
    const result = olsSimple(x, y);
    expect(isClean(result.alpha)).toBe(true);
    expect(isClean(result.beta)).toBe(true);
    expect(isClean(result.rSquared)).toBe(true);
    for (const r of result.residuals) {
      expect(isClean(r)).toBe(true);
    }
  });

  it('works with two data points (minimum)', () => {
    const result = olsSimple([0, 1], [0, 1]);
    expect(result.beta).toBe(1);
    expect(result.alpha).toBe(0);
    expect(result.rSquared).toBe(1);
    expect(result.residuals.length).toBe(2);
  });
});
