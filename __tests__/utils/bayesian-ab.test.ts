import { describe, it, expect } from 'vitest';
import {
  chiSquaredProportions,
  bayesianAB,
  sprtTest,
  fisherExact2x2,
} from '@/lib/utils/bayesian-ab';
import { approxEqual, withinRange, isClean, assertUnit } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// chiSquaredProportions
// =============================================================================
describe('chiSquaredProportions', () => {
  describe('significant difference (500/10000 vs 600/10000)', () => {
    const result = chiSquaredProportions(500, 10000, 600, 10000);

    it('detects significant difference', () => {
      expect(result.significant).toBe(true);
    });

    it('pValue is below 0.05', () => {
      expect(result.pValue).toBeLessThan(0.05);
    });

    it('chiSq is positive', () => {
      expect(result.chiSq).toBeGreaterThan(0);
    });

    it('effectPercent is positive (B has higher CTR)', () => {
      expect(result.effectPercent).toBeGreaterThan(0);
    });

    it('ctrA is approximately 0.05', () => {
      expect(approxEqual(result.ctrA, 0.05, 0.001)).toBe(true);
    });

    it('ctrB is approximately 0.06', () => {
      expect(approxEqual(result.ctrB, 0.06, 0.001)).toBe(true);
    });

    it('effectPercent is approximately 20%', () => {
      expect(approxEqual(result.effectPercent, 20, 1)).toBe(true);
    });

    it('does not apply Yates correction (large samples)', () => {
      expect(result.yatesCorrectionApplied).toBe(false);
    });
  });

  describe('identical rates (not significant)', () => {
    const result = chiSquaredProportions(500, 10000, 500, 10000);

    it('is not significant', () => {
      expect(result.significant).toBe(false);
    });

    it('pValue is close to 1', () => {
      expect(result.pValue).toBeGreaterThan(0.5);
    });

    it('effectPercent is 0', () => {
      expect(result.effectPercent).toBe(0);
    });

    it('chiSq is 0', () => {
      expect(result.chiSq).toBe(0);
    });
  });

  describe('small samples trigger Yates correction', () => {
    const result = chiSquaredProportions(3, 20, 8, 20);

    it('applies Yates correction', () => {
      expect(result.yatesCorrectionApplied).toBe(true);
    });

    it('pValue is a valid probability', () => {
      expect(withinRange(result.pValue, 0, 1)).toBe(true);
    });
  });

  describe('custom alpha = 0.01', () => {
    const result = chiSquaredProportions(500, 10000, 520, 10000, 0.01);

    it('marginal difference is not significant at alpha=0.01', () => {
      // 5.0% vs 5.2% is a tiny effect, likely not significant at 0.01
      expect(result.pValue).toBeGreaterThan(0.01);
      expect(result.significant).toBe(false);
    });
  });

  describe('edge: zero impressions', () => {
    const result = chiSquaredProportions(0, 0, 10, 100);

    it('returns default result', () => {
      expect(result.significant).toBe(false);
      expect(result.pValue).toBe(1);
      expect(result.chiSq).toBe(0);
    });
  });

  describe('edge: zero clicks both', () => {
    const result = chiSquaredProportions(0, 1000, 0, 1000);

    it('is not significant', () => {
      expect(result.significant).toBe(false);
    });

    it('effectPercent is 0', () => {
      expect(result.effectPercent).toBe(0);
    });
  });

  describe('edge: negative inputs', () => {
    const result = chiSquaredProportions(-5, 100, 10, 100);

    it('returns default result', () => {
      expect(result.significant).toBe(false);
      expect(result.pValue).toBe(1);
    });
  });

  describe('output cleanliness', () => {
    const result = chiSquaredProportions(100, 5000, 150, 5000);

    it('all numeric fields are clean', () => {
      expect(isClean(result.chiSq)).toBe(true);
      expect(isClean(result.pValue)).toBe(true);
      expect(isClean(result.effectPercent)).toBe(true);
      expect(isClean(result.ctrA)).toBe(true);
      expect(isClean(result.ctrB)).toBe(true);
    });
  });
});

// =============================================================================
// bayesianAB
// =============================================================================
describe('bayesianAB', () => {
  describe('clear winner: A much better (1000/10000 vs 100/10000)', () => {
    const result = bayesianAB(1000, 10000, 100, 10000);

    it('probBWins is near 0 (A is clearly better)', () => {
      expect(result.probBWins).toBeLessThan(0.05);
    });

    it('recommendation is keep_A', () => {
      expect(result.recommendation).toBe('keep_A');
    });

    it('posteriorMeanA > posteriorMeanB', () => {
      expect(result.posteriorMeanA).toBeGreaterThan(result.posteriorMeanB);
    });

    it('credible interval upper bound is negative (B worse than A)', () => {
      expect(result.credibleInterval.upper).toBeLessThan(0);
    });

    it('expectedLoss is small (A is clearly better)', () => {
      expect(result.expectedLoss).toBeLessThan(0.1);
    });
  });

  describe('clear winner: B much better', () => {
    const result = bayesianAB(100, 10000, 1000, 10000);

    it('probBWins is near 1', () => {
      expect(result.probBWins).toBeGreaterThan(0.95);
    });

    it('recommendation is deploy_B', () => {
      expect(result.recommendation).toBe('deploy_B');
    });
  });

  describe('symmetric case (equal rates)', () => {
    const result = bayesianAB(500, 10000, 500, 10000);

    it('probBWins is near 0.5', () => {
      expect(withinRange(result.probBWins, 0.4, 0.6)).toBe(true);
    });

    it('recommendation is inconclusive', () => {
      expect(result.recommendation).toBe('inconclusive');
    });

    it('credible interval spans zero', () => {
      expect(result.credibleInterval.lower).toBeLessThan(0);
      expect(result.credibleInterval.upper).toBeGreaterThan(0);
    });

    it('posteriorMeanA and posteriorMeanB are approximately equal', () => {
      expect(
        approxEqual(result.posteriorMeanA, result.posteriorMeanB, 0.001)
      ).toBe(true);
    });
  });

  describe('deterministic with seed', () => {
    const r1 = bayesianAB(300, 5000, 350, 5000, { seed: 123 });
    const r2 = bayesianAB(300, 5000, 350, 5000, { seed: 123 });

    it('same seed produces identical probBWins', () => {
      expect(r1.probBWins).toBe(r2.probBWins);
    });

    it('same seed produces identical expectedLoss', () => {
      expect(r1.expectedLoss).toBe(r2.expectedLoss);
    });
  });

  describe('custom threshold', () => {
    // B slightly better — at high threshold this should be inconclusive
    const result = bayesianAB(480, 10000, 520, 10000, { threshold: 0.99 });

    it('inconclusive with very high threshold', () => {
      expect(result.recommendation).toBe('inconclusive');
    });
  });

  describe('edge: zero impressions', () => {
    const result = bayesianAB(0, 0, 10, 100);

    it('returns default inconclusive result', () => {
      expect(result.recommendation).toBe('inconclusive');
      expect(result.probBWins).toBe(0.5);
    });
  });

  describe('edge: all zeros', () => {
    const result = bayesianAB(0, 100, 0, 100);

    it('probBWins is near 0.5', () => {
      expect(withinRange(result.probBWins, 0.4, 0.6)).toBe(true);
    });

    it('recommendation is inconclusive', () => {
      expect(result.recommendation).toBe('inconclusive');
    });
  });

  describe('output cleanliness', () => {
    const result = bayesianAB(200, 5000, 250, 5000);

    it('probBWins is in [0, 1]', () => {
      expect(assertUnit(result.probBWins)).toBe(true);
    });

    it('posteriorMeanA is in [0, 1]', () => {
      expect(assertUnit(result.posteriorMeanA)).toBe(true);
    });

    it('posteriorMeanB is in [0, 1]', () => {
      expect(assertUnit(result.posteriorMeanB)).toBe(true);
    });

    it('expectedLoss is non-negative', () => {
      expect(result.expectedLoss).toBeGreaterThanOrEqual(0);
    });

    it('credible interval lower <= upper', () => {
      expect(result.credibleInterval.lower).toBeLessThanOrEqual(
        result.credibleInterval.upper
      );
    });
  });
});

// =============================================================================
// sprtTest
// =============================================================================
describe('sprtTest', () => {
  describe('sequential data with clear winner', () => {
    // A: 5% CTR, B: 15% CTR — B is clearly better, large delta
    const n = 1000;
    const clicksA: number[] = [];
    const clicksB: number[] = [];
    for (let i = 0; i < n; i++) {
      clicksA.push(i % 20 === 0 ? 1 : 0); // ~5%
      clicksB.push(i % 7 === 0 ? 1 : 0);  // ~14.3%
    }
    const result = sprtTest(clicksA, clicksB, { delta: 0.05 });

    it('canStop is true with sufficient data and large effect', () => {
      expect(result.canStop).toBe(true);
    });

    it('decision is accept_H1 (B is better)', () => {
      expect(result.decision).toBe('accept_H1');
    });

    it('sampleSize equals min of both arrays', () => {
      expect(result.sampleSize).toBe(n);
    });

    it('logLikelihoodRatio is a clean number', () => {
      expect(isClean(result.logLikelihoodRatio)).toBe(true);
    });
  });

  describe('with identical rates', () => {
    const n = 50;
    const clicks: number[] = [];
    for (let i = 0; i < n; i++) {
      clicks.push(i % 20 === 0 ? 1 : 0);
    }
    const result = sprtTest(clicks, [...clicks]);

    it('logLikelihoodRatio is near 0', () => {
      expect(Math.abs(result.logLikelihoodRatio)).toBeLessThan(1);
    });
  });

  describe('boundaries', () => {
    const result = sprtTest([1, 0, 0], [0, 1, 0]);

    it('boundary A is positive', () => {
      expect(result.boundaries.A).toBeGreaterThan(0);
    });

    it('boundary B is greater than boundary A', () => {
      expect(result.boundaries.B).toBeGreaterThan(result.boundaries.A);
    });
  });

  describe('custom options', () => {
    const clicksA = Array.from({ length: 100 }, (_, i) => (i % 10 === 0 ? 1 : 0));
    const clicksB = Array.from({ length: 100 }, (_, i) => (i % 8 === 0 ? 1 : 0));

    it('tighter alpha gives wider boundaries', () => {
      const loose = sprtTest(clicksA, clicksB, { alpha: 0.10 });
      const strict = sprtTest(clicksA, clicksB, { alpha: 0.01 });
      expect(strict.boundaries.B).toBeGreaterThan(loose.boundaries.B);
    });
  });

  describe('edge: empty arrays', () => {
    const result = sprtTest([], []);

    it('returns continue decision', () => {
      expect(result.decision).toBe('continue');
    });

    it('canStop is false', () => {
      expect(result.canStop).toBe(false);
    });

    it('sampleSize is 0', () => {
      expect(result.sampleSize).toBe(0);
    });

    it('logLikelihoodRatio is 0', () => {
      expect(result.logLikelihoodRatio).toBe(0);
    });
  });

  describe('edge: unequal array lengths', () => {
    const a = [1, 0, 0, 1, 0];
    const b = [0, 1, 0];
    const result = sprtTest(a, b);

    it('sampleSize equals min of both lengths', () => {
      expect(result.sampleSize).toBe(3);
    });
  });

  describe('edge: all zeros', () => {
    const result = sprtTest(
      Array.from({ length: 20 }, () => 0),
      Array.from({ length: 20 }, () => 0)
    );

    it('returns a valid decision', () => {
      expect(['accept_H1', 'accept_H0', 'continue']).toContain(result.decision);
    });

    it('sampleSize is 20', () => {
      expect(result.sampleSize).toBe(20);
    });
  });

  describe('edge: all ones', () => {
    const result = sprtTest(
      Array.from({ length: 20 }, () => 1),
      Array.from({ length: 20 }, () => 1)
    );

    it('returns a valid result', () => {
      expect(isClean(result.logLikelihoodRatio)).toBe(true);
    });
  });
});

// =============================================================================
// fisherExact2x2
// =============================================================================
describe('fisherExact2x2', () => {
  describe('small sample (5, 3, 2, 6)', () => {
    const result = fisherExact2x2(5, 3, 2, 6);

    it('pValue is a valid probability', () => {
      expect(withinRange(result.pValue, 0, 1)).toBe(true);
    });

    it('oddsRatio is positive', () => {
      expect(result.oddsRatio).toBeGreaterThan(0);
    });

    it('oddsRatio is approximately (5*6)/(3*2) = 5', () => {
      expect(approxEqual(result.oddsRatio, 5, 0.1)).toBe(true);
    });

    it('significant field is boolean', () => {
      expect(typeof result.significant).toBe('boolean');
    });
  });

  describe('clearly significant case (3, 17, 10, 10)', () => {
    const result = fisherExact2x2(3, 17, 10, 10);

    it('pValue is below 0.05', () => {
      expect(result.pValue).toBeLessThan(0.05);
    });

    it('result is significant', () => {
      expect(result.significant).toBe(true);
    });
  });

  describe('identical distributions → not significant', () => {
    const result = fisherExact2x2(10, 90, 10, 90);

    it('pValue is close to 1', () => {
      expect(result.pValue).toBeGreaterThan(0.9);
    });

    it('is not significant', () => {
      expect(result.significant).toBe(false);
    });

    it('oddsRatio is approximately 1', () => {
      expect(approxEqual(result.oddsRatio, 1, 0.1)).toBe(true);
    });
  });

  describe('zero cells handled with Haldane-Anscombe correction', () => {
    const result = fisherExact2x2(5, 0, 3, 8);

    it('pValue is valid', () => {
      expect(withinRange(result.pValue, 0, 1)).toBe(true);
    });

    it('oddsRatio uses +0.5 correction (not Infinity)', () => {
      expect(isFinite(result.oddsRatio)).toBe(true);
      expect(result.oddsRatio).toBeGreaterThan(0);
    });
  });

  describe('all zeros → edge case', () => {
    const result = fisherExact2x2(0, 0, 0, 0);

    it('pValue is 1 (no data)', () => {
      expect(result.pValue).toBe(1);
    });

    it('is not significant', () => {
      expect(result.significant).toBe(false);
    });
  });

  describe('equal counts (5, 5, 5, 5)', () => {
    const result = fisherExact2x2(5, 5, 5, 5);

    it('pValue is 1 (perfectly balanced)', () => {
      expect(result.pValue).toBeGreaterThan(0.9);
    });

    it('oddsRatio is approximately 1', () => {
      expect(approxEqual(result.oddsRatio, 1, 0.1)).toBe(true);
    });

    it('is not significant', () => {
      expect(result.significant).toBe(false);
    });
  });

  describe('custom alpha = 0.01', () => {
    const result = fisherExact2x2(3, 17, 10, 10, 0.01);

    it('may not be significant at stricter alpha', () => {
      // p-value ~0.037 from the example, so not significant at 0.01
      if (result.pValue > 0.01) {
        expect(result.significant).toBe(false);
      }
    });
  });

  describe('negative inputs', () => {
    const result = fisherExact2x2(-1, 5, 3, 8);

    it('returns default non-significant result', () => {
      expect(result.significant).toBe(false);
      expect(result.pValue).toBe(1);
      expect(result.oddsRatio).toBe(1);
    });
  });

  describe('large sample sizes', () => {
    const result = fisherExact2x2(50, 950, 70, 930);

    it('pValue is valid', () => {
      expect(withinRange(result.pValue, 0, 1)).toBe(true);
    });

    it('oddsRatio is a clean number', () => {
      expect(isClean(result.oddsRatio)).toBe(true);
    });

    it('significant field is boolean', () => {
      expect(typeof result.significant).toBe('boolean');
    });
  });

  describe('one-sided extreme (all clicks in A, none in B)', () => {
    const result = fisherExact2x2(10, 0, 0, 10);

    it('is significant', () => {
      expect(result.significant).toBe(true);
    });

    it('pValue is very small', () => {
      expect(result.pValue).toBeLessThan(0.01);
    });

    it('oddsRatio is very large (with correction)', () => {
      expect(result.oddsRatio).toBeGreaterThan(10);
    });
  });
});
