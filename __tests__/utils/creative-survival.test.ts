import { describe, it, expect } from 'vitest';
import {
    buildSurvivalData,
    kaplanMeier,
    getMedianLifespan,
    getSurvivalAt,
} from '@/lib/utils/creative-survival';
import { AdInsight } from '@/types/ads';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeInsight(adId: string, adName: string, day: number, ctr: number, frequency: number): AdInsight {
    const date = new Date(2026, 0, 1 + day);
    const dateStr = date.toISOString().split('T')[0];
    return {
        ad_id: adId,
        ad_name: adName,
        impressions: '1000',
        clicks: String(Math.round(ctr * 10)),
        spend: '10',
        ctr: String(ctr),
        frequency: String(frequency),
        date_start: dateStr,
        date_stop: dateStr,
    };
}

function makeAdInsights(adId: string, adName: string, days: { ctr: number; freq: number }[]): AdInsight[] {
    return days.map((d, i) => makeInsight(adId, adName, i, d.ctr, d.freq));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('buildSurvivalData', () => {
    it('deve retornar array vazio para ads com < 7 dias', () => {
        const insights = makeAdInsights('ad1', 'Ad 1', [
            { ctr: 2.0, freq: 1.0 },
            { ctr: 1.9, freq: 1.2 },
            { ctr: 1.8, freq: 1.5 },
        ]);
        const result = buildSurvivalData(insights);
        expect(result).toHaveLength(0);
    });

    it('deve detectar evento de fadiga e censurar corretamente', () => {
        // Ad 1: CTR alto, depois cai e freq sobe — deve fatiguar
        const ad1 = makeAdInsights('ad1', 'Fatigued Ad', [
            { ctr: 3.0, freq: 1.0 },
            { ctr: 3.2, freq: 1.2 },
            { ctr: 3.1, freq: 1.5 },
            { ctr: 2.9, freq: 1.8 },
            { ctr: 2.8, freq: 2.0 },
            { ctr: 2.5, freq: 2.5 },
            { ctr: 2.0, freq: 2.8 },
            // Dia 7: CTR=1.5 (pico=3.2, 80%=2.56), freq=3.5 → EVENTO
            { ctr: 1.5, freq: 3.5 },
            { ctr: 1.2, freq: 4.0 },
            { ctr: 1.0, freq: 4.5 },
        ]);

        // Ad 2: CTR estável, freq baixa — deve censurar
        const ad2 = makeAdInsights('ad2', 'Healthy Ad', [
            { ctr: 2.0, freq: 1.0 },
            { ctr: 2.1, freq: 1.1 },
            { ctr: 2.0, freq: 1.2 },
            { ctr: 1.9, freq: 1.3 },
            { ctr: 2.0, freq: 1.4 },
            { ctr: 1.8, freq: 1.5 },
            { ctr: 1.9, freq: 1.6 },
            { ctr: 2.0, freq: 1.7 },
            { ctr: 1.8, freq: 1.8 },
            { ctr: 1.9, freq: 1.9 },
        ]);

        // Ad 3: CTR cai mas freq < 3 — deve censurar (não atende ambos critérios)
        const ad3 = makeAdInsights('ad3', 'Low Freq Ad', [
            { ctr: 4.0, freq: 1.0 },
            { ctr: 3.8, freq: 1.1 },
            { ctr: 3.5, freq: 1.2 },
            { ctr: 3.0, freq: 1.3 },
            { ctr: 2.5, freq: 1.4 },
            { ctr: 2.0, freq: 1.5 },
            { ctr: 1.5, freq: 1.6 },
            { ctr: 1.0, freq: 1.7 },
            { ctr: 0.8, freq: 1.8 },
            { ctr: 0.5, freq: 1.9 },
        ]);

        const insights = [...ad1, ...ad2, ...ad3];
        const result = buildSurvivalData(insights);

        expect(result).toHaveLength(3);

        const fatigued = result.find(r => r.adId === 'ad1');
        expect(fatigued).toBeDefined();
        expect(fatigued!.event).toBe(true);
        expect(fatigued!.t).toBe(7); // dia 7

        const healthy = result.find(r => r.adId === 'ad2');
        expect(healthy).toBeDefined();
        expect(healthy!.event).toBe(false);

        const lowFreq = result.find(r => r.adId === 'ad3');
        expect(lowFreq).toBeDefined();
        expect(lowFreq!.event).toBe(false); // freq nunca >= 3.0
    });
});

describe('kaplanMeier', () => {
    it('deve calcular curva KM corretamente com dados simples', () => {
        // 5 criativos:
        //   - 2 fatigam no dia 5
        //   - 1 fatigam no dia 10
        //   - 1 censurado no dia 8
        //   - 1 censurado no dia 12
        const data = [
            { adId: 'a', adName: 'A', t: 5, event: true },
            { adId: 'b', adName: 'B', t: 5, event: true },
            { adId: 'c', adName: 'C', t: 10, event: true },
            { adId: 'd', adName: 'D', t: 8, event: false },
            { adId: 'e', adName: 'E', t: 12, event: false },
        ];

        const curve = kaplanMeier(data);

        // t=0: S=1.0, n=5
        expect(curve[0]).toEqual({ t: 0, S: 1.0, n: 5, d: 0 });

        // t=5: n=5, d=2 → S = 1 * (1 - 2/5) = 0.6
        expect(curve[1].t).toBe(5);
        expect(curve[1].S).toBeCloseTo(0.6);
        expect(curve[1].d).toBe(2);

        // t=10: n=5-2(fatigaram t5)-1(censurado t8)=2, d=1 → S = 0.6 * (1 - 1/2) = 0.3
        expect(curve[2].t).toBe(10);
        expect(curve[2].S).toBeCloseTo(0.3);
        expect(curve[2].d).toBe(1);
    });

    it('deve retornar array vazio para dados vazios', () => {
        expect(kaplanMeier([])).toEqual([]);
    });
});

describe('getMedianLifespan', () => {
    it('deve retornar o primeiro t onde S <= 0.5', () => {
        const curve = [
            { t: 0, S: 1.0, n: 10, d: 0 },
            { t: 3, S: 0.8, n: 10, d: 2 },
            { t: 7, S: 0.5, n: 6, d: 3 },
            { t: 14, S: 0.2, n: 2, d: 1 },
        ];
        expect(getMedianLifespan(curve)).toBe(7);
    });

    it('deve retornar null se S nunca cruza 0.5', () => {
        const curve = [
            { t: 0, S: 1.0, n: 10, d: 0 },
            { t: 5, S: 0.9, n: 10, d: 1 },
            { t: 10, S: 0.8, n: 8, d: 1 },
        ];
        expect(getMedianLifespan(curve)).toBeNull();
    });
});

describe('getSurvivalAt', () => {
    const curve = [
        { t: 0, S: 1.0, n: 10, d: 0 },
        { t: 5, S: 0.7, n: 10, d: 3 },
        { t: 10, S: 0.4, n: 5, d: 2 },
    ];

    it('deve retornar 1.0 para dia 0', () => {
        expect(getSurvivalAt(curve, 0)).toBe(1.0);
    });

    it('deve retornar S correto por step function', () => {
        expect(getSurvivalAt(curve, 3)).toBe(1.0); // antes do primeiro evento
        expect(getSurvivalAt(curve, 5)).toBe(0.7);
        expect(getSurvivalAt(curve, 7)).toBe(0.7); // entre dois pontos
        expect(getSurvivalAt(curve, 10)).toBe(0.4);
        expect(getSurvivalAt(curve, 20)).toBe(0.4); // após último ponto
    });

    it('deve retornar 1.0 para curva vazia', () => {
        expect(getSurvivalAt([], 5)).toBe(1);
    });
});
