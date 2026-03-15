import { describe, it, expect } from 'vitest';
import {
  stlDecompose,
  madScore,
  madAnomalyDetect,
  stlCusum,
  multivariateAnomalyScore,
} from '@/lib/utils/anomaly-detection';
import { approxEqual, isClean, withinRange } from '@/__tests__/_helpers/tolerance';
import {
  generateSeasonalData,
  generateLevelShift,
  generateWithOutlier,
  constantSeries,
} from '@/__tests__/_fixtures/time-series';

// =============================================================================
// stlDecompose
// =============================================================================
describe('stlDecompose', () => {
  describe('with synthetic trend + seasonal + noise', () => {
    const data = generateSeasonalData(56, 0.5, 10, 0.5);
    const result = stlDecompose(data, 7);

    it('returns decomposed = true', () => {
      expect(result.decomposed).toBe(true);
    });

    it('original matches input data', () => {
      expect(result.original).toEqual(data);
    });

    it('all arrays have same length as input', () => {
      expect(result.trend).toHaveLength(data.length);
      expect(result.seasonal).toHaveLength(data.length);
      expect(result.residual).toHaveLength(data.length);
    });

    it('trend is smoother than original (lower variance)', () => {
      const variance = (arr: number[]) => {
        const m = arr.reduce((a, v) => a + v, 0) / arr.length;
        return arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length;
      };
      expect(variance(result.trend)).toBeLessThan(variance(data));
    });

    it('seasonal component repeats with period 7', () => {
      // Compare position 0 and position 7 — should be close
      for (let cycle = 1; cycle < 4; cycle++) {
        for (let p = 0; p < 7; p++) {
          const idx1 = p;
          const idx2 = cycle * 7 + p;
          if (idx2 < data.length) {
            expect(approxEqual(result.seasonal[idx1], result.seasonal[idx2], 0.5)).toBe(true);
          }
        }
      }
    });

    it('residuals have mean close to zero', () => {
      const meanRes =
        result.residual.reduce((a, v) => a + v, 0) / result.residual.length;
      expect(Math.abs(meanRes)).toBeLessThan(2);
    });

    it('period stored matches input', () => {
      expect(result.period).toBe(7);
    });

    it('trend + seasonal + residual approximately reconstructs original', () => {
      for (let i = 0; i < data.length; i++) {
        const reconstructed = result.trend[i] + result.seasonal[i] + result.residual[i];
        expect(approxEqual(reconstructed, data[i], 0.02)).toBe(true);
      }
    });
  });

  describe('graceful degradation (data < 2*period)', () => {
    const shortData = [10, 20, 30, 40, 50];
    const result = stlDecompose(shortData, 7);

    it('returns decomposed = false', () => {
      expect(result.decomposed).toBe(false);
    });

    it('trend equals input data', () => {
      expect(result.trend).toEqual(shortData);
    });

    it('seasonal is all zeros', () => {
      result.seasonal.forEach((s) => expect(s).toBe(0));
    });

    it('residual is all zeros', () => {
      result.residual.forEach((r) => expect(r).toBe(0));
    });
  });

  describe('edge: empty array', () => {
    const result = stlDecompose([]);

    it('returns decomposed = false', () => {
      expect(result.decomposed).toBe(false);
    });

    it('returns empty arrays', () => {
      expect(result.trend).toEqual([]);
      expect(result.seasonal).toEqual([]);
      expect(result.residual).toEqual([]);
    });
  });

  describe('edge: single point', () => {
    const result = stlDecompose([42]);

    it('returns decomposed = false', () => {
      expect(result.decomposed).toBe(false);
    });

    it('trend contains the single value', () => {
      expect(result.trend).toEqual([42]);
    });
  });

  describe('with constant data', () => {
    const data = constantSeries;
    const result = stlDecompose(data, 7);

    it('seasonal components are near zero', () => {
      result.seasonal.forEach((s) => expect(Math.abs(s)).toBeLessThan(0.1));
    });

    it('residuals are near zero', () => {
      result.residual.forEach((r) => expect(Math.abs(r)).toBeLessThan(0.1));
    });
  });

  describe('with default period', () => {
    const data = generateSeasonalData(28);
    const result = stlDecompose(data);

    it('uses period 7 by default', () => {
      expect(result.period).toBe(7);
    });
  });
});

// =============================================================================
// madScore
// =============================================================================
describe('madScore', () => {
  describe('with known outlier', () => {
    const data = generateWithOutlier(30, 15, 1000);
    const result = madScore(data);

    it('median is not influenced by the outlier', () => {
      // Median of ~50 values should be around 50, not pulled to 1000
      expect(withinRange(result.median, 40, 60)).toBe(true);
    });

    it('mad is a positive value', () => {
      expect(result.mad).toBeGreaterThan(0);
    });

    it('z-score at outlier index is the highest absolute value', () => {
      const absScores = result.modifiedZScores.map((z) => Math.abs(z));
      const maxIdx = absScores.indexOf(Math.max(...absScores));
      expect(maxIdx).toBe(15);
    });

    it('outlier z-score is much larger than others', () => {
      const outlierZ = Math.abs(result.modifiedZScores[15]);
      const otherMax = Math.max(
        ...result.modifiedZScores
          .filter((_, i) => i !== 15)
          .map((z) => Math.abs(z))
      );
      expect(outlierZ).toBeGreaterThan(otherMax * 2);
    });

    it('modifiedZScores has same length as input', () => {
      expect(result.modifiedZScores).toHaveLength(data.length);
    });
  });

  describe('with constant data', () => {
    const result = madScore(constantSeries);

    it('mad is zero', () => {
      expect(result.mad).toBe(0);
    });

    it('all z-scores are zero', () => {
      result.modifiedZScores.forEach((z) => expect(z).toBe(0));
    });

    it('median equals the constant value', () => {
      expect(result.median).toBe(42);
    });
  });

  describe('edge: empty array', () => {
    const result = madScore([]);

    it('returns zero median', () => {
      expect(result.median).toBe(0);
    });

    it('returns zero mad', () => {
      expect(result.mad).toBe(0);
    });

    it('returns empty z-scores', () => {
      expect(result.modifiedZScores).toEqual([]);
    });
  });

  describe('edge: single point', () => {
    const result = madScore([99]);

    it('median equals the single value', () => {
      expect(result.median).toBe(99);
    });

    it('mad is zero', () => {
      expect(result.mad).toBe(0);
    });

    it('z-score is zero (mad=0 fallback)', () => {
      expect(result.modifiedZScores).toEqual([0]);
    });
  });

  describe('symmetric data', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = madScore(data);

    it('median is 5 (center value)', () => {
      expect(result.median).toBe(5);
    });

    it('mad is positive', () => {
      expect(result.mad).toBeGreaterThan(0);
    });

    it('z-scores are symmetric around zero', () => {
      const first = result.modifiedZScores[0];
      const last = result.modifiedZScores[result.modifiedZScores.length - 1];
      expect(approxEqual(first, -last, 0.001)).toBe(true);
    });
  });
});

// =============================================================================
// madAnomalyDetect
// =============================================================================
describe('madAnomalyDetect', () => {
  describe('with injected outlier', () => {
    const data = generateWithOutlier(30, 15, 1000);
    const result = madAnomalyDetect(data, 3.5);

    it('detects the outlier at index 15', () => {
      expect(result.anomalies).toContain(15);
    });

    it('returns scores with same length as input', () => {
      expect(result.scores).toHaveLength(data.length);
    });

    it('threshold is stored correctly', () => {
      expect(result.threshold).toBe(3.5);
    });
  });

  describe('with custom lower threshold', () => {
    const data = generateWithOutlier(30, 15, 1000);
    const strict = madAnomalyDetect(data, 5.0);
    const loose = madAnomalyDetect(data, 2.0);

    it('lower threshold detects more or equal anomalies', () => {
      expect(loose.anomalies.length).toBeGreaterThanOrEqual(strict.anomalies.length);
    });
  });

  describe('with constant data', () => {
    const result = madAnomalyDetect(constantSeries);

    it('detects no anomalies', () => {
      expect(result.anomalies).toEqual([]);
    });
  });

  describe('edge: empty array', () => {
    const result = madAnomalyDetect([]);

    it('returns empty anomalies', () => {
      expect(result.anomalies).toEqual([]);
    });

    it('returns empty scores', () => {
      expect(result.scores).toEqual([]);
    });
  });

  describe('no anomalies in smooth data', () => {
    const data = Array.from({ length: 30 }, (_, i) => 50 + Math.sin(i) * 3);
    const result = madAnomalyDetect(data, 3.5);

    it('detects zero anomalies in well-behaved data', () => {
      expect(result.anomalies).toHaveLength(0);
    });
  });

  describe('multiple outliers', () => {
    // Use data with some natural variation so MAD is non-zero
    const data = Array.from({ length: 40 }, (_, i) => 50 + Math.sin(i) * 5);
    data[10] = 500;
    data[30] = 500;
    const result = madAnomalyDetect(data, 3.5);

    it('detects both outliers', () => {
      expect(result.anomalies).toContain(10);
      expect(result.anomalies).toContain(30);
    });
  });
});

// =============================================================================
// stlCusum
// =============================================================================
describe('stlCusum', () => {
  describe('with regime change', () => {
    // Create data with seasonal pattern + a sudden shift midway
    const base = generateSeasonalData(56, 0.3, 8, 0.5);
    const shifted = base.map((v, i) => (i >= 28 ? v + 30 : v));
    const result = stlCusum(shifted, { period: 7 });

    it('detects at least one change point', () => {
      expect(result.changePoints.length).toBeGreaterThan(0);
    });

    it('change point is in the second half where shift occurs', () => {
      const inSecondHalf = result.changePoints.some((cp) => cp >= 20 && cp <= 40);
      expect(inSecondHalf).toBe(true);
    });

    it('decomposition is present', () => {
      expect(result.decomposition).toBeDefined();
      expect(result.decomposition.decomposed).toBe(true);
    });

    it('cusumPos and cusumNeg have correct length', () => {
      expect(result.cusumPos).toHaveLength(shifted.length);
      expect(result.cusumNeg).toHaveLength(shifted.length);
    });
  });

  describe('with stable seasonal data (no regime change)', () => {
    const data = generateSeasonalData(56, 0.2, 5, 0.3);
    const result = stlCusum(data, { period: 7, threshold: 4.0 });

    it('detects few or no change points', () => {
      // With high threshold and stable data, should be very few
      expect(result.changePoints.length).toBeLessThan(5);
    });
  });

  describe('edge: short data (< 2*period)', () => {
    const result = stlCusum([10, 20, 30], { period: 7 });

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('decomposition.decomposed is false', () => {
      expect(result.decomposition.decomposed).toBe(false);
    });
  });

  describe('edge: empty array', () => {
    const result = stlCusum([]);

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });

    it('cusumPos and cusumNeg are empty', () => {
      expect(result.cusumPos).toEqual([]);
      expect(result.cusumNeg).toEqual([]);
    });
  });

  describe('with constant data', () => {
    const result = stlCusum(constantSeries, { period: 7 });

    it('returns no change points', () => {
      expect(result.changePoints).toEqual([]);
    });
  });

  describe('custom options', () => {
    const data = generateSeasonalData(42, 0.5, 10, 1);
    const result = stlCusum(data, { period: 7, threshold: 1.5, drift: 0.3 });

    it('cusumPos values are all non-negative', () => {
      result.cusumPos.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });

    it('cusumNeg values are all non-negative', () => {
      result.cusumNeg.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });
  });
});

// =============================================================================
// multivariateAnomalyScore
// =============================================================================
describe('multivariateAnomalyScore', () => {
  describe('with one anomalous metric', () => {
    const n = 30;
    const normal1 = Array.from({ length: n }, () => 50);
    const normal2 = Array.from({ length: n }, () => 100);
    const anomalous = Array.from({ length: n }, () => 50);
    anomalous[15] = 500; // spike in one metric

    const result = multivariateAnomalyScore(
      { metric1: normal1, metric2: normal2, metric3: anomalous },
      2.0
    );

    it('returns scores with correct length', () => {
      expect(result.scores).toHaveLength(n);
    });

    it('contains perMetricScores for all input keys', () => {
      expect(Object.keys(result.perMetricScores)).toEqual([
        'metric1',
        'metric2',
        'metric3',
      ]);
    });

    it('perMetricScores each have correct length', () => {
      Object.values(result.perMetricScores).forEach((scores) => {
        expect(scores).toHaveLength(n);
      });
    });

    it('scores are in range 0-100', () => {
      result.scores.forEach((s) => expect(withinRange(s, 0, 100)).toBe(true));
    });
  });

  describe('with coordinated anomaly across all metrics', () => {
    const n = 30;
    // Use data with natural variation so MAD is non-zero
    const m1 = Array.from({ length: n }, (_, i) => 50 + Math.sin(i) * 5);
    const m2 = Array.from({ length: n }, (_, i) => 60 + Math.cos(i) * 4);
    const m3 = Array.from({ length: n }, (_, i) => 40 + Math.sin(i * 2) * 3);
    // Coordinated spike at index 10
    m1[10] = 500;
    m2[10] = 500;
    m3[10] = 500;

    const result = multivariateAnomalyScore({ m1, m2, m3 }, 2.0);

    it('detects coordinated anomaly', () => {
      expect(result.anomalyIndices).toContain(10);
    });

    it('score at anomalous index is the highest', () => {
      const maxScore = Math.max(...result.scores);
      expect(result.scores[10]).toBe(maxScore);
    });
  });

  describe('with no anomalies', () => {
    const n = 20;
    const result = multivariateAnomalyScore(
      {
        a: Array.from({ length: n }, () => 50),
        b: Array.from({ length: n }, () => 100),
      },
      2.5
    );

    it('returns no anomaly indices', () => {
      expect(result.anomalyIndices).toEqual([]);
    });
  });

  describe('edge: empty metrics object', () => {
    const result = multivariateAnomalyScore({});

    it('returns empty scores', () => {
      expect(result.scores).toEqual([]);
    });

    it('returns empty anomaly indices', () => {
      expect(result.anomalyIndices).toEqual([]);
    });

    it('returns empty perMetricScores', () => {
      expect(result.perMetricScores).toEqual({});
    });
  });

  describe('edge: metrics with empty arrays', () => {
    const result = multivariateAnomalyScore({ a: [], b: [] });

    it('returns empty scores', () => {
      expect(result.scores).toEqual([]);
    });
  });

  describe('edge: single data point per metric', () => {
    const result = multivariateAnomalyScore({ a: [100], b: [200] });

    it('returns scores with length 1', () => {
      expect(result.scores).toHaveLength(1);
    });
  });

  describe('edge: constant metrics', () => {
    const n = 20;
    const result = multivariateAnomalyScore({
      a: Array.from({ length: n }, () => 42),
      b: Array.from({ length: n }, () => 42),
    });

    it('returns no anomaly indices', () => {
      expect(result.anomalyIndices).toEqual([]);
    });
  });
});
