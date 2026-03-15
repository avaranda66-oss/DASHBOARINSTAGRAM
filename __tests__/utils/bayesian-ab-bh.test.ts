import { describe, it, expect } from 'vitest';

// Tests for Benjamini-Hochberg multiple testing correction
// Inline implementation mirror (copied from ads-ab-testing-panel.tsx)

function bhCorrection(pValues: number[], alpha = 0.05): boolean[] {
    const m = pValues.length;
    if (m === 0) return [];
    const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    const threshold = sorted.findLastIndex((s, k) => s.p <= ((k + 1) / m) * alpha);
    return pValues.map((_, i) => sorted.findIndex(s => s.i === i) <= threshold);
}

function bonferroniCorrection(pValues: number[], alpha = 0.05): boolean[] {
    const threshold = alpha / pValues.length;
    return pValues.map(p => p <= threshold);
}

describe('bhCorrection', () => {
    it('rejects nothing when all p-values are large', () => {
        const pValues = [0.5, 0.6, 0.7, 0.8, 0.9];
        const result = bhCorrection(pValues);
        expect(result.every(r => r === false)).toBe(true);
    });

    it('rejects the clearly significant p-value', () => {
        // 5 tests: one very small, four large
        const pValues = [0.001, 0.4, 0.5, 0.6, 0.7];
        const result = bhCorrection(pValues);
        expect(result[0]).toBe(true);
        expect(result.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    });

    it('BH rejects at least as many as Bonferroni (BH is more powerful)', () => {
        // Mixed p-values: some small, some not
        const pValues = [0.001, 0.01, 0.03, 0.1, 0.5];
        const bh = bhCorrection(pValues);
        const bonf = bonferroniCorrection(pValues);
        const bhCount = bh.filter(Boolean).length;
        const bonfCount = bonf.filter(Boolean).length;
        // BH should reject >= Bonferroni rejections
        expect(bhCount).toBeGreaterThanOrEqual(bonfCount);
    });

    it('returns empty array for empty input', () => {
        expect(bhCorrection([])).toEqual([]);
    });

    it('handles single p-value correctly', () => {
        expect(bhCorrection([0.03])).toEqual([true]);
        expect(bhCorrection([0.06])).toEqual([false]);
    });
});
