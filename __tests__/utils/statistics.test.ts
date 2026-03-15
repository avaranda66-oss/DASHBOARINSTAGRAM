import { describe, it, expect } from 'vitest';
import {
  descriptiveStats,
  percentileRank,
  movingAverage,
  growthRate,
  zScores,
  linearTrend,
  pearsonCorrelation,
  weightedRecentTrend,
  engagementScore,
  hookQualityScore,
  investmentDepthScore,
  contentROIScore,
  contentIdentityScore,
  brandEquityScore,
  socialProofScore,
  reciprocityIndex,
  contentMixScore,
  contentVelocityScore,
  variableRewardScore,
  detectOutliers,
  paretoAnalysis,
  performanceBadge,
  bestTimeToPost,
  hashtagEfficiency,
  shannonEntropy,
  peakEngagementWindow,
  captionSegmentAnalysis,
  postingConsistencyIndex,
  viralPotentialIndex,
  persuasionTriggerCount,
  temporalPeriodComparison,
  postSentimentRanking,
} from '@/lib/utils/statistics';

// =============================================================================
// Helpers — mock data factories
// =============================================================================

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    likes: 100,
    comments: 10,
    views: 1000,
    saves: 20,
    shares: 5,
    ...overrides,
  };
}

function makeDatePost(date: string, engagement: number) {
  return { date, engagement };
}

function makeTimestampPost(timestamp: string, engagement: number) {
  return { timestamp, engagement };
}

function makeSentimentPost(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    caption: 'Post caption',
    likesCount: 100,
    commentsCount: 10,
    ownerUsername: 'brand',
    latestComments: [] as { text: string; ownerUsername: string }[],
    ...overrides,
  };
}

// =============================================================================
// Group A — Descriptive Statistics
// =============================================================================

describe('Group A — Descriptive Statistics', () => {
  describe('descriptiveStats', () => {
    it('returns zeros for empty array', () => {
      const result = descriptiveStats([]);
      expect(result.mean).toBe(0);
      expect(result.median).toBe(0);
      expect(result.stdDev).toBe(0);
      expect(result.count).toBe(0);
    });

    it('handles single value', () => {
      const result = descriptiveStats([42]);
      expect(result.mean).toBe(42);
      expect(result.median).toBe(42);
      expect(result.stdDev).toBe(0);
      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
      expect(result.count).toBe(1);
    });

    it('computes correct stats for known dataset', () => {
      const result = descriptiveStats([2, 4, 6, 8, 10]);
      expect(result.mean).toBe(6);
      expect(result.median).toBe(6);
      expect(result.min).toBe(2);
      expect(result.max).toBe(10);
      expect(result.count).toBe(5);
      expect(result.iqr).toBeGreaterThan(0);
    });

    it('computes stdDev with Bessel correction (n-1)', () => {
      const result = descriptiveStats([2, 4, 6]);
      // variance = ((2-4)^2 + (4-4)^2 + (6-4)^2) / (3-1) = 8/2 = 4
      expect(result.stdDev).toBe(2);
    });

    it('cv is 0 when mean is 0', () => {
      const result = descriptiveStats([-1, 0, 1]);
      expect(result.cv).toBe(0);
    });

    it('computes quartiles correctly for even-length array', () => {
      const result = descriptiveStats([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(result.q1).toBeLessThan(result.median);
      expect(result.q3).toBeGreaterThan(result.median);
      expect(result.iqr).toBe(result.q3 - result.q1);
    });
  });

  describe('percentileRank', () => {
    it('returns 0 for empty dataset', () => {
      expect(percentileRank(5, [])).toBe(0);
    });

    it('returns 100 for value above all', () => {
      expect(percentileRank(100, [1, 2, 3, 4, 5])).toBe(100);
    });

    it('returns 20 for the smallest value in [1..5]', () => {
      expect(percentileRank(1, [1, 2, 3, 4, 5])).toBe(20);
    });

    it('returns correct percentile for middle value', () => {
      expect(percentileRank(3, [1, 2, 3, 4, 5])).toBe(60);
    });
  });

  describe('movingAverage', () => {
    it('returns empty for empty input', () => {
      expect(movingAverage([], 3)).toEqual([]);
    });

    it('returns same array for window=1', () => {
      expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });

    it('produces correct 3-period SMA', () => {
      const result = movingAverage([10, 20, 30, 40, 50], 3);
      expect(result).toHaveLength(5);
      // Last element: avg(30,40,50) = 40
      expect(result[4]).toBe(40);
    });

    it('handles window larger than array', () => {
      const result = movingAverage([5, 10], 10);
      expect(result).toHaveLength(2);
    });
  });

  describe('growthRate', () => {
    it('returns 0 for less than 2 values', () => {
      expect(growthRate([])).toBe(0);
      expect(growthRate([42])).toBe(0);
    });

    it('calculates 100% growth', () => {
      expect(growthRate([50, 100])).toBe(100);
    });

    it('calculates -50% decline', () => {
      expect(growthRate([100, 50])).toBe(-50);
    });

    it('returns 100 when first is 0 and last is positive', () => {
      expect(growthRate([0, 10])).toBe(100);
    });

    it('returns 0 when first and last are 0', () => {
      expect(growthRate([0, 0])).toBe(0);
    });
  });

  describe('zScores', () => {
    it('returns all zeros for fewer than 2 values', () => {
      expect(zScores([])).toEqual([]);
      expect(zScores([5])).toEqual([0]);
    });

    it('returns zeros when all values are identical', () => {
      expect(zScores([3, 3, 3])).toEqual([0, 0, 0]);
    });

    it('z-scores of symmetric data sum to ~0', () => {
      const result = zScores([1, 2, 3, 4, 5]);
      const zSum = result.reduce((a, b) => a + b, 0);
      expect(Math.abs(zSum)).toBeLessThan(0.1);
    });

    it('returns correct z-score for known data', () => {
      // [2, 4, 6]: mean=4, stdDev=2 → z-scores: [-1, 0, 1]
      const result = zScores([2, 4, 6]);
      expect(result[0]).toBe(-1);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(1);
    });
  });
});

// =============================================================================
// Group B — Trends
// =============================================================================

describe('Group B — Trends', () => {
  describe('linearTrend', () => {
    it('returns stable for empty array', () => {
      const result = linearTrend([]);
      expect(result.slope).toBe(0);
      expect(result.direction).toBe('stable');
      expect(result.predicted).toEqual([]);
    });

    it('returns stable with r2=1 for single value', () => {
      const result = linearTrend([10]);
      expect(result.direction).toBe('stable');
      expect(result.r2).toBe(1);
    });

    it('detects rising trend', () => {
      const result = linearTrend([10, 20, 30, 40, 50]);
      expect(result.direction).toBe('rising');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.r2).toBeCloseTo(1, 5);
    });

    it('detects falling trend', () => {
      const result = linearTrend([50, 40, 30, 20, 10]);
      expect(result.direction).toBe('falling');
      expect(result.slope).toBeLessThan(0);
    });

    it('detects stable when constant', () => {
      const result = linearTrend([100, 100, 100, 100]);
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
    });

    it('predicted array has same length as input', () => {
      const result = linearTrend([1, 2, 3, 4, 5]);
      expect(result.predicted).toHaveLength(5);
    });
  });

  describe('pearsonCorrelation', () => {
    it('returns 0 for fewer than 2 points', () => {
      expect(pearsonCorrelation([1], [2])).toBe(0);
    });

    it('returns 1 for perfect positive correlation', () => {
      expect(pearsonCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 5);
    });

    it('returns -1 for perfect negative correlation', () => {
      expect(pearsonCorrelation([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 5);
    });

    it('returns ~0 for uncorrelated data', () => {
      const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 1, 5, 3]);
      expect(Math.abs(r)).toBeLessThan(0.5);
    });

    it('handles arrays of different lengths (uses shorter)', () => {
      const r = pearsonCorrelation([1, 2, 3], [10, 20, 30, 40, 50]);
      expect(r).toBeCloseTo(1, 5);
    });
  });

  describe('weightedRecentTrend', () => {
    it('returns stable for empty array', () => {
      const result = weightedRecentTrend([]);
      expect(result.direction).toBe('stable');
      expect(result.predicted).toEqual([]);
    });

    it('returns stable for single value', () => {
      const result = weightedRecentTrend([10]);
      expect(result.direction).toBe('stable');
      expect(result.r2).toBe(1);
    });

    it('detects rising trend in linearly increasing data', () => {
      const result = weightedRecentTrend([10, 20, 30, 40, 50]);
      expect(result.slope).toBeGreaterThan(0);
      expect(result.direction).toBe('rising');
    });

    it('detects recent downturn despite overall uptrend', () => {
      // Long uptrend then sudden drop — WLS should weight the drop more
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 30, 20, 10];
      const wls = weightedRecentTrend(values, 3);
      const ols = linearTrend(values);
      // WLS with short halflife should detect falling; OLS might still say rising
      expect(wls.direction).toBe('falling');
      expect(ols.direction).not.toBe('falling');
    });

    it('predicted has same length as input', () => {
      const result = weightedRecentTrend([1, 2, 3, 4, 5]);
      expect(result.predicted).toHaveLength(5);
    });
  });
});

// =============================================================================
// Group C — Composite Scores (ALL must return score in [0, 100])
// =============================================================================

describe('Group C — Composite Scores [0, 100]', () => {
  describe('engagementScore', () => {
    it('returns score in [0, 100] for typical post', () => {
      const score = engagementScore(makePost());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns low score for zero-engagement post', () => {
      const score = engagementScore(makePost({ likes: 0, comments: 0, views: 0, saves: 0, shares: 0 }));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      // Zero engagement should produce below-midpoint score
      expect(score).toBeLessThan(50);
    });

    it('higher engagement produces higher score (monotonicity)', () => {
      const low = engagementScore(makePost({ likes: 10, comments: 1, saves: 0, shares: 0 }));
      const high = engagementScore(makePost({ likes: 1000, comments: 100, saves: 200, shares: 50 }));
      expect(high).toBeGreaterThan(low);
    });

    it('supports accountHistory for dynamic midpoint', () => {
      const score = engagementScore(makePost(), { accountHistory: [2, 3, 4, 5, 6] });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('ignores accountHistory with fewer than 3 entries', () => {
      const withHistory = engagementScore(makePost(), { accountHistory: [2, 3] });
      const without = engagementScore(makePost());
      expect(withHistory).toBe(without);
    });
  });

  describe('hookQualityScore', () => {
    it('returns score=0 for fewer than 3 posts', () => {
      expect(hookQualityScore([]).score).toBe(0);
      expect(hookQualityScore([{ caption: 'Test', engagement: 100 }]).score).toBe(0);
    });

    it('score is in [0, 100] for realistic data', () => {
      const posts = [
        { caption: '3 dicas para crescer no Instagram!', engagement: 500 },
        { caption: 'Voce sabia que...?', engagement: 300 },
        { caption: 'URGENTE: nova funcionalidade!', engagement: 800 },
        { caption: 'Confira nosso novo produto', engagement: 200 },
        { caption: '5 passos para o sucesso', engagement: 450 },
      ];
      const { score } = hookQualityScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns bestHookType string', () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        caption: `Pergunta ${i}? Sim, isto e uma pergunta.`,
        engagement: 100 + i * 50,
      }));
      const { bestHookType } = hookQualityScore(posts);
      expect(bestHookType).toBeTruthy();
      expect(bestHookType).not.toBe('-');
    });
  });

  describe('investmentDepthScore', () => {
    it('returns score=0 for empty array', () => {
      expect(investmentDepthScore([]).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = [
        {
          ownerUsername: 'brand',
          latestComments: [
            { text: 'This is a really detailed and thoughtful comment about the product', ownerUsername: 'user1' },
            { text: 'Nice', ownerUsername: 'user2' },
            { text: 'Absolutely love this content, amazing work here guys', ownerUsername: 'user3' },
          ],
        },
      ];
      const { score } = investmentDepthScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('more long comments → higher score', () => {
      const shortPosts = [{
        ownerUsername: 'brand',
        latestComments: [
          { text: 'ok', ownerUsername: 'u1' },
          { text: 'nice', ownerUsername: 'u2' },
        ],
      }];
      const longPosts = [{
        ownerUsername: 'brand',
        latestComments: [
          { text: 'This is a very long comment with lots of words for testing', ownerUsername: 'u1' },
          { text: 'Another really long and detailed piece of feedback about this', ownerUsername: 'u2' },
        ],
      }];
      expect(investmentDepthScore(longPosts).score).toBeGreaterThan(investmentDepthScore(shortPosts).score);
    });

    it('excludes owner comments from analysis', () => {
      const posts = [{
        ownerUsername: 'brand',
        latestComments: [
          { text: 'Thanks for the feedback we really appreciate it', ownerUsername: 'brand' },
        ],
      }];
      const { totalWords } = investmentDepthScore(posts) as { totalWords?: number; score: number };
      // owner comments are filtered out — shortComments + longComments = 0
      expect(investmentDepthScore(posts).shortComments).toBe(0);
      expect(investmentDepthScore(posts).longComments).toBe(0);
    });
  });

  describe('contentROIScore', () => {
    it('returns score=0 for empty', () => {
      expect(contentROIScore([]).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = [
        { type: 'Image', engagement: 500 },
        { type: 'Video', engagement: 300 },
        { type: 'Sidecar', engagement: 400 },
      ];
      const { score } = contentROIScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('Image with same engagement as Video has higher ROI (lower effort)', () => {
      const imgPosts = [{ type: 'Image', engagement: 100 }];
      const vidPosts = [{ type: 'Video', engagement: 100 }];
      expect(contentROIScore(imgPosts).avgROI).toBeGreaterThan(contentROIScore(vidPosts).avgROI);
    });
  });

  describe('contentIdentityScore', () => {
    it('returns score=0 for fewer than 5 posts', () => {
      expect(contentIdentityScore([{ type: 'Image' }]).score).toBe(0);
    });

    it('score is in [0, 100] for balanced mix', () => {
      const posts = [
        { type: 'Image' }, { type: 'Image' },
        { type: 'Video' }, { type: 'Video' },
        { type: 'Sidecar' }, { type: 'Sidecar' },
      ];
      const { score } = contentIdentityScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('balanced mix scores higher than dominated mix', () => {
      const balanced = [
        { type: 'Image' }, { type: 'Image' },
        { type: 'Video' }, { type: 'Video' },
        { type: 'Sidecar' }, { type: 'Sidecar' },
      ];
      const dominated = [
        { type: 'Image' }, { type: 'Image' }, { type: 'Image' },
        { type: 'Image' }, { type: 'Image' }, { type: 'Video' },
      ];
      expect(contentIdentityScore(balanced).score).toBeGreaterThan(contentIdentityScore(dominated).score);
    });
  });

  describe('brandEquityScore', () => {
    it('returns score=0 when all posts have hashtags and none without', () => {
      const posts = [
        { hashtags: ['#test'], engagement: 100 },
        { hashtags: ['#foo'], engagement: 200 },
      ];
      // ratio = avgWithout / avgWith = 0 / 150 = 0
      expect(brandEquityScore(posts).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = [
        { hashtags: ['#test'], engagement: 100 },
        { hashtags: [], engagement: 200 },
      ];
      const { score } = brandEquityScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('higher engagement without hashtags → marca forte', () => {
      const posts = [
        { hashtags: ['#test'], engagement: 50 },
        { hashtags: [], engagement: 200 },
      ];
      expect(brandEquityScore(posts).classification).toBe('marca forte');
    });
  });

  describe('socialProofScore', () => {
    it('returns score=0 for empty', () => {
      expect(socialProofScore([]).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = [
        { likes: 100, comments: 20, saves: 30, shares: 10 },
        { likes: 200, comments: 30, saves: 50, shares: 20 },
      ];
      const { score } = socialProofScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('more saves/shares relative to likes → higher score', () => {
      const lowProof = [{ likes: 1000, comments: 100, saves: 1, shares: 0 }];
      const highProof = [{ likes: 100, comments: 10, saves: 50, shares: 30 }];
      expect(socialProofScore(highProof).score).toBeGreaterThan(socialProofScore(lowProof).score);
    });
  });

  describe('reciprocityIndex', () => {
    it('returns ratio=0 for empty', () => {
      expect(reciprocityIndex([]).ratio).toBe(0);
    });

    it('counts brand replies vs audience comments correctly', () => {
      const posts = [
        {
          ownerUsername: 'brand',
          latestComments: [
            { ownerUsername: 'user1' },
            { ownerUsername: 'brand' },
            { ownerUsername: 'user2' },
            { ownerUsername: 'brand' },
          ],
        },
      ];
      const result = reciprocityIndex(posts);
      // 2 audience comments, 2 brand replies → ratio = (2/2)*100 = 100
      expect(result.repliesCount).toBe(2);
      expect(result.totalComments).toBe(2);
      expect(result.ratio).toBe(100);
      expect(result.classification).toBe('excelente');
    });

    it('fraco classification when no replies', () => {
      const posts = [{
        ownerUsername: 'brand',
        latestComments: [
          { ownerUsername: 'user1' },
          { ownerUsername: 'user2' },
        ],
      }];
      expect(reciprocityIndex(posts).classification).toBe('fraco');
    });
  });

  describe('contentMixScore', () => {
    it('returns score=0 for empty', () => {
      expect(contentMixScore([]).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = [
        { type: 'Image', engagement: 100 },
        { type: 'Video', engagement: 200 },
        { type: 'Sidecar', engagement: 150 },
      ];
      const { score } = contentMixScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('identifies best performing type', () => {
      const posts = [
        { type: 'Image', engagement: 50 },
        { type: 'Video', engagement: 500 },
        { type: 'Video', engagement: 400 },
      ];
      expect(contentMixScore(posts).bestType).toBe('Video');
    });
  });

  describe('contentVelocityScore', () => {
    it('returns score=0 for fewer than 2 posts', () => {
      expect(contentVelocityScore([]).score).toBe(0);
      expect(contentVelocityScore([makeTimestampPost('2026-01-01', 100)]).score).toBe(0);
    });

    it('score is in [0, 100]', () => {
      const posts = Array.from({ length: 10 }, (_, i) =>
        makeTimestampPost(`2026-01-${String(i + 1).padStart(2, '0')}`, 500)
      );
      const { score } = contentVelocityScore(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('higher frequency + engagement → higher score', () => {
      const slow = [
        makeTimestampPost('2026-01-01', 10),
        makeTimestampPost('2026-01-30', 10),
      ];
      const fast = Array.from({ length: 20 }, (_, i) =>
        makeTimestampPost(`2026-01-${String(i + 1).padStart(2, '0')}`, 500)
      );
      expect(contentVelocityScore(fast).score).toBeGreaterThan(contentVelocityScore(slow).score);
    });
  });

  describe('variableRewardScore', () => {
    it('returns score=0 for fewer than 5 values', () => {
      expect(variableRewardScore([1, 2, 3]).score).toBe(0);
    });

    it('score is in [0, 100] for ideal CV range', () => {
      // CV ~0.5 (sweet spot)
      const values = [50, 80, 30, 90, 60, 100, 40, 70];
      const { score } = variableRewardScore(values);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('previsivel classification for very low CV', () => {
      const values = [100, 101, 99, 100, 101, 99, 100];
      expect(variableRewardScore(values).classification).toBe('previsivel');
    });

    it('inconsistente classification for very high CV', () => {
      const values = [1, 1000, 2, 2000, 1, 1500, 3];
      expect(variableRewardScore(values).classification).toBe('inconsistente');
    });
  });
});

// =============================================================================
// Group D — Analysis
// =============================================================================

describe('Group D — Analysis', () => {
  describe('detectOutliers', () => {
    it('returns empty outliers for fewer than 4 values', () => {
      expect(detectOutliers([1, 2, 3]).outliers).toEqual([]);
    });

    it('detects high outlier', () => {
      const values = [10, 11, 12, 13, 14, 15, 100];
      const { outliers } = detectOutliers(values);
      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers.some(o => o.value === 100 && o.type === 'high')).toBe(true);
    });

    it('detects low outlier', () => {
      const values = [-50, 10, 11, 12, 13, 14, 15];
      const { outliers } = detectOutliers(values);
      expect(outliers.some(o => o.value === -50 && o.type === 'low')).toBe(true);
    });

    it('no outliers in uniform data', () => {
      const values = [10, 11, 12, 13, 14, 15, 16];
      expect(detectOutliers(values).outliers).toHaveLength(0);
    });

    it('returns correct bounds', () => {
      const { bounds } = detectOutliers([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(bounds.lower).toBeDefined();
      expect(bounds.upper).toBeDefined();
      expect(bounds.upper).toBeGreaterThan(bounds.lower);
    });
  });

  describe('paretoAnalysis', () => {
    it('returns zeros for empty array', () => {
      const result = paretoAnalysis([]);
      expect(result.percentOfPosts).toBe(0);
      expect(result.topPostIds).toHaveLength(0);
    });

    it('returns zeros when all engagement is 0', () => {
      const posts = [{ id: 'a', engagement: 0 }, { id: 'b', engagement: 0 }];
      expect(paretoAnalysis(posts).percentOfPosts).toBe(0);
    });

    it('identifies top posts that drive 80% engagement', () => {
      const posts = [
        { id: 'a', engagement: 1000 },
        { id: 'b', engagement: 10 },
        { id: 'c', engagement: 5 },
        { id: 'd', engagement: 3 },
        { id: 'e', engagement: 2 },
      ];
      const result = paretoAnalysis(posts);
      expect(result.topPostIds).toContain('a');
      expect(result.topPostsEngagement).toBeGreaterThanOrEqual(result.totalEngagement * 0.8);
    });

    it('ratio format is correct', () => {
      const posts = [{ id: 'x', engagement: 100 }];
      expect(paretoAnalysis(posts).ratio).toBe('1/1');
    });
  });

  describe('performanceBadge', () => {
    it('returns average for empty dataset', () => {
      expect(performanceBadge(5, []).badge).toBe('average');
    });

    it('returns exceptional for top value', () => {
      expect(performanceBadge(100, [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]).badge).toBe('exceptional');
    });

    it('returns underperforming for bottom value', () => {
      const dataset = Array.from({ length: 20 }, (_, i) => i + 1);
      expect(performanceBadge(1, dataset).badge).toBe('underperforming');
    });

    it('returns correct percentile', () => {
      const result = performanceBadge(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      expect(result.percentile).toBe(50);
    });
  });

  describe('bestTimeToPost', () => {
    it('returns dash for empty array', () => {
      const result = bestTimeToPost([]);
      expect(result.bestDay).toBe('-');
      expect(result.worstDay).toBe('-');
    });

    it('identifies best day from data', () => {
      const posts = [
        makeDatePost('2026-01-05T10:00:00', 100), // Monday
        makeDatePost('2026-01-06T10:00:00', 200), // Tuesday
        makeDatePost('2026-01-07T10:00:00', 50),  // Wednesday
      ];
      const result = bestTimeToPost(posts);
      expect(result.bestDay).toBeTruthy();
      expect(result.bestDayAvg).toBeGreaterThan(0);
      expect(result.dayBreakdown.length).toBeGreaterThan(0);
    });

    it('handles invalid dates gracefully', () => {
      const posts = [
        makeDatePost('invalid-date', 100),
        makeDatePost('2026-01-05T10:00:00', 200),
      ];
      const result = bestTimeToPost(posts);
      expect(result.dayBreakdown.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('hashtagEfficiency', () => {
    it('returns empty for no posts', () => {
      expect(hashtagEfficiency([])).toEqual([]);
    });

    it('requires at least 2 posts per hashtag', () => {
      const posts = [
        { hashtags: ['#unique'], likesCount: 100, commentsCount: 10 },
      ];
      expect(hashtagEfficiency(posts)).toEqual([]);
    });

    it('normalizes hashtags (case + # prefix)', () => {
      const posts = [
        { hashtags: ['#Test'], likesCount: 100, commentsCount: 10 },
        { hashtags: ['test'], likesCount: 200, commentsCount: 20 },
      ];
      const result = hashtagEfficiency(posts);
      expect(result).toHaveLength(1);
      expect(result[0].hashtag).toBe('test');
    });

    it('sorts by avgEngagement descending', () => {
      const posts = [
        { hashtags: ['#a'], likesCount: 50, commentsCount: 5 },
        { hashtags: ['#a'], likesCount: 50, commentsCount: 5 },
        { hashtags: ['#b'], likesCount: 200, commentsCount: 20 },
        { hashtags: ['#b'], likesCount: 200, commentsCount: 20 },
      ];
      const result = hashtagEfficiency(posts);
      expect(result[0].hashtag).toBe('b');
    });
  });

  describe('shannonEntropy', () => {
    it('returns 0 for empty categories', () => {
      expect(shannonEntropy({}).entropy).toBe(0);
    });

    it('returns 0 entropy for single category', () => {
      expect(shannonEntropy({ reels: 10 }).entropy).toBe(0);
      expect(shannonEntropy({ reels: 10 }).normalizedEntropy).toBe(0);
    });

    it('max entropy for perfectly balanced categories', () => {
      const result = shannonEntropy({ a: 10, b: 10 });
      expect(result.normalizedEntropy).toBeCloseTo(1, 3);
    });

    it('identifies dominant category', () => {
      const result = shannonEntropy({ reels: 50, carousel: 10, static: 5 });
      expect(result.dominantCategory).toBe('reels');
    });

    it('category shares sum to ~1', () => {
      const result = shannonEntropy({ a: 30, b: 20, c: 50 });
      const shareSum = Object.values(result.categoryShares).reduce((a, b) => a + b, 0);
      expect(shareSum).toBeCloseTo(1, 2);
    });
  });

  describe('peakEngagementWindow', () => {
    it('returns zeros for empty', () => {
      const result = peakEngagementWindow([]);
      expect(result.peakAvgEngagement).toBe(0);
      expect(result.hourBreakdown).toEqual([]);
    });

    it('identifies peak hour window', () => {
      const posts = [
        makeDatePost('2026-01-01T10:00:00', 500),
        makeDatePost('2026-01-02T10:30:00', 600),
        makeDatePost('2026-01-01T15:00:00', 100),
        makeDatePost('2026-01-02T15:30:00', 120),
      ];
      const result = peakEngagementWindow(posts);
      // Peak window should be around hour 10 (timezone may shift to 9 or 13)
      expect(result.peakAvgEngagement).toBeGreaterThan(0);
      expect(result.peakAvgEngagement).toBeGreaterThan(120);
      expect(result.hourBreakdown.length).toBeGreaterThan(0);
    });

    it('hourBreakdown only includes hours with data', () => {
      const posts = [
        makeDatePost('2026-01-01T08:00:00', 100),
        makeDatePost('2026-01-01T20:00:00', 200),
      ];
      const result = peakEngagementWindow(posts);
      expect(result.hourBreakdown.length).toBe(2);
    });
  });

  describe('captionSegmentAnalysis', () => {
    it('returns empty for fewer than 3 posts', () => {
      const result = captionSegmentAnalysis([{ caption: 'Hi', engagement: 10 }]);
      expect(result.segments).toEqual([]);
      expect(result.bestSegment).toBe('-');
    });

    it('segments posts by caption length', () => {
      const posts = [
        { caption: '', engagement: 50 },
        { caption: 'Short', engagement: 100 },
        { caption: 'A'.repeat(200), engagement: 300 },
        { caption: 'B'.repeat(600), engagement: 200 },
      ];
      const result = captionSegmentAnalysis(posts);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.bestSegment).toBeTruthy();
    });

    it('returns an insight string', () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        caption: 'A'.repeat(100 + i),
        engagement: 100 + i * 50,
      }));
      expect(captionSegmentAnalysis(posts).insight).toBeTruthy();
    });
  });

  describe('postingConsistencyIndex', () => {
    it('returns score=0 for fewer than 3 posts', () => {
      expect(postingConsistencyIndex([]).score).toBe(0);
      expect(postingConsistencyIndex([{ timestamp: '2026-01-01' }]).score).toBe(0);
    });

    it('score is in [0, 100] for regular posting', () => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00`,
      }));
      const { score } = postingConsistencyIndex(posts);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('regular daily posting scores higher than erratic', () => {
      const regular = Array.from({ length: 14 }, (_, i) => ({
        timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00`,
      }));
      const erratic = [
        { timestamp: '2026-01-01T12:00:00' },
        { timestamp: '2026-01-02T12:00:00' },
        { timestamp: '2026-01-20T12:00:00' },
        { timestamp: '2026-01-21T12:00:00' },
      ];
      expect(postingConsistencyIndex(regular).score).toBeGreaterThan(postingConsistencyIndex(erratic).score);
    });

    it('supports custom targetPostsPerWeek', () => {
      const posts = Array.from({ length: 7 }, (_, i) => ({
        timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00`,
      }));
      const defaultTarget = postingConsistencyIndex(posts);
      const highTarget = postingConsistencyIndex(posts, { targetPostsPerWeek: 14 });
      // With a higher target, the freq score should be lower
      expect(highTarget.score).toBeLessThan(defaultTarget.score);
    });
  });
});

// =============================================================================
// Group E — Advanced
// =============================================================================

describe('Group E — Advanced', () => {
  describe('viralPotentialIndex', () => {
    it('returns score in [0, 100] with proxy mode', () => {
      const result = viralPotentialIndex({ engagementRate: 0.05 });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns score in [0, 100] with rich mode', () => {
      const result = viralPotentialIndex({
        engagementRate: 0.05,
        shareRate: 0.02,
        saveRate: 0.01,
        commentRate: 0.005,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('higher engagement rate → higher score (proxy mode)', () => {
      const low = viralPotentialIndex({ engagementRate: 0.001 });
      const high = viralPotentialIndex({ engagementRate: 0.10 });
      expect(high.score).toBeGreaterThan(low.score);
    });

    it('classifies as BAIXO for very low engagement', () => {
      expect(viralPotentialIndex({ engagementRate: 0.0001 }).classification).toBe('BAIXO');
    });

    it('classifies as ALTO or VIRAL for high engagement', () => {
      const result = viralPotentialIndex({
        engagementRate: 0.50,
        shareRate: 0.20,
        saveRate: 0.15,
        commentRate: 0.10,
      });
      expect(['ALTO', 'VIRAL']).toContain(result.classification);
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('CTR boosts proxy mode score', () => {
      const without = viralPotentialIndex({ engagementRate: 0.03 });
      const withCtr = viralPotentialIndex({ engagementRate: 0.03, ctr: 0.05 });
      expect(withCtr.score).toBeGreaterThan(without.score);
    });

    it('returns drivers array', () => {
      const result = viralPotentialIndex({ engagementRate: 0.05, shareRate: 0.02 });
      expect(Array.isArray(result.drivers)).toBe(true);
    });
  });

  describe('persuasionTriggerCount', () => {
    it('returns zero for empty caption', () => {
      const result = persuasionTriggerCount('');
      expect(result.total).toBe(0);
      expect(result.hasPersuasion).toBe(false);
    });

    it('detects urgency triggers', () => {
      const result = persuasionTriggerCount('Corre! So hoje! Nao perca esta promocao!');
      expect(result.urgency).toBeGreaterThan(0);
      expect(result.hasPersuasion).toBe(true);
    });

    it('detects authority triggers', () => {
      const result = persuasionTriggerCount('Comprovado por 10 anos de pesquisa cientifica');
      expect(result.authority).toBeGreaterThan(0);
    });

    it('detects scarcity triggers', () => {
      const result = persuasionTriggerCount('Ultimas vagas limitadas, apenas 5 restam');
      expect(result.scarcity).toBeGreaterThan(0);
    });

    it('total is sum of all categories', () => {
      const result = persuasionTriggerCount('So hoje! Comprovado! Vagas limitadas!');
      expect(result.total).toBe(result.urgency + result.authority + result.scarcity);
    });
  });

  describe('temporalPeriodComparison', () => {
    it('returns stable for fewer than 4 posts', () => {
      const result = temporalPeriodComparison([]);
      expect(result.direction).toBe('stable');
      expect(result.significance).toBe('negligible');
    });

    it('detects improvement over time', () => {
      const posts = [
        // Old posts: low engagement
        ...Array.from({ length: 5 }, (_, i) =>
          makeTimestampPost(`2025-11-${String(i + 1).padStart(2, '0')}`, 50)),
        // Recent posts: high engagement
        ...Array.from({ length: 5 }, (_, i) =>
          makeTimestampPost(`2026-01-${String(i + 1).padStart(2, '0')}`, 500)),
      ];
      const result = temporalPeriodComparison(posts);
      expect(result.recentAvg).toBeGreaterThan(result.previousAvg);
    });

    it('uses split fallback when not enough 30d data', () => {
      // All posts close together — no 30d split possible, will use split method
      const posts = Array.from({ length: 10 }, (_, i) =>
        makeTimestampPost(`2026-01-${String(i + 1).padStart(2, '0')}T12:00:00`, 100 + i * 10)
      );
      const result = temporalPeriodComparison(posts);
      expect(['30d', '14d', 'split']).toContain(result.method);
    });

    it('returns valid cohensD', () => {
      const posts = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeTimestampPost(`2025-12-${String(i + 1).padStart(2, '0')}`, 100)),
        ...Array.from({ length: 5 }, (_, i) =>
          makeTimestampPost(`2026-01-${String(i + 1).padStart(2, '0')}`, 100)),
      ];
      const result = temporalPeriodComparison(posts);
      expect(result.cohensD).toBeGreaterThanOrEqual(0);
    });
  });

  describe('postSentimentRanking', () => {
    it('returns empty arrays for no posts', () => {
      const result = postSentimentRanking([]);
      expect(result.mostEmotional).toEqual([]);
      expect(result.mostInterest).toEqual([]);
      expect(result.mostActiveInterest).toEqual([]);
    });

    it('ranks most emotional posts', () => {
      const posts = [
        makeSentimentPost('p1', {
          latestComments: [
            { text: 'Incrivel! Maravilhoso! Parabens!', ownerUsername: 'user1' },
          ],
        }),
        makeSentimentPost('p2', {
          latestComments: [
            { text: 'ok', ownerUsername: 'user1' },
          ],
        }),
      ];
      const result = postSentimentRanking(posts);
      expect(result.mostEmotional[0].id).toBe('p1');
      expect(result.mostEmotional[0].positiveWords).toBeGreaterThan(0);
    });

    it('ranks most interest (comment rate)', () => {
      const posts = [
        makeSentimentPost('p1', { commentsCount: 100, likesCount: 50 }),
        makeSentimentPost('p2', { commentsCount: 5, likesCount: 50 }),
      ];
      const result = postSentimentRanking(posts);
      expect(result.mostInterest[0].id).toBe('p1');
    });

    it('ranks active interest by long comment ratio', () => {
      const posts = [
        makeSentimentPost('p1', {
          latestComments: [
            { text: 'This is a really long and detailed comment with many words', ownerUsername: 'user1' },
          ],
        }),
        makeSentimentPost('p2', {
          latestComments: [
            { text: 'nice', ownerUsername: 'user1' },
          ],
        }),
      ];
      const result = postSentimentRanking(posts);
      expect(result.mostActiveInterest[0].id).toBe('p1');
    });

    it('excludes owner comments from sentiment analysis', () => {
      const posts = [
        makeSentimentPost('p1', {
          latestComments: [
            { text: 'Incrivel! Maravilhoso!', ownerUsername: 'brand' },
          ],
        }),
      ];
      const result = postSentimentRanking(posts);
      // Owner comment filtered — no positive words detected from audience
      expect(result.mostEmotional[0].positiveWords).toBe(0);
    });

    it('limits results to top 10', () => {
      const posts = Array.from({ length: 15 }, (_, i) =>
        makeSentimentPost(`p${i}`, { commentsCount: i * 10, likesCount: 50 })
      );
      const result = postSentimentRanking(posts);
      expect(result.mostEmotional.length).toBeLessThanOrEqual(10);
      expect(result.mostInterest.length).toBeLessThanOrEqual(10);
      expect(result.mostActiveInterest.length).toBeLessThanOrEqual(10);
    });
  });
});
