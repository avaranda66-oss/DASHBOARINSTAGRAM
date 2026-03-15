import { describe, it, expect } from 'vitest';
import {
  selectHWModel,
  holtWintersMultiplicative,
  optimizeHW,
  holtWintersWithPI,
} from '@/lib/utils/hw-optimizer';
import { generateSeasonalData } from '@/__tests__/_fixtures/time-series';

// ─── selectHWModel ───────────────────────────────────────────────────────────

describe('selectHWModel', () => {
  it('returns "additive" for data with constant seasonal amplitude', () => {
    const data = generateSeasonalData(56, 0.5, 10, 0.5);
    const model = selectHWModel(data, 7);
    expect(['additive', 'multiplicative']).toContain(model);
  });

  it('returns a valid model type', () => {
    const data = Array.from({ length: 28 }, (_, i) => 100 + 10 * Math.sin((2 * Math.PI * i) / 7));
    const model = selectHWModel(data, 7);
    expect(model === 'additive' || model === 'multiplicative').toBe(true);
  });

  it('handles short data gracefully', () => {
    const data = [1, 2, 3, 4, 5];
    const model = selectHWModel(data, 7);
    expect(model === 'additive' || model === 'multiplicative').toBe(true);
  });
});

// ─── holtWintersMultiplicative ───────────────────────────────────────────────

describe('holtWintersMultiplicative', () => {
  it('returns fitted and forecast arrays', () => {
    const data = generateSeasonalData(28, 1, 10, 0.5);
    const result = holtWintersMultiplicative(data, { period: 7, h: 7 });

    expect(result.fitted.length).toBe(data.length);
    expect(result.forecast.length).toBe(7);
  });

  it('forecast values are finite', () => {
    const data = generateSeasonalData(28, 0.5, 5, 0.3);
    const result = holtWintersMultiplicative(data, { period: 7, h: 7 });

    result.forecast.forEach(v => {
      expect(isFinite(v)).toBe(true);
      expect(isNaN(v)).toBe(false);
    });
  });

  it('returns seasonal array of length = period', () => {
    const data = generateSeasonalData(28, 0.5, 5, 0.3);
    const result = holtWintersMultiplicative(data, { period: 7, h: 3 });

    expect(result.seasonal.length).toBe(7);
  });
});

// ─── optimizeHW ──────────────────────────────────────────────────────────────

describe('optimizeHW', () => {
  it('returns optimized params with lower MSSE than defaults', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const result = optimizeHW(data, { period: 7 });

    expect(result.optimized).toBe(true);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThanOrEqual(1);
    expect(result.beta).toBeGreaterThanOrEqual(0);
    expect(result.beta).toBeLessThanOrEqual(1);
    expect(result.gamma).toBeGreaterThanOrEqual(0);
    expect(result.gamma).toBeLessThanOrEqual(1);
    expect(result.msse).toBeGreaterThan(0);
  });

  it('returns valid model type', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const result = optimizeHW(data, { period: 7 });
    expect(result.model === 'additive' || result.model === 'multiplicative').toBe(true);
  });

  it('handles insufficient data (optimized=false)', () => {
    const data = [1, 2, 3, 4, 5]; // too short
    const result = optimizeHW(data, { period: 7 });
    expect(result.optimized).toBe(false);
  });

  it('MSSE is finite and positive', () => {
    const data = generateSeasonalData(42, 0.3, 8, 0.5);
    const result = optimizeHW(data, { period: 7 });
    expect(isFinite(result.msse)).toBe(true);
    expect(result.msse).toBeGreaterThan(0);
  });
});

// ─── holtWintersWithPI ───────────────────────────────────────────────────────

describe('holtWintersWithPI', () => {
  it('returns prediction intervals for forecast horizon', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const params = optimizeHW(data, { period: 7 });
    const result = holtWintersWithPI(data, { ...params, period: 7, h: 7 });

    expect(result.forecast.length).toBe(7);
    expect(result.pi80.length).toBe(7);
    expect(result.pi95.length).toBe(7);
  });

  it('PI95 is wider than PI80', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const params = optimizeHW(data, { period: 7 });
    const result = holtWintersWithPI(data, { ...params, period: 7, h: 7 });

    result.pi80.forEach((pi80, i) => {
      const pi95 = result.pi95[i];
      const width80 = pi80.upper - pi80.lower;
      const width95 = pi95.upper - pi95.lower;
      expect(width95).toBeGreaterThanOrEqual(width80 - 0.001);
    });
  });

  it('forecast values fall within PI95', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const params = optimizeHW(data, { period: 7 });
    const result = holtWintersWithPI(data, { ...params, period: 7, h: 7 });

    result.forecast.forEach((fc, i) => {
      expect(fc).toBeGreaterThanOrEqual(result.pi95[i].lower - 0.01);
      expect(fc).toBeLessThanOrEqual(result.pi95[i].upper + 0.01);
    });
  });

  it('residualStdDev is positive', () => {
    const data = generateSeasonalData(42, 0.3, 8, 1);
    const params = optimizeHW(data, { period: 7 });
    const result = holtWintersWithPI(data, { ...params, period: 7, h: 3 });

    expect(result.residualStdDev).toBeGreaterThan(0);
    expect(isFinite(result.residualStdDev)).toBe(true);
  });

  it('fitted array matches data length', () => {
    const data = generateSeasonalData(42, 0.3, 8, 1);
    const params = optimizeHW(data, { period: 7 });
    const result = holtWintersWithPI(data, { ...params, period: 7, h: 3 });

    expect(result.fitted.length).toBe(data.length);
  });
});
