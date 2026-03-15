/**
 * Testes focados para lib/utils/statistics.ts
 * Cobertura ampla disponível em __tests__/utils/statistics.test.ts
 * Este arquivo cobre as 5 funções mais críticas com cenários adicionais.
 */

import { describe, it, expect } from 'vitest';
import {
    growthRate,
    descriptiveStats,
    linearTrend,
    engagementScore,
    detectOutliers,
} from '../lib/utils/statistics';

// =============================================================================
// growthRate — função central para KPIs
// =============================================================================

describe('growthRate', () => {
    it('retorna 0 para array vazio', () => {
        expect(growthRate([])).toBe(0);
    });

    it('retorna 0 para array com 1 elemento', () => {
        expect(growthRate([42])).toBe(0);
    });

    it('calcula crescimento de 100%', () => {
        expect(growthRate([50, 100])).toBe(100);
    });

    it('calcula queda de -50%', () => {
        expect(growthRate([100, 50])).toBe(-50);
    });

    it('retorna 100 quando primeiro é 0 e último positivo', () => {
        expect(growthRate([0, 10])).toBe(100);
    });

    it('retorna 0 quando ambos são 0', () => {
        expect(growthRate([0, 0])).toBe(0);
    });

    it('usa apenas primeiro e último valor (ignora intermediários)', () => {
        // [10, 999, 999, 20] — crescimento de 10→20 = 100%
        expect(growthRate([10, 999, 999, 20])).toBe(100);
    });
});

// =============================================================================
// descriptiveStats — estatísticas descritivas
// =============================================================================

describe('descriptiveStats', () => {
    it('retorna zeros para array vazio', () => {
        const r = descriptiveStats([]);
        expect(r.mean).toBe(0);
        expect(r.count).toBe(0);
        expect(r.stdDev).toBe(0);
    });

    it('média correta para [2,4,6,8,10]', () => {
        const r = descriptiveStats([2, 4, 6, 8, 10]);
        expect(r.mean).toBe(6);
        expect(r.median).toBe(6);
        expect(r.min).toBe(2);
        expect(r.max).toBe(10);
    });

    it('stdDev com correção de Bessel (n-1)', () => {
        // [2,4,6]: variância = ((2-4)²+(4-4)²+(6-4)²) / 2 = 4 → stdDev = 2
        expect(descriptiveStats([2, 4, 6]).stdDev).toBe(2);
    });

    it('cv = 0 quando média = 0', () => {
        expect(descriptiveStats([-1, 0, 1]).cv).toBe(0);
    });

    it('q1 < mediana < q3 para dataset simétrico', () => {
        const r = descriptiveStats([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(r.q1).toBeLessThan(r.median);
        expect(r.q3).toBeGreaterThan(r.median);
        expect(r.iqr).toBeCloseTo(r.q3 - r.q1, 10);
    });
});

// =============================================================================
// linearTrend — direção da tendência
// =============================================================================

describe('linearTrend', () => {
    it('retorna stable para array vazio', () => {
        expect(linearTrend([]).direction).toBe('stable');
    });

    it('detecta tendência crescente', () => {
        const r = linearTrend([10, 20, 30, 40, 50]);
        expect(r.direction).toBe('rising');
        expect(r.slope).toBeGreaterThan(0);
        expect(r.r2).toBeCloseTo(1, 5);
    });

    it('detecta tendência decrescente', () => {
        const r = linearTrend([50, 40, 30, 20, 10]);
        expect(r.direction).toBe('falling');
        expect(r.slope).toBeLessThan(0);
    });

    it('detecta estabilidade para série constante', () => {
        const r = linearTrend([100, 100, 100, 100]);
        expect(r.direction).toBe('stable');
        expect(r.slope).toBe(0);
    });

    it('predicted tem o mesmo comprimento que input', () => {
        const r = linearTrend([1, 2, 3, 4, 5]);
        expect(r.predicted).toHaveLength(5);
    });
});

// =============================================================================
// engagementScore — score de engajamento [0, 100]
// =============================================================================

describe('engagementScore', () => {
    const makePost = (overrides: Record<string, unknown> = {}) => ({
        likes: 100, comments: 10, views: 1000, saves: 20, shares: 5, ...overrides,
    });

    it('retorna score entre 0 e 100 para post típico', () => {
        const score = engagementScore(makePost());
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    it('post com zero engajamento retorna score < 50', () => {
        const score = engagementScore(makePost({ likes: 0, comments: 0, views: 0, saves: 0, shares: 0 }));
        expect(score).toBeLessThan(50);
    });

    it('engajamento maior produz score maior (monotonicidade)', () => {
        const low = engagementScore(makePost({ likes: 10, comments: 1, saves: 0, shares: 0 }));
        const high = engagementScore(makePost({ likes: 1000, comments: 100, saves: 200, shares: 50 }));
        expect(high).toBeGreaterThan(low);
    });
});

// =============================================================================
// detectOutliers — detecção de outliers via IQR
// =============================================================================

describe('detectOutliers', () => {
    it('retorna lista vazia para menos de 4 valores', () => {
        expect(detectOutliers([1, 2, 3]).outliers).toEqual([]);
    });

    it('detecta outlier alto', () => {
        const { outliers } = detectOutliers([10, 11, 12, 13, 14, 15, 100]);
        expect(outliers.some(o => o.value === 100 && o.type === 'high')).toBe(true);
    });

    it('detecta outlier baixo', () => {
        const { outliers } = detectOutliers([-50, 10, 11, 12, 13, 14, 15]);
        expect(outliers.some(o => o.value === -50 && o.type === 'low')).toBe(true);
    });

    it('dados uniformes não têm outliers', () => {
        expect(detectOutliers([10, 11, 12, 13, 14, 15, 16]).outliers).toHaveLength(0);
    });

    it('bounds.upper > bounds.lower', () => {
        const { bounds } = detectOutliers([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(bounds.upper).toBeGreaterThan(bounds.lower);
    });
});
