import { describe, it, expect } from 'vitest';
import { holtWinters, cusumDetect } from '@/lib/utils/forecasting';
import { approxEqual, withinRange, isClean } from '@/__tests__/_helpers/tolerance';
import {
  generateSeasonalData,
  generateLevelShift,
  constantSeries,
} from '@/__tests__/_fixtures/time-series';

// =============================================================================
// holtWinters
// =============================================================================
describe('holtWinters', () => {
  // ---- Seasonal data (7-day period) ----
  describe('with seasonal data (7-day period)', () => {
    const data = generateSeasonalData(56, 0.5, 10, 1);
    const result = holtWinters(data, { period: 7, h: 7 });

    it('returns fitted array with same length as input', () => {
      expect(result.fitted).toHaveLength(data.length);
    });

    it('returns forecast array with length h', () => {
      expect(result.forecast).toHaveLength(7);
    });

    it('forecast extends the upward trend', () => {
      const lastFitted = result.fitted[result.fitted.length - 1];
      const avgForecast =
        result.forecast.reduce((a, v) => a + v, 0) / result.forecast.length;
      // With a positive trend, forecasts should generally continue upward
      expect(avgForecast).toBeGreaterThan(data[0]);
    });

    it('trend component is positive for rising data', () => {
      expect(result.trend).toBeGreaterThan(0);
    });

    it('seasonal components have length equal to period', () => {
      expect(result.seasonal).toHaveLength(7);
    });

    it('seasonal components are not all zero', () => {
      const allZero = result.seasonal.every((s) => s === 0);
      expect(allZero).toBe(false);
    });

    it('level is a clean finite number', () => {
      expect(isClean(result.level)).toBe(true);
    });

    it('all fitted values are clean finite numbers', () => {
      result.fitted.forEach((v) => expect(isClean(v)).toBe(true));
    });

    it('all forecast values are clean finite numbers', () => {
      result.forecast.forEach((v) => expect(isClean(v)).toBe(true));
    });
  });

  // ---- Custom horizon ----
  describe('with custom horizon h=14', () => {
    const data = generateSeasonalData(42, 1, 8, 0.5);
    const result = holtWinters(data, { period: 7, h: 14 });

    it('returns forecast of length 14', () => {
      expect(result.forecast).toHaveLength(14);
    });

    it('forecast values cycle with period 7 pattern', () => {
      // Values at position i and i+7 should be close (same seasonal index)
      for (let i = 0; i < 7; i++) {
        const diff = Math.abs(result.forecast[i] - result.forecast[i + 7]);
        // They differ by ~7*trend but seasonal component should be similar
        expect(diff).toBeLessThan(50); // loose bound
      }
    });
  });

  // ---- Custom smoothing parameters ----
  describe('with high alpha (fast adaptation)', () => {
    const data = generateSeasonalData(28, 0.3, 5, 0.5);
    const result = holtWinters(data, { period: 7, alpha: 0.9, beta: 0.1, gamma: 0.1 });

    it('returns valid fitted values', () => {
      expect(result.fitted).toHaveLength(data.length);
      result.fitted.forEach((v) => expect(isClean(v)).toBe(true));
    });
  });

  // ---- Graceful degradation: data < 2*period ----
  describe('graceful degradation (data < 2*period)', () => {
    const shortData = [10, 20, 30, 40, 50]; // length 5 < 2*7

    it('returns fitted equal to input data', () => {
      const result = holtWinters(shortData, { period: 7 });
      expect(result.fitted).toEqual(shortData);
    });

    it('returns constant forecast equal to last value', () => {
      const result = holtWinters(shortData, { period: 7, h: 3 });
      expect(result.forecast).toEqual([50, 50, 50]);
    });

    it('trend is zero', () => {
      const result = holtWinters(shortData, { period: 7 });
      expect(result.trend).toBe(0);
    });

    it('seasonal components are all zero', () => {
      const result = holtWinters(shortData, { period: 7 });
      result.seasonal.forEach((s) => expect(s).toBe(0));
    });

    it('level equals last value', () => {
      const result = holtWinters(shortData, { period: 7 });
      expect(result.level).toBe(50);
    });
  });

  // ---- Edge: empty array ----
  describe('edge: empty array', () => {
    const result = holtWinters([], { period: 7, h: 3 });

    it('returns empty fitted', () => {
      expect(result.fitted).toEqual([]);
    });

    it('returns forecast filled with 0', () => {
      expect(result.forecast).toEqual([0, 0, 0]);
    });

    it('level is 0', () => {
      expect(result.level).toBe(0);
    });

    it('trend is 0', () => {
      expect(result.trend).toBe(0);
    });
  });

  // ---- Edge: single point ----
  describe('edge: single data point', () => {
    const result = holtWinters([42], { period: 7, h: 2 });

    it('returns fitted with the single value', () => {
      expect(result.fitted).toEqual([42]);
    });

    it('returns forecast filled with the single value', () => {
      expect(result.forecast).toEqual([42, 42]);
    });
  });

  // ---- Default options ----
  describe('default options', () => {
    const data = generateSeasonalData(28); // enough for period=7

    it('uses period=7 and h=7 by default', () => {
      const result = holtWinters(data);
      expect(result.forecast).toHaveLength(7);
      expect(result.seasonal).toHaveLength(7);
    });
  });

  // ---- Constant data ----
  describe('with constant data (no variance)', () => {
    // 30 points of value 42, period 7 requires 14 min
    const data = constantSeries; // length 30
    const result = holtWinters(data, { period: 7 });

    it('trend is approximately zero', () => {
      expect(approxEqual(result.trend, 0, 0.01)).toBe(true);
    });

    it('forecast values are close to the constant', () => {
      result.forecast.forEach((v) => {
        expect(approxEqual(v, 42, 1)).toBe(true);
      });
    });
  });
});

// =============================================================================
// cusumDetect
// =============================================================================
describe('cusumDetect', () => {
  // ---- Level shift at known index ----
  describe('with level shift at index 25', () => {
    const data = generateLevelShift(50, 25, 20);
    const result = cusumDetect(data);

    it('detects at least one change point', () => {
      expect(result.changePoints.length).toBeGreaterThan(0);
    });

    it('change point is near the actual shift index (within 10)', () => {
      const nearShift = result.changePoints.some(
        (cp) => Math.abs(cp - 25) <= 10
      );
      expect(nearShift).toBe(true);
    });

    it('cusumPos has same length as data', () => {
      expect(result.cusumPos).toHaveLength(data.length);
    });

    it('cusumNeg has same length as data', () => {
      expect(result.cusumNeg).toHaveLength(data.length);
    });

    it('all cusum values are non-negative', () => {
      result.cusumPos.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
      result.cusumNeg.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });
  });

  // ---- Constant data → no change points ----
  describe('with constant data', () => {
    const result = cusumDetect(constantSeries);

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('cusumPos is all zeros', () => {
      result.cusumPos.forEach((v) => expect(v).toBe(0));
    });

    it('cusumNeg is all zeros', () => {
      result.cusumNeg.forEach((v) => expect(v).toBe(0));
    });
  });

  // ---- Custom threshold ----
  describe('with high threshold (less sensitive)', () => {
    const data = generateLevelShift(50, 25, 10);
    const sensitive = cusumDetect(data, { threshold: 0.5 });
    const loose = cusumDetect(data, { threshold: 3.0 });

    it('high threshold produces fewer or equal change points', () => {
      expect(loose.changePoints.length).toBeLessThanOrEqual(
        sensitive.changePoints.length
      );
    });
  });

  // ---- Edge: empty array ----
  describe('edge: empty array', () => {
    const result = cusumDetect([]);

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('returns empty cusum arrays', () => {
      expect(result.cusumPos).toEqual([]);
      expect(result.cusumNeg).toEqual([]);
    });
  });

  // ---- Edge: single point ----
  describe('edge: single data point', () => {
    const result = cusumDetect([100]);

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('cusumPos has length 1', () => {
      expect(result.cusumPos).toHaveLength(1);
    });
  });

  // ---- Edge: two points ----
  describe('edge: two data points', () => {
    const result = cusumDetect([10, 20]);

    it('returns no change points (n < 3)', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('cusum arrays filled with zeros', () => {
      expect(result.cusumPos).toEqual([0, 0]);
      expect(result.cusumNeg).toEqual([0, 0]);
    });
  });

  // ---- Large shift → detected early ----
  describe('with very large shift', () => {
    const data = generateLevelShift(40, 20, 100);
    const result = cusumDetect(data);

    it('detects change point(s)', () => {
      expect(result.changePoints.length).toBeGreaterThan(0);
    });
  });

  // ---- All cusum values are clean ----
  describe('output cleanliness', () => {
    const data = generateSeasonalData(42);
    const result = cusumDetect(data);

    it('cusumPos values are all clean finite numbers', () => {
      result.cusumPos.forEach((v) => expect(isClean(v)).toBe(true));
    });

    it('cusumNeg values are all clean finite numbers', () => {
      result.cusumNeg.forEach((v) => expect(isClean(v)).toBe(true));
    });

    it('change point indices are valid', () => {
      result.changePoints.forEach((cp) => {
        expect(cp).toBeGreaterThanOrEqual(0);
        expect(cp).toBeLessThan(data.length);
      });
    });
  });
});
