import { describe, it, expect } from 'vitest';
import { IsolationForest } from '@/lib/utils/isolation-forest';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCluster(n: number, center: number[], spread = 0.5, seed = 42): number[][] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return (s / 0x7fffffff - 0.5) * 2 * spread;
  };
  return Array.from({ length: n }, () => center.map(c => c + rand()));
}

// ─── Constructor & Training ──────────────────────────────────────────────────

describe('IsolationForest', () => {
  describe('constructor and fit', () => {
    it('builds and trains without error for valid 2D data', () => {
      const data = generateCluster(50, [0, 0]);
      const forest = new IsolationForest({ nTrees: 10, seed: 42 }).fit(data);
      expect(forest).toBeDefined();
    });

    it('builds for high-dimensional data', () => {
      const data = generateCluster(30, [0, 0, 0, 0, 0]);
      const forest = new IsolationForest({ nTrees: 5, seed: 42 }).fit(data);
      expect(forest).toBeDefined();
    });

    it('uses default options when none provided', () => {
      const data = generateCluster(50, [0, 0]);
      const forest = new IsolationForest().fit(data);
      expect(forest).toBeDefined();
    });
  });

  describe('scoreSamples', () => {
    it('returns scores in [0, 1] range', () => {
      const data = generateCluster(50, [0, 0], 1, 42);
      const scores = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).scoreSamples(data);
      scores.forEach(s => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      });
    });

    it('assigns higher score to obvious outlier', () => {
      const normal = generateCluster(100, [0, 0], 0.5, 42);
      const testData = [...normal, [100, 100]];
      const scores = new IsolationForest({ nTrees: 50, seed: 42 }).fit(normal).scoreSamples(testData);
      const outlierScore = scores[scores.length - 1];
      const avgNormal = scores.slice(0, -1).reduce((a, b) => a + b, 0) / (scores.length - 1);
      expect(outlierScore).toBeGreaterThan(avgNormal);
    });
  });

  describe('detect', () => {
    it('flags obvious outlier as anomaly', () => {
      const normal = generateCluster(100, [0, 0], 0.5, 42);
      const testData = [...normal, [100, 100]];
      const result = new IsolationForest({ nTrees: 50, seed: 42 }).fit(normal).detect(testData);
      expect(result.scores.length).toBe(testData.length);
      expect(result.anomalies[result.anomalies.length - 1]).toBe(true);
    });

    it('most normal points are not flagged', () => {
      const data = generateCluster(100, [5, 5], 0.3, 42);
      const result = new IsolationForest({ nTrees: 50, seed: 42 }).fit(data).detect(data);
      const anomalyCount = result.anomalies.filter(a => a).length;
      expect(anomalyCount).toBeLessThan(data.length * 0.15);
    });

    it('default threshold is 0.6', () => {
      const data = generateCluster(50, [0, 0]);
      const result = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).detect(data);
      expect(result.threshold).toBe(0.6);
    });

    it('custom threshold works', () => {
      const data = generateCluster(50, [0, 0]);
      const result = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).detect(data, 0.8);
      expect(result.threshold).toBe(0.8);
    });

    it('detects multiple outliers', () => {
      const normal = generateCluster(80, [0, 0], 0.3, 42);
      const testData = [...normal, [50, 50], [-50, -50], [50, -50]];
      const result = new IsolationForest({ nTrees: 50, seed: 42 }).fit(normal).detect(testData);
      const outlierFlags = result.anomalies.slice(-3);
      expect(outlierFlags.filter(a => a).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('determinism', () => {
    it('same seed → same scores', () => {
      const data = generateCluster(50, [0, 0], 1, 42);
      const s1 = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).scoreSamples(data);
      const s2 = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).scoreSamples(data);
      s1.forEach((s, i) => expect(s).toBeCloseTo(s2[i], 10));
    });

    it('different seed → different scores', () => {
      const data = generateCluster(50, [0, 0], 1, 42);
      const s1 = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data).scoreSamples(data);
      const s2 = new IsolationForest({ nTrees: 20, seed: 99 }).fit(data).scoreSamples(data);
      expect(s1.some((s, i) => Math.abs(s - s2[i]) > 0.001)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('small dataset (5 points)', () => {
      const data = [[0, 0], [1, 1], [0, 1], [1, 0], [0.5, 0.5]];
      const result = new IsolationForest({ nTrees: 10, subSampling: 3, seed: 42 }).fit(data).detect(data);
      expect(result.scores.length).toBe(5);
    });

    it('single-dimensional data with outlier', () => {
      const data = Array.from({ length: 30 }, (_, i) => [i * 0.1]);
      data.push([100]);
      const scores = new IsolationForest({ nTrees: 20, seed: 42 }).fit(data.slice(0, -1)).scoreSamples(data);
      expect(scores[scores.length - 1]).toBeGreaterThan(
        scores.slice(0, -1).reduce((a, b) => a + b, 0) / (scores.length - 1)
      );
    });

    it('all identical points → no crash', () => {
      const data = Array.from({ length: 20 }, () => [5, 5]);
      const result = new IsolationForest({ nTrees: 10, seed: 42 }).fit(data).detect(data);
      expect(result.scores.length).toBe(20);
      result.scores.forEach(s => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      });
    });

    it('unfitted forest returns 0.5 for all', () => {
      const scores = new IsolationForest().scoreSamples([[1, 2], [3, 4]]);
      scores.forEach(s => expect(s).toBe(0.5));
    });
  });
});
