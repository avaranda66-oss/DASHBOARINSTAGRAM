// =============================================================================
// attribution.test.ts — Tests for Shapley Values + Markov Chain Attribution
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  shapleyValues,
  estimateTransitionMatrix,
  removalEffect,
} from '@/lib/utils/attribution';
import { approxEqual, isClean, assertUnit } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// estimateTransitionMatrix
// =============================================================================
describe('estimateTransitionMatrix', () => {
  const paths = [
    ['start', 'facebook', 'convert'],
    ['start', 'email', 'facebook', 'convert'],
    ['start', 'google', 'null'],
    ['start', 'facebook', 'null'],
  ];

  it('returns sorted unique states', () => {
    const { states } = estimateTransitionMatrix(paths);
    const expected = ['convert', 'email', 'facebook', 'google', 'null', 'start'];
    expect(states).toEqual(expected);
  });

  it('produces a stochastic matrix (each row sums to ~1 or 0)', () => {
    const { P } = estimateTransitionMatrix(paths);
    for (const row of P) {
      const rowSum = row.reduce((a, v) => a + v, 0);
      // Either the row sums to ~1 (active state) or 0 (absorbing state)
      expect(rowSum === 0 || approxEqual(rowSum, 1, 1e-3)).toBe(true);
    }
  });

  it('has correct dimensions N x N', () => {
    const { states, P } = estimateTransitionMatrix(paths);
    const n = states.length;
    expect(P.length).toBe(n);
    for (const row of P) {
      expect(row.length).toBe(n);
    }
  });

  it('absorbing states have zero rows', () => {
    const { states, P } = estimateTransitionMatrix(paths);
    // 'convert' and 'null' are terminal — they never appear as a "from" state
    const convertIdx = states.indexOf('convert');
    const nullIdx = states.indexOf('null');

    expect(P[convertIdx].reduce((a, v) => a + v, 0)).toBe(0);
    expect(P[nullIdx].reduce((a, v) => a + v, 0)).toBe(0);
  });

  it('handles empty paths array', () => {
    const { states, P } = estimateTransitionMatrix([]);
    expect(states).toEqual([]);
    expect(P).toEqual([]);
  });

  it('handles single-step paths (no transitions)', () => {
    const { states, P } = estimateTransitionMatrix([['a'], ['b']]);
    expect(states).toEqual(['a', 'b']);
    // No transitions recorded, all rows should be zero
    for (const row of P) {
      expect(row.reduce((a, v) => a + v, 0)).toBe(0);
    }
  });

  it('handles paths with a single transition', () => {
    const { states, P } = estimateTransitionMatrix([['a', 'b']]);
    expect(states).toEqual(['a', 'b']);
    const aIdx = states.indexOf('a');
    const bIdx = states.indexOf('b');
    expect(P[aIdx][bIdx]).toBe(1);
  });

  it('all matrix values are non-negative', () => {
    const { P } = estimateTransitionMatrix(paths);
    for (const row of P) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// =============================================================================
// shapleyValues
// =============================================================================
describe('shapleyValues', () => {
  it('assigns equal values to symmetric 2-channel system', () => {
    // Each channel alone = 0.5, together = 1.0, empty = 0
    const phi = shapleyValues(['A', 'B'], (coalition) => {
      if (coalition.length === 0) return 0;
      if (coalition.length === 2) return 1;
      return 0.5;
    });

    expect(approxEqual(phi['A'], phi['B'], 1e-4)).toBe(true);
    expect(approxEqual(phi['A'] + phi['B'], 1, 1e-4)).toBe(true);
  });

  it('assigns full credit to a single channel', () => {
    const phi = shapleyValues(['solo'], (coalition) => {
      return coalition.length > 0 ? 1 : 0;
    });

    expect(approxEqual(phi['solo'], 1, 1e-4)).toBe(true);
  });

  it('sum of Shapley values equals v(grand coalition)', () => {
    const phi = shapleyValues(['A', 'B', 'C'], (coalition) => {
      if (coalition.length === 0) return 0;
      if (coalition.includes('A') && coalition.includes('C')) return 0.9;
      if (coalition.includes('A')) return 0.6;
      if (coalition.includes('C')) return 0.4;
      return 0.2;
    });

    const sum = phi['A'] + phi['B'] + phi['C'];
    // v(grand coalition) = v({A,B,C})
    const grandValue = 0.9; // A+C present, plus B doesn't add
    // Actually need to compute v({A,B,C}) with our function
    const vGrand = 0.9; // includes A and C
    expect(approxEqual(sum, vGrand, 1e-3)).toBe(true);
  });

  it('null player gets zero credit', () => {
    // Player 'dummy' adds nothing to any coalition
    const phi = shapleyValues(['real', 'dummy'], (coalition) => {
      return coalition.includes('real') ? 1 : 0;
    });

    expect(approxEqual(phi['dummy'], 0, 1e-4)).toBe(true);
    expect(approxEqual(phi['real'], 1, 1e-4)).toBe(true);
  });

  it('returns empty object for empty players', () => {
    const phi = shapleyValues([], () => 0);
    expect(Object.keys(phi).length).toBe(0);
  });

  it('handles 3 symmetric players', () => {
    const phi = shapleyValues(['A', 'B', 'C'], (coalition) => {
      return coalition.length / 3;
    });

    // Each should get 1/3 of v({A,B,C}) = 1
    expect(approxEqual(phi['A'], 1 / 3, 1e-3)).toBe(true);
    expect(approxEqual(phi['B'], 1 / 3, 1e-3)).toBe(true);
    expect(approxEqual(phi['C'], 1 / 3, 1e-3)).toBe(true);
  });

  it('throws for more than 20 players', () => {
    const players = Array.from({ length: 21 }, (_, i) => `p${i}`);
    expect(() => shapleyValues(players, () => 0)).toThrow();
  });

  it('produces clean numeric values for all players', () => {
    const phi = shapleyValues(['X', 'Y'], (c) => c.length * 0.5);
    expect(isClean(phi['X'])).toBe(true);
    expect(isClean(phi['Y'])).toBe(true);
  });
});

// =============================================================================
// removalEffect
// =============================================================================
describe('removalEffect', () => {
  const paths = [
    ['start', 'facebook', 'convert'],
    ['start', 'facebook', 'convert'],
    ['start', 'email', 'facebook', 'convert'],
    ['start', 'email', 'convert'],
    ['start', 'google', 'null'],
  ];

  const matrix = estimateTransitionMatrix(paths);

  it('returns a value in [0, 1]', () => {
    const re = removalEffect(matrix, 'facebook', 'start', 'convert');
    expect(re).toBeGreaterThanOrEqual(0);
    expect(re).toBeLessThanOrEqual(1);
  });

  it('facebook has high removal effect (most paths go through it)', () => {
    const reFb = removalEffect(matrix, 'facebook', 'start', 'convert');
    expect(reFb).toBeGreaterThan(0);
  });

  it('google has zero removal effect (never leads to convert)', () => {
    const reGoogle = removalEffect(matrix, 'google', 'start', 'convert');
    expect(reGoogle).toBe(0);
  });

  it('returns 0 for a channel not in the matrix', () => {
    const re = removalEffect(matrix, 'tiktok', 'start', 'convert');
    expect(re).toBe(0);
  });

  it('returns 0 when start state is missing', () => {
    const re = removalEffect(matrix, 'facebook', 'missing', 'convert');
    expect(re).toBe(0);
  });

  it('returns 0 when conversion state is missing', () => {
    const re = removalEffect(matrix, 'facebook', 'start', 'missing');
    expect(re).toBe(0);
  });

  it('produces clean numeric removal effect', () => {
    const re = removalEffect(matrix, 'email', 'start', 'convert');
    expect(isClean(re)).toBe(true);
  });

  it('removal effect of sole converter channel is 1', () => {
    // All paths go through the only channel
    const singlePaths = [
      ['start', 'only', 'convert'],
      ['start', 'only', 'convert'],
    ];
    const m = estimateTransitionMatrix(singlePaths);
    const re = removalEffect(m, 'only', 'start', 'convert');
    expect(approxEqual(re, 1, 1e-3)).toBe(true);
  });
});
