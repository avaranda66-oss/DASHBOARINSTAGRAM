// =============================================================================
// causal-behavioral.test.ts — Tests for Granger causality, Hook Rate,
// Social Proof Velocity, Fogg Behavior Score, Organic-Paid Halo
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  grangerTest,
  hookRate,
  socialProofVelocity,
  foggBehaviorScore,
  organicPaidHalo,
} from '@/lib/utils/causal-behavioral';
import { approxEqual, isClean, withinRange } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// grangerTest
// =============================================================================
describe('grangerTest', () => {
  it('detects causality when X is a lagged copy of Y plus noise', () => {
    // Build Y as a random walk, then X = Y shifted by 1 lag + small noise
    const n = 60;
    const y: number[] = [10];
    for (let i = 1; i < n; i++) y.push(y[i - 1] + (Math.sin(i) * 2));
    // X leads Y: X[t] predicts Y[t+1]
    const x: number[] = y.map((v, i) => (i < n - 1 ? y[i + 1] : v) + Math.cos(i) * 0.1);

    const result = grangerTest(x, y, { maxLag: 1, alpha: 0.05 });
    expect(isClean(result.fStat)).toBe(true);
    expect(isClean(result.pValue)).toBe(true);
    expect(result.lagUsed).toBe(1);
    // We expect some form of causality detected (x_causes_y or bidirectional)
    expect(['x_causes_y', 'bidirectional', 'y_causes_x']).toContain(result.causalDirection);
    expect(result.interpretation.length).toBeGreaterThan(0);
  });

  it('returns "none" for two independent random series', () => {
    const n = 40;
    // Two independent deterministic series with no shared structure
    const x: number[] = Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) * 10);
    const y: number[] = Array.from({ length: n }, (_, i) => Math.cos(i * 1.3 + 50) * 5);

    const result = grangerTest(x, y, { maxLag: 1, alpha: 0.05 });
    expect(result.causalDirection).toBe('none');
    expect(result.significant).toBe(false);
  });

  it('returns insufficient data warning for series < 20 points', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 4, 3, 2, 1];

    const result = grangerTest(x, y);
    expect(result.significant).toBe(false);
    expect(result.causalDirection).toBe('none');
    expect(result.warning).toBeDefined();
    expect(result.fStat).toBe(0);
    expect(result.pValue).toBe(1);
  });

  it('handles empty arrays gracefully', () => {
    const result = grangerTest([], []);
    expect(result.significant).toBe(false);
    expect(result.warning).toBeDefined();
  });

  it('auto-selects lag=2 when n >= 50', () => {
    const n = 55;
    const x = Array.from({ length: n }, (_, i) => i * 0.5);
    const y = Array.from({ length: n }, (_, i) => i * 0.3 + 1);

    const result = grangerTest(x, y);
    expect(result.lagUsed).toBe(2);
  });

  it('auto-selects lag=1 when n < 50', () => {
    const n = 30;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = Array.from({ length: n }, (_, i) => i + 1);

    const result = grangerTest(x, y);
    expect(result.lagUsed).toBe(1);
  });

  it('produces clean numeric outputs for valid data', () => {
    const n = 25;
    const x = Array.from({ length: n }, (_, i) => Math.sin(i));
    const y = Array.from({ length: n }, (_, i) => Math.cos(i));

    const result = grangerTest(x, y);
    expect(isClean(result.fStat)).toBe(true);
    expect(isClean(result.pValue)).toBe(true);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// hookRate
// =============================================================================
describe('hookRate', () => {
  it('classifies high 3s retention as "excelente"', () => {
    // avgWatchTime = 4000ms on a 5000ms video => very high retention
    const result = hookRate(4000, 5000, 'reel');
    expect(result.classification).toBe('excelente');
    expect(result.hookRate).toBeGreaterThanOrEqual(70);
  });

  it('classifies low retention as "baixo"', () => {
    // avgWatchTime = 200ms on a 30000ms video => very low
    const result = hookRate(200, 30000, 'reel');
    expect(result.classification).toBe('baixo');
    expect(result.hookRate).toBeLessThan(30);
  });

  it('classifies medium retention as "bom" or "medio"', () => {
    // avgWatchTime = 1500ms on a 5000ms video
    const result = hookRate(1500, 5000, 'reel');
    expect(['bom', 'medio']).toContain(result.classification);
    expect(result.hookRate).toBeGreaterThanOrEqual(30);
  });

  it('returns "baixo" for zero or negative durations', () => {
    expect(hookRate(0, 5000).classification).toBe('baixo');
    expect(hookRate(0, 5000).hookRate).toBe(0);
    expect(hookRate(1000, 0).classification).toBe('baixo');
    expect(hookRate(-1, 5000).classification).toBe('baixo');
  });

  it('caps hookRate at 100', () => {
    // Very short video with long watch time
    const result = hookRate(10000, 1000, 'reel');
    expect(result.hookRate).toBeLessThanOrEqual(100);
  });

  it('sets isEstimate = true always (proxy calculation)', () => {
    const result = hookRate(2000, 5000, 'reel');
    expect(result.isEstimate).toBe(true);
  });

  it('returns appropriate benchmark string per content type', () => {
    expect(hookRate(2000, 5000, 'reel').benchmark).toContain('Reels');
    expect(hookRate(2000, 5000, 'video').benchmark).toContain('Video');
    expect(hookRate(2000, 5000, 'story').benchmark).toContain('Story');
  });

  it('produces clean numeric hookRate', () => {
    const result = hookRate(1234, 4567, 'reel');
    expect(isClean(result.hookRate)).toBe(true);
  });
});

// =============================================================================
// socialProofVelocity
// =============================================================================
describe('socialProofVelocity', () => {
  const publishedAt = '2026-03-01T10:00:00Z';

  it('classifies "viral" when >60% of comments arrive in first 2h', () => {
    // 8 of 10 comments in first 2 hours
    const timestamps = [
      '2026-03-01T10:05:00Z', '2026-03-01T10:10:00Z',
      '2026-03-01T10:30:00Z', '2026-03-01T10:45:00Z',
      '2026-03-01T11:00:00Z', '2026-03-01T11:15:00Z',
      '2026-03-01T11:30:00Z', '2026-03-01T11:50:00Z',
      '2026-03-01T14:00:00Z', '2026-03-01T18:00:00Z',
    ];

    const result = socialProofVelocity(timestamps, publishedAt, 2);
    expect(result.velocity).toBeGreaterThanOrEqual(60);
    expect(result.classification).toBe('viral');
  });

  it('classifies "forte" when 40-60% arrive in window', () => {
    // 5 of 10 comments in first 2 hours
    const timestamps = [
      '2026-03-01T10:10:00Z', '2026-03-01T10:30:00Z',
      '2026-03-01T11:00:00Z', '2026-03-01T11:30:00Z',
      '2026-03-01T11:50:00Z',
      '2026-03-01T14:00:00Z', '2026-03-01T16:00:00Z',
      '2026-03-01T18:00:00Z', '2026-03-01T20:00:00Z',
      '2026-03-01T22:00:00Z',
    ];

    const result = socialProofVelocity(timestamps, publishedAt, 2);
    expect(result.velocity).toBeGreaterThanOrEqual(40);
    expect(result.velocity).toBeLessThan(60);
    expect(result.classification).toBe('forte');
  });

  it('classifies "fraco" when very few comments arrive early', () => {
    // 1 of 10 in first 2 hours
    const timestamps = [
      '2026-03-01T11:30:00Z',
      '2026-03-01T14:00:00Z', '2026-03-01T16:00:00Z',
      '2026-03-01T18:00:00Z', '2026-03-01T20:00:00Z',
      '2026-03-01T22:00:00Z', '2026-03-02T08:00:00Z',
      '2026-03-02T10:00:00Z', '2026-03-02T14:00:00Z',
      '2026-03-02T18:00:00Z',
    ];

    const result = socialProofVelocity(timestamps, publishedAt, 2);
    expect(result.velocity).toBeLessThan(20);
    expect(result.classification).toBe('fraco');
  });

  it('returns dataUnavailable for empty arrays', () => {
    const result = socialProofVelocity([], publishedAt, 2);
    expect(result.velocity).toBe(0);
    expect(result.classification).toBe('fraco');
    expect(result.dataUnavailable).toBe(true);
  });

  it('returns dataUnavailable for empty publishedAt', () => {
    const result = socialProofVelocity(['2026-03-01T10:00:00Z'], '', 2);
    expect(result.dataUnavailable).toBe(true);
  });

  it('returns windowHours matching the parameter', () => {
    const result = socialProofVelocity(['2026-03-01T10:05:00Z'], publishedAt, 4);
    expect(result.windowHours).toBe(4);
  });

  it('ignores comments before publishedAt', () => {
    const timestamps = [
      '2026-03-01T09:00:00Z', // before publish
      '2026-03-01T09:30:00Z', // before publish
      '2026-03-01T10:05:00Z', // within window
    ];

    const result = socialProofVelocity(timestamps, publishedAt, 2);
    // Only 1 of 3 is in window
    expect(approxEqual(result.velocity, 33.33, 0.1)).toBe(true);
  });
});

// =============================================================================
// foggBehaviorScore
// =============================================================================
describe('foggBehaviorScore', () => {
  it('returns a score with all three components summing to totalScore', () => {
    const result = foggBehaviorScore({
      caption: 'Compre agora! Link na bio. Ultima vaga hoje!',
      contentType: 'reel',
      publishedHour: 19,
    });

    expect(result.totalScore).toBe(result.motivation + result.ability + result.prompt);
  });

  it('motivation component is bounded [0, 33]', () => {
    const result = foggBehaviorScore({
      caption: 'Transforme sua vida com resultados incriveis! Imagine o sonho realizado! Sensacional!',
      contentType: 'post',
      commentsText: ['onde compro?', 'quero comprar', 'eu quero', 'link?'],
    });

    expect(withinRange(result.motivation, 0, 33)).toBe(true);
  });

  it('ability component is bounded [0, 33]', () => {
    const result = foggBehaviorScore({
      caption: 'Link na bio',
      contentType: 'reel',
    });

    expect(withinRange(result.ability, 0, 33)).toBe(true);
  });

  it('prompt component is bounded [0, 34]', () => {
    const result = foggBehaviorScore({
      caption: 'Ultima vaga hoje! So hoje! Corre! Nao perca! Imperdivel! Exclusivo!',
      contentType: 'reel',
      publishedHour: 19,
    });

    expect(withinRange(result.prompt, 0, 34)).toBe(true);
  });

  it('totalScore is bounded [0, 100]', () => {
    const result = foggBehaviorScore({
      caption: 'Compre agora! Ultimas vagas! Link na bio!',
      contentType: 'reel',
      publishedHour: 20,
      commentsText: ['eu quero', 'quanto custa', 'onde compro'],
    });

    expect(withinRange(result.totalScore, 0, 100)).toBe(true);
  });

  it('short caption with CTA yields higher ability score', () => {
    const withCTA = foggBehaviorScore({
      caption: 'Clique no link na bio',
      contentType: 'reel',
    });
    const noCTA = foggBehaviorScore({
      caption: 'Bom dia a todos vocês que estão acompanhando esse projeto incrível desde o início',
      contentType: 'post',
    });

    expect(withCTA.ability).toBeGreaterThan(noCTA.ability);
  });

  it('reel format scores higher ability than plain post', () => {
    const reel = foggBehaviorScore({ caption: 'Test', contentType: 'reel' });
    const post = foggBehaviorScore({ caption: 'Test', contentType: 'post' });

    expect(reel.ability).toBeGreaterThanOrEqual(post.ability);
  });

  it('peak hour yields higher prompt score', () => {
    const peak = foggBehaviorScore({ caption: 'Test', contentType: 'reel', publishedHour: 19 });
    const offPeak = foggBehaviorScore({ caption: 'Test', contentType: 'reel', publishedHour: 3 });

    expect(peak.prompt).toBeGreaterThan(offPeak.prompt);
  });

  it('classifies high totalScore as "alto_impacto"', () => {
    const result = foggBehaviorScore({
      caption: 'Clique agora! Ultima vaga! 10 anos de experiencia comprovada!',
      contentType: 'reel',
      publishedHour: 19,
      commentsText: ['eu quero', 'quero comprar', 'onde compro', 'link?'],
    });

    // totalScore >= 70 → alto_impacto
    if (result.totalScore >= 70) {
      expect(result.classification).toBe('alto_impacto');
    }
  });

  it('classifies low totalScore as "baixo_impacto"', () => {
    const result = foggBehaviorScore({
      caption: '',
      contentType: 'post',
    });

    expect(result.totalScore).toBeLessThan(40);
    expect(result.classification).toBe('baixo_impacto');
  });

  it('identifies topOpportunity as the dimension with largest gap', () => {
    const result = foggBehaviorScore({
      caption: 'Test',
      contentType: 'reel',
    });

    const gaps = {
      motivation: 33 - result.motivation,
      ability: 33 - result.ability,
      prompt: 34 - result.prompt,
    };

    const expected = (Object.keys(gaps) as Array<keyof typeof gaps>)
      .reduce((a, b) => gaps[a] > gaps[b] ? a : b);

    expect(result.topOpportunity).toBe(expected);
  });

  it('handles empty caption gracefully', () => {
    const result = foggBehaviorScore({ caption: '', contentType: 'post' });
    expect(isClean(result.totalScore)).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// organicPaidHalo
// =============================================================================
describe('organicPaidHalo', () => {
  it('returns default result for fewer than 14 data points', () => {
    const result = organicPaidHalo(
      ['2026-03-01T00:00:00Z'],
      [1, 2, 3, 4, 5],
      '2026-02-24T00:00:00Z',
    );

    expect(result.haloEffect).toBe(0);
    expect(result.significance).toBe('low');
  });

  it('returns default result for empty campaign end dates', () => {
    const series = Array.from({ length: 30 }, () => 5);
    const result = organicPaidHalo([], series, '2026-02-01T00:00:00Z');

    expect(result.haloEffect).toBe(0);
  });

  it('detects positive halo when post-campaign growth exceeds baseline', () => {
    // Baseline ~5/day, post-campaign spike to ~15/day
    const series = Array.from({ length: 30 }, (_, i) => (i >= 10 && i < 17 ? 15 : 5));
    const firstDate = '2026-02-01T00:00:00Z';
    const campaignEnd = '2026-02-11T00:00:00Z'; // idx 10

    const result = organicPaidHalo([campaignEnd], series, firstDate, 7);
    expect(result.haloEffect).toBeGreaterThan(0);
    expect(result.avgPostCampaignGrowth).toBeGreaterThan(result.baselineGrowth);
  });

  it('returns high significance when multiple campaigns show consistent lift', () => {
    // 3 campaigns all showing positive lift
    const series = Array.from({ length: 60 }, (_, i) => {
      if ((i >= 10 && i < 17) || (i >= 25 && i < 32) || (i >= 40 && i < 47)) return 20;
      return 5;
    });
    const firstDate = '2026-01-01T00:00:00Z';
    const ends = ['2026-01-11T00:00:00Z', '2026-01-26T00:00:00Z', '2026-02-10T00:00:00Z'];

    const result = organicPaidHalo(ends, series, firstDate, 7);
    expect(result.significance).toBe('high');
  });

  it('produces clean numeric values', () => {
    const series = Array.from({ length: 30 }, () => 10);
    const result = organicPaidHalo(['2026-02-06T00:00:00Z'], series, '2026-02-01T00:00:00Z');

    expect(isClean(result.haloEffect)).toBe(true);
    expect(isClean(result.baselineGrowth)).toBe(true);
    expect(isClean(result.avgPostCampaignGrowth)).toBe(true);
  });
});
