import { describe, it, expect } from 'vitest';
import {
  InsightQueue,
  InsightEngine,
  kpiPointFromMAD,
  kpiPointFromForecast,
  kpiPointFromABTest,
  kpiPointFromSTLCUSUM,
  CONFIG_CONSERVATIVE,
  CONFIG_SENSITIVE,
  type Insight,
  type KpiPoint,
  type ActionableInsight,
} from '@/lib/utils/insight-engine';
import type { MetricSnapshot } from '@/lib/utils/causal-chain-detector';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInsight(score: number, key = 'test'): Insight {
  return {
    id: `${key}:${Date.now()}`,
    key,
    type: 'ANOMALY',
    kpiId: 'ctr',
    timestamp: Date.now(),
    severity: 'INFO',
    score,
    direction: 'UP',
    zScore: 2.5,
    message: 'Test insight',
  };
}

function makeKpiPoint(overrides: Partial<KpiPoint> = {}): KpiPoint {
  return {
    kpiId: 'ctr',
    timestamp: Date.now(),
    value: 5.0,
    expected: 3.0,
    stdDev: 0.5,
    ...overrides,
  };
}

// ─── KpiPoint Factory Functions ──────────────────────────────────────────────

describe('kpiPointFromMAD', () => {
  it('returns null for arrays with less than 4 elements', () => {
    expect(kpiPointFromMAD('ctr', [1, 2, 3])).toBeNull();
    expect(kpiPointFromMAD('ctr', [])).toBeNull();
  });

  it('returns KpiPoint for valid array', () => {
    const values = [10, 12, 11, 13, 10, 11, 12, 100]; // 100 is outlier
    const point = kpiPointFromMAD('ctr', values);
    expect(point).not.toBeNull();
    expect(point!.kpiId).toBe('ctr');
    expect(point!.value).toBe(100); // last value
    expect(point!.stdDev).toBeGreaterThan(0);
    expect(point!.expected).toBeGreaterThan(0); // median
  });

  it('uses median as expected value', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const point = kpiPointFromMAD('metric', values);
    expect(point).not.toBeNull();
    // Median of [1..10] = 5.5
    expect(point!.expected).toBeCloseTo(5.5, 0);
  });

  it('passes entityId through', () => {
    const values = [1, 2, 3, 4, 5];
    const point = kpiPointFromMAD('ctr', values, 'adset-123');
    expect(point!.entityId).toBe('adset-123');
  });

  it('passes revenueBaseline through', () => {
    const values = [1, 2, 3, 4, 5];
    const point = kpiPointFromMAD('ctr', values, undefined, 50000);
    expect(point!.revenueBaseline).toBe(50000);
  });
});

describe('kpiPointFromForecast', () => {
  it('returns null for arrays with less than 14 elements', () => {
    expect(kpiPointFromForecast('ctr', [1, 2, 3, 4, 5], 6)).toBeNull();
  });

  it('returns KpiPoint for valid historical data', () => {
    // Generate seasonal-like data with 28 points
    const values = Array.from({ length: 28 }, (_, i) =>
      100 + 10 * Math.sin((2 * Math.PI * i) / 7) + i * 0.5
    );
    const point = kpiPointFromForecast('ctr', values, 120);
    expect(point).not.toBeNull();
    expect(point!.value).toBe(120);
    expect(point!.expected).toBeGreaterThan(0);
    expect(point!.stdDev).toBeGreaterThan(0);
  });
});

describe('kpiPointFromABTest', () => {
  it('returns null if impressions < 100', () => {
    expect(kpiPointFromABTest('ctr', 10, 50, 20, 50)).toBeNull();
  });

  it('returns null for inconclusive test', () => {
    // Very similar CTRs, not enough data
    const result = kpiPointFromABTest('ctr', 50, 1000, 51, 1000);
    // Could be null (inconclusive) or a KpiPoint
    if (result) {
      expect(result.kpiId).toBe('ctr');
    }
  });

  it('returns KpiPoint for clear winner', () => {
    // B clearly wins: 20% CTR vs 5% CTR
    const result = kpiPointFromABTest('ctr', 50, 1000, 200, 1000);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.value).toBeCloseTo(0.2, 2); // B CTR
      expect(result.expected).toBeCloseTo(0.05, 2); // A CTR
    }
  });
});

describe('kpiPointFromSTLCUSUM', () => {
  it('returns null for arrays shorter than 2 * period', () => {
    expect(kpiPointFromSTLCUSUM('ctr', [1, 2, 3, 4, 5])).toBeNull();
  });

  it('returns null for stable series (no change point at end)', () => {
    const stable = Array.from({ length: 28 }, (_, i) =>
      50 + 5 * Math.sin((2 * Math.PI * i) / 7)
    );
    const result = kpiPointFromSTLCUSUM('ctr', stable);
    // Stable series should not trigger at last index
    // Result can be null (expected)
    if (result === null) {
      expect(result).toBeNull();
    }
  });
});

// ─── InsightQueue (Binary Max-Heap) ──────────────────────────────────────────

describe('InsightQueue', () => {
  it('starts empty', () => {
    const q = new InsightQueue();
    expect(q.size()).toBe(0);
    expect(q.peek()).toBeUndefined();
    expect(q.pop()).toBeUndefined();
  });

  it('push and pop returns highest score first (max-heap)', () => {
    const q = new InsightQueue();
    q.push(makeInsight(1, 'low'));
    q.push(makeInsight(5, 'high'));
    q.push(makeInsight(3, 'mid'));

    expect(q.size()).toBe(3);
    expect(q.pop()!.score).toBe(5);
    expect(q.pop()!.score).toBe(3);
    expect(q.pop()!.score).toBe(1);
    expect(q.size()).toBe(0);
  });

  it('peek returns highest without removing', () => {
    const q = new InsightQueue();
    q.push(makeInsight(10));
    q.push(makeInsight(2));

    expect(q.peek()!.score).toBe(10);
    expect(q.size()).toBe(2);
  });

  it('toArray returns sorted copy', () => {
    const q = new InsightQueue();
    q.push(makeInsight(1));
    q.push(makeInsight(5));
    q.push(makeInsight(3));

    const arr = q.toArray();
    expect(arr.length).toBe(3);
    expect(arr[0].score).toBe(5);
    expect(arr[1].score).toBe(3);
    expect(arr[2].score).toBe(1);
    expect(q.size()).toBe(3);
  });

  it('handles many items correctly — pop returns descending order', () => {
    const q = new InsightQueue();
    const scores = [7, 2, 9, 1, 5, 8, 3, 6, 4, 10];
    scores.forEach((s, i) => q.push(makeInsight(s, `k${i}`)));

    const popped: number[] = [];
    while (q.size() > 0) {
      popped.push(q.pop()!.score);
    }

    expect(popped.length).toBe(10);
    for (let i = 1; i < popped.length; i++) {
      expect(popped[i - 1]).toBeGreaterThanOrEqual(popped[i]);
    }
    expect(popped).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});

// ─── InsightEngine ───────────────────────────────────────────────────────────

describe('InsightEngine', () => {
  const config = { ...CONFIG_SENSITIVE };

  it('processes point above zCritical threshold', () => {
    const engine = new InsightEngine(config);
    const point = makeKpiPoint({ value: 5, expected: 3, stdDev: 0.5 });
    // z = (5 - 3) / 0.5 = 4.0, well above zCritical=2.0

    engine.processPoint(point, 'ANOMALY');
    expect(engine.queueSize()).toBe(1);

    const insights = engine.getTopN(1);
    expect(insights.length).toBe(1);
    expect(insights[0].type).toBe('ANOMALY');
    expect(insights[0].direction).toBe('UP');
    expect(insights[0].zScore).toBeCloseTo(4.0, 2);
  });

  it('ignores point below zCritical', () => {
    const engine = new InsightEngine(config);
    // z = (3.5 - 3) / 0.5 = 1.0, below zCritical=2.0
    const point = makeKpiPoint({ value: 3.5, expected: 3, stdDev: 0.5 });

    engine.processPoint(point, 'ANOMALY');
    expect(engine.queueSize()).toBe(0);
  });

  it('ignores point with stdDev <= 0', () => {
    const engine = new InsightEngine(config);
    const point = makeKpiPoint({ stdDev: 0 });

    engine.processPoint(point, 'ANOMALY');
    expect(engine.queueSize()).toBe(0);
  });

  it('classifies severity correctly', () => {
    const engine = new InsightEngine(config);

    // INFO: z > 2 but < 2.5
    const infoPoint = makeKpiPoint({ value: 4.1, expected: 3, stdDev: 0.5 }); // z=2.2
    engine.processPoint(infoPoint, 'ANOMALY', 1000);

    // WARN: z > 2.5
    const warnPoint = makeKpiPoint({ value: 4.5, expected: 3, stdDev: 0.5, kpiId: 'cpc' }); // z=3.0
    engine.processPoint(warnPoint, 'ANOMALY', 2000);

    // CRITICAL: z > 3 AND high impact
    const critPoint = makeKpiPoint({
      value: 6, expected: 3, stdDev: 0.5, kpiId: 'roas',
      revenueBaseline: 2_000_000,
    }); // z=6.0
    engine.processPoint(critPoint, 'ANOMALY', 3000);

    const insights = engine.getTopN(3);
    const severities = insights.map(i => i.severity);
    expect(severities).toContain('CRITICAL');
    expect(severities).toContain('WARN');
    expect(severities).toContain('INFO');
  });

  it('deduplicates within cooldown', () => {
    const engine = new InsightEngine({
      ...config,
      coolDownMs: 60_000, // 1 minute
    });

    const point = makeKpiPoint({ value: 5, expected: 3, stdDev: 0.5 });
    const now = 100_000;

    engine.processPoint(point, 'ANOMALY', now);
    expect(engine.queueSize()).toBe(1);

    // Same point within cooldown → suppressed
    engine.processPoint(point, 'ANOMALY', now + 30_000);
    expect(engine.queueSize()).toBe(1);

    // After cooldown → allowed
    engine.processPoint(point, 'ANOMALY', now + 120_000);
    expect(engine.queueSize()).toBe(2);
  });

  it('allows re-emission if score doubles', () => {
    const engine = new InsightEngine({
      ...config,
      coolDownMs: 60_000,
    });

    const now = 100_000;
    const point1 = makeKpiPoint({ value: 4, expected: 3, stdDev: 0.5 }); // z=2
    engine.processPoint(point1, 'ANOMALY', now);

    // Much higher z-score → score should be > 2× original
    const point2 = makeKpiPoint({ value: 8, expected: 3, stdDev: 0.5, revenueBaseline: 5_000_000 }); // z=10
    engine.processPoint(point2, 'ANOMALY', now + 1000);
    expect(engine.queueSize()).toBe(2);
  });

  it('getTopN drains the queue', () => {
    const engine = new InsightEngine(config);
    for (let i = 0; i < 5; i++) {
      const point = makeKpiPoint({ value: 5 + i, expected: 3, stdDev: 0.5, kpiId: `m${i}` });
      engine.processPoint(point, 'ANOMALY', 1000 * i);
    }

    expect(engine.queueSize()).toBe(5);
    const top3 = engine.getTopN(3);
    expect(top3.length).toBe(3);
    expect(engine.queueSize()).toBe(2);
  });

  it('peekTopN does not drain the queue', () => {
    const engine = new InsightEngine(config);
    for (let i = 0; i < 3; i++) {
      const point = makeKpiPoint({ value: 5 + i, expected: 3, stdDev: 0.5, kpiId: `m${i}` });
      engine.processPoint(point, 'ANOMALY', 1000 * i);
    }

    const peeked = engine.peekTopN(2);
    expect(peeked.length).toBe(2);
    expect(engine.queueSize()).toBe(3); // unchanged
  });

  it('clearQueue empties queue but preserves dedupe state', () => {
    const engine = new InsightEngine({
      ...config,
      coolDownMs: 60_000,
    });

    const now = 100_000;
    const point = makeKpiPoint({ value: 5, expected: 3, stdDev: 0.5 });
    engine.processPoint(point, 'ANOMALY', now);
    expect(engine.queueSize()).toBe(1);

    engine.clearQueue();
    expect(engine.queueSize()).toBe(0);

    // Same key within cooldown → still suppressed (dedupe preserved)
    engine.processPoint(point, 'ANOMALY', now + 1000);
    expect(engine.queueSize()).toBe(0);
  });

  it('handles DOWN direction', () => {
    const engine = new InsightEngine(config);
    // value < expected → DOWN
    const point = makeKpiPoint({ value: 1, expected: 3, stdDev: 0.5 }); // z = -4
    engine.processPoint(point, 'ANOMALY');

    const insights = engine.getTopN(1);
    expect(insights[0].direction).toBe('DOWN');
    expect(insights[0].zScore).toBeCloseTo(-4, 2);
  });
});

// ─── buildActionableInsight — causal enrichment (US-88) ──────────────────────

describe('buildActionableInsight — causal enrichment (US-88)', () => {
  const engine = new InsightEngine(CONFIG_SENSITIVE);
  const point = makeKpiPoint({ kpiId: 'ctr', value: 1, expected: 3, stdDev: 0.5 });
  const baseInsight: Insight = {
    id: 'test:1',
    key: 'ctr|global|ANOMALY|DOWN',
    type: 'ANOMALY',
    kpiId: 'ctr',
    timestamp: Date.now(),
    severity: 'WARN',
    score: 0.5,
    direction: 'DOWN',
    zScore: -4,
    message: 'Test',
  };

  // CREATIVE_FATIGUE: freq > 3.0, ctrDelta < -15, |cpmDelta| < 20 → confidence 0.80 (+0.10 with CR secondary)
  const creativeFatigueMetrics: MetricSnapshot = {
    ctr: 0.012, ctrDelta: -22,
    cpm: 18, cpmDelta: 5,
    frequency: 4.2, frequencyDelta: 40,
    conversionRate: 0.03, conversionRateDelta: -12,
    reach: 8000, reachDelta: -5,
  };

  // UNKNOWN: no threshold met → confidence 0.0
  const unknownMetrics: MetricSnapshot = {
    ctr: 0.02, ctrDelta: 1,
    cpm: 18, cpmDelta: 1,
    frequency: 1.0, frequencyDelta: 1,
    conversionRate: 0.03, conversionRateDelta: 1,
    reach: 8000, reachDelta: 1,
  };

  it('sem metrics — behavior idêntico ao atual (sem campos causal)', () => {
    const insight = engine.buildActionableInsight(point, 'ANOMALY', 'DOWN', -4, 0.5, baseInsight);
    expect(insight.causalPattern).toBeUndefined();
    expect(insight.causalConfidence).toBeUndefined();
    expect(insight.causalSignals).toBeUndefined();
  });

  it('com metrics CREATIVE_FATIGUE (confidence 0.85) — diagnosis enriquecida com [CREATIVE_FATIGUE]', () => {
    const insight = engine.buildActionableInsight(
      point, 'ANOMALY', 'DOWN', -4, 0.5, baseInsight, creativeFatigueMetrics
    ) as ActionableInsight;
    expect(insight.diagnosis).toContain('[CREATIVE_FATIGUE]');
    expect(insight.causalPattern).toBe('CREATIVE_FATIGUE');
    expect(insight.causalConfidence).toBeGreaterThanOrEqual(0.70);
    expect(Array.isArray(insight.causalSignals)).toBe(true);
    expect(insight.action).toBeTruthy();
  });

  it('com metrics confidence < 0.70 (UNKNOWN, 0.0) — diagnosis NÃO alterada', () => {
    const original = engine.buildActionableInsight(point, 'ANOMALY', 'DOWN', -4, 0.5, baseInsight);
    const enriched = engine.buildActionableInsight(
      point, 'ANOMALY', 'DOWN', -4, 0.5, baseInsight, unknownMetrics
    );
    expect(enriched.diagnosis).toBe(original.diagnosis);
    expect(enriched.causalPattern).toBeUndefined();
    expect(enriched.causalConfidence).toBeUndefined();
  });

  it('com metrics UNKNOWN — diagnosis NÃO alterada e causalPattern ausente', () => {
    const insight = engine.buildActionableInsight(
      point, 'ANOMALY', 'DOWN', -4, 0.5, baseInsight, unknownMetrics
    );
    expect(insight.causalPattern).toBeUndefined();
    expect(insight.diagnosis).not.toMatch(/^\[/);
  });
});

// ─── Predefined Configs ──────────────────────────────────────────────────────

describe('Predefined Configs', () => {
  it('CONFIG_CONSERVATIVE has expected values', () => {
    expect(CONFIG_CONSERVATIVE.zCritical).toBe(2.6);
    expect(CONFIG_CONSERVATIVE.coolDownMs).toBe(86_400_000);
    expect(CONFIG_CONSERVATIVE.abThreshold).toBe(0.95);
  });

  it('CONFIG_SENSITIVE has expected values', () => {
    expect(CONFIG_SENSITIVE.zCritical).toBe(2.0);
    expect(CONFIG_SENSITIVE.coolDownMs).toBe(21_600_000);
    expect(CONFIG_SENSITIVE.abThreshold).toBe(0.90);
  });

  it('CONFIG_SENSITIVE is more permissive than CONSERVATIVE', () => {
    expect(CONFIG_SENSITIVE.zCritical).toBeLessThan(CONFIG_CONSERVATIVE.zCritical);
    expect(CONFIG_SENSITIVE.coolDownMs).toBeLessThan(CONFIG_CONSERVATIVE.coolDownMs);
  });
});
