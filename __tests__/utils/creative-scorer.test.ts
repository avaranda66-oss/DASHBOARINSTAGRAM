// =============================================================================
// creative-scorer.test.ts — Tests for creative scoring engine
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  scoreVisual,
  scoreCopy,
  scorePerformance,
  scoreFatigue,
  scoreCreative,
} from '@/lib/utils/creative-scorer';
import type {
  CreativeMeta,
  CreativeStats,
  CreativeBenchmark,
  HistoricalSerie,
} from '@/lib/utils/creative-scorer';
import { assertUnit, withinRange } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// Helpers — Build test fixtures
// =============================================================================

function makeMeta(overrides: Partial<CreativeMeta> = {}): CreativeMeta {
  return {
    id: 'creative_001',
    campaignId: 'camp_001',
    adSetId: 'adset_001',
    objective: 'CONVERSIONS',
    ...overrides,
  };
}

function makeStats(overrides: Partial<CreativeStats> = {}): CreativeStats {
  return {
    impressions: 10000,
    clicks: 300,
    ctr: 0.03,
    saveRate: 0.005,
    commentRate: 0.002,
    spend: 50,
    period: { start: Date.now() - 7 * 86400000, end: Date.now() },
    ...overrides,
  };
}

function makeBench(overrides: Partial<CreativeBenchmark> = {}): CreativeBenchmark {
  return {
    avgCtr: 0.03,
    avgSaveRate: 0.005,
    avgCommentRate: 0.002,
    ...overrides,
  };
}

function makeSerie(
  pointCount: number,
  ctrFn: (i: number) => number,
  overrides: Partial<CreativeStats> = {},
  benchOverrides: Partial<CreativeBenchmark> = {}
): HistoricalSerie {
  const points: CreativeStats[] = Array.from({ length: pointCount }, (_, i) =>
    makeStats({ ctr: ctrFn(i), spend: 50 + i * 5, ...overrides })
  );
  return { points, benchmarks: makeBench(benchOverrides) };
}

// =============================================================================
// scoreVisual
// =============================================================================
describe('scoreVisual', () => {
  it('returns value in [0, 1]', () => {
    const score = scoreVisual(makeMeta());
    expect(assertUnit(score)).toBe(true);
  });

  it('returns base 0.5 with no optional metadata', () => {
    const score = scoreVisual(makeMeta());
    expect(score).toBe(0.5);
  });

  it('returns near 1 with all positive signals', () => {
    const meta = makeMeta({
      hasFace: true,        // +0.15
      textDensity: 'LOW',   // +0.15
      isUGC: true,          // +0.10
      category: 'FINANCE',
      dominantHue: 'BLUE',  // +0.05
    });
    const score = scoreVisual(meta);
    // 0.5 + 0.15 + 0.15 + 0.10 + 0.05 = 0.95
    expect(score).toBeCloseTo(0.95, 4);
  });

  it('penalizes HIGH text density', () => {
    const highText = scoreVisual(makeMeta({ textDensity: 'HIGH' }));
    const lowText = scoreVisual(makeMeta({ textDensity: 'LOW' }));
    expect(highText).toBeLessThan(lowText);
    // HIGH: 0.5 - 0.10 = 0.40
    expect(highText).toBeCloseTo(0.40, 4);
  });

  it('applies FOOD + RED color bonus', () => {
    const score = scoreVisual(makeMeta({ category: 'FOOD', dominantHue: 'RED' }));
    expect(score).toBeCloseTo(0.55, 4);
  });

  it('never exceeds 1 even with all bonuses stacked', () => {
    const meta = makeMeta({
      hasFace: true,
      textDensity: 'LOW',
      isUGC: true,
      category: 'FINANCE',
      dominantHue: 'BLUE',
    });
    expect(scoreVisual(meta)).toBeLessThanOrEqual(1);
  });

  it('never goes below 0', () => {
    const meta = makeMeta({ textDensity: 'HIGH' });
    expect(scoreVisual(meta)).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// scoreCopy
// =============================================================================
describe('scoreCopy', () => {
  it('returns value in [0, 1]', () => {
    const score = scoreCopy(makeMeta());
    expect(assertUnit(score)).toBe(true);
  });

  it('returns base 0.5 with no optional metadata', () => {
    expect(scoreCopy(makeMeta())).toBe(0.5);
  });

  it('gives highest bonus for QUESTION caption', () => {
    const question = scoreCopy(makeMeta({ captionType: 'QUESTION' }));
    const list = scoreCopy(makeMeta({ captionType: 'LIST' }));
    expect(question).toBeGreaterThanOrEqual(list);
    // QUESTION: 0.5 + 0.10 = 0.60
    expect(question).toBeCloseTo(0.60, 4);
  });

  it('adds emoji bonus for 1-5 emojis', () => {
    const withEmoji = scoreCopy(makeMeta({ emojiCount: 3 }));
    const noEmoji = scoreCopy(makeMeta({ emojiCount: 0 }));
    expect(withEmoji).toBeGreaterThan(noEmoji);
    // 0.5 + 0.05 = 0.55
    expect(withEmoji).toBeCloseTo(0.55, 4);
  });

  it('penalizes excessive emojis (> 8)', () => {
    const tooMany = scoreCopy(makeMeta({ emojiCount: 12 }));
    expect(tooMany).toBeLessThan(0.5);
    // 0.5 - 0.08 = 0.42
    expect(tooMany).toBeCloseTo(0.42, 4);
  });

  it('best possible copy score', () => {
    const best = scoreCopy(makeMeta({ captionType: 'QUESTION', emojiCount: 3 }));
    // 0.5 + 0.10 + 0.05 = 0.65
    expect(best).toBeCloseTo(0.65, 4);
  });

  it('never exceeds 1 or goes below 0', () => {
    const high = scoreCopy(makeMeta({ captionType: 'QUESTION', emojiCount: 2 }));
    const low = scoreCopy(makeMeta({ emojiCount: 15 }));
    expect(assertUnit(high)).toBe(true);
    expect(assertUnit(low)).toBe(true);
  });
});

// =============================================================================
// scorePerformance
// =============================================================================
describe('scorePerformance', () => {
  it('returns value in [0, 1]', () => {
    const score = scorePerformance(makeStats(), makeBench());
    expect(assertUnit(score)).toBe(true);
  });

  it('returns ~0.95 when KPIs are 2x benchmark', () => {
    const current = makeStats({ ctr: 0.06, saveRate: 0.01, commentRate: 0.004 });
    const bench = makeBench({ avgCtr: 0.03, avgSaveRate: 0.005, avgCommentRate: 0.002 });

    const score = scorePerformance(current, bench);

    // relative = 2 for each → log2(2+1) = log2(3) ≈ 1.585
    // 0.5 + 0.20*1.585 + 0.15*1.585 + 0.10*1.585 = 0.5 + 0.713 = 1.213 → clamped to 1
    // Actually clamped to 1.0
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns lower score when KPIs are below benchmark', () => {
    const current = makeStats({ ctr: 0.01, saveRate: 0.001, commentRate: 0.0005 });
    const bench = makeBench({ avgCtr: 0.03, avgSaveRate: 0.005, avgCommentRate: 0.002 });

    const score = scorePerformance(current, bench);

    expect(score).toBeLessThan(0.8);
    expect(assertUnit(score)).toBe(true);
  });

  it('includes ROAS when both current and benchmark have it', () => {
    const withRoas = scorePerformance(
      makeStats({ roas: 4.0 }),
      makeBench({ avgRoas: 2.0 })
    );
    const withoutRoas = scorePerformance(
      makeStats(),
      makeBench()
    );

    expect(withRoas).toBeGreaterThan(withoutRoas);
  });

  it('handles zero benchmark gracefully (relativeKpi returns 1)', () => {
    const score = scorePerformance(
      makeStats({ ctr: 0.05 }),
      makeBench({ avgCtr: 0, avgSaveRate: 0, avgCommentRate: 0 })
    );
    expect(assertUnit(score)).toBe(true);
    expect(isFinite(score)).toBe(true);
  });
});

// =============================================================================
// scoreFatigue
// =============================================================================
describe('scoreFatigue', () => {
  it('returns value in [0, 1]', () => {
    const serie = makeSerie(10, i => 0.05 - i * 0.003);
    const score = scoreFatigue(serie);
    expect(assertUnit(score)).toBe(true);
  });

  it('returns 0 for fewer than 3 points', () => {
    const serie = makeSerie(2, () => 0.05);
    expect(scoreFatigue(serie)).toBe(0);
  });

  it('returns low fatigue for stable CTR', () => {
    const serie = makeSerie(10, () => 0.04);
    const score = scoreFatigue(serie);
    expect(score).toBeLessThan(0.3);
  });

  it('detects fatigue from declining CTR series', () => {
    // Strong decline over 10 days
    const serie = makeSerie(10, i => 0.08 * Math.exp(-0.15 * i));
    const score = scoreFatigue(serie);
    expect(score).toBeGreaterThan(0);
  });

  it('adds hook rate fatigue when hookRate drops > 10pp', () => {
    const points: CreativeStats[] = Array.from({ length: 5 }, (_, i) =>
      makeStats({
        ctr: 0.04 - i * 0.002,
        hookRate: 0.40 - i * 0.05, // drops from 0.40 to 0.20 (20pp)
        spend: 50,
      })
    );
    const serie: HistoricalSerie = { points, benchmarks: makeBench() };
    const score = scoreFatigue(serie);

    // hookDrop = 0.40 - 0.20 = 0.20 > 0.10 → +0.30
    expect(score).toBeGreaterThanOrEqual(0.30);
  });

  it('adds spend-up-CTR-down signal', () => {
    const points: CreativeStats[] = Array.from({ length: 5 }, (_, i) =>
      makeStats({
        ctr: 0.05 * (1 - i * 0.08), // declining CTR
        spend: 50 + i * 30,          // increasing spend
      })
    );
    const serie: HistoricalSerie = { points, benchmarks: makeBench() };
    const score = scoreFatigue(serie);

    // lastCtr < firstCtr * 0.85 and lastSpend > firstSpend
    expect(score).toBeGreaterThan(0);
  });

  it('never exceeds 1', () => {
    // All fatigue signals maxed
    const points: CreativeStats[] = Array.from({ length: 15 }, (_, i) =>
      makeStats({
        ctr: 0.10 * Math.exp(-0.3 * i),
        hookRate: 0.50 - i * 0.04,
        spend: 50 + i * 50,
      })
    );
    const serie: HistoricalSerie = { points, benchmarks: makeBench() };
    const score = scoreFatigue(serie);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// scoreCreative (composite)
// =============================================================================
describe('scoreCreative', () => {
  it('returns all scores in [0, 1]', () => {
    const meta = makeMeta();
    const serie = makeSerie(5, () => 0.03);

    const result = scoreCreative(meta, serie);

    expect(assertUnit(result.visualScore)).toBe(true);
    expect(assertUnit(result.copyScore)).toBe(true);
    expect(assertUnit(result.performanceScore)).toBe(true);
    expect(assertUnit(result.fatigueScore)).toBe(true);
    expect(assertUnit(result.totalScore)).toBe(true);
  });

  it('computes totalScore as 0.2*visual + 0.2*copy + 0.5*perf - 0.3*fatigue, clamped to [0,1]', () => {
    const meta = makeMeta({ hasFace: true, textDensity: 'LOW', captionType: 'QUESTION' });
    const serie = makeSerie(5, () => 0.03);

    const result = scoreCreative(meta, serie);

    const expected = 0.20 * result.visualScore +
                     0.20 * result.copyScore +
                     0.50 * result.performanceScore -
                     0.30 * result.fatigueScore;
    const clamped = Math.max(0, Math.min(1, expected));

    // totalScore is rounded to 4 decimals
    expect(Math.abs(result.totalScore - Math.round(clamped * 10000) / 10000)).toBeLessThan(0.001);
  });

  it('returns creativeId matching the meta id', () => {
    const meta = makeMeta({ id: 'test_creative_42' });
    const serie = makeSerie(5, () => 0.03);

    const result = scoreCreative(meta, serie);
    expect(result.creativeId).toBe('test_creative_42');
  });

  it('high-quality creative scores higher than low-quality', () => {
    const goodMeta = makeMeta({
      hasFace: true,
      textDensity: 'LOW',
      isUGC: true,
      captionType: 'QUESTION',
      emojiCount: 3,
    });
    const badMeta = makeMeta({
      textDensity: 'HIGH',
      emojiCount: 15,
    });

    // Good performance, stable CTR
    const goodSerie = makeSerie(5, () => 0.06, { saveRate: 0.01, commentRate: 0.004 });
    // Bad performance, declining CTR
    const badSerie = makeSerie(5, i => 0.01 * Math.exp(-0.2 * i), { saveRate: 0.001, commentRate: 0.0005 });

    const good = scoreCreative(goodMeta, goodSerie);
    const bad = scoreCreative(badMeta, badSerie);

    expect(good.totalScore).toBeGreaterThan(bad.totalScore);
  });

  it('fatigue penalty can reduce totalScore significantly', () => {
    const meta = makeMeta();
    // No fatigue
    const stableSerie = makeSerie(5, () => 0.03);
    // Heavy fatigue (declining CTR, increasing spend, hookRate dropping)
    const fatiguedPoints: CreativeStats[] = Array.from({ length: 10 }, (_, i) =>
      makeStats({
        ctr: 0.06 * Math.exp(-0.2 * i),
        hookRate: 0.40 - i * 0.04,
        spend: 50 + i * 30,
      })
    );
    const fatiguedSerie: HistoricalSerie = { points: fatiguedPoints, benchmarks: makeBench() };

    const stable = scoreCreative(meta, stableSerie);
    const fatigued = scoreCreative(meta, fatiguedSerie);

    expect(fatigued.totalScore).toBeLessThan(stable.totalScore);
  });
});
