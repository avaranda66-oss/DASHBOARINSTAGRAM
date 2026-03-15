// ─── Creative Survival Analysis — Kaplan-Meier ──────────────────────────────
//
// Analisa a "sobrevivência" de criativos usando estimador Kaplan-Meier.
// Evento de fadiga: CTR cai ≥20% do pico histórico E frequency ≥3.0.

import type { AdInsight } from '@/types/ads';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreativeSurvivalData {
    adId: string;
    adName: string;
    t: number;        // dias desde lançamento
    event: boolean;   // true = fatigou nesse dia
}

export interface KMPoint {
    t: number;
    S: number;
    n: number;
    d: number;
}

// ─── buildSurvivalData ──────────────────────────────────────────────────────

export function buildSurvivalData(adDailyInsights: AdInsight[]): CreativeSurvivalData[] {
    // Agrupar por ad_id
    const byAd = new Map<string, AdInsight[]>();
    for (const row of adDailyInsights) {
        if (!row.ad_id) continue;
        const arr = byAd.get(row.ad_id) || [];
        arr.push(row);
        byAd.set(row.ad_id, arr);
    }

    const result: CreativeSurvivalData[] = [];

    for (const [adId, rows] of byAd) {
        // Ordenar por date_start
        const sorted = rows.sort((a, b) => a.date_start.localeCompare(b.date_start));

        // Ignorar ads com < 7 dias de dados
        if (sorted.length < 7) continue;

        const adName = sorted[0].ad_name || adId;

        // Calcular dias desde primeiro registro
        const firstDate = new Date(sorted[0].date_start);

        // Pico CTR nos primeiros 7 dias
        const first7 = sorted.slice(0, 7);
        const peakCtr = Math.max(...first7.map(r => parseFloat(r.ctr || '0') || 0));

        if (peakCtr <= 0) continue; // sem dados de CTR

        const threshold = 0.8 * peakCtr;
        let eventFound = false;

        for (const row of sorted) {
            const rowDate = new Date(row.date_start);
            const daysSinceLaunch = Math.round(
                (rowDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            const ctr = parseFloat(row.ctr || '0') || 0;
            const freq = parseFloat(row.frequency || '0') || 0;

            if (ctr <= threshold && freq >= 3.0) {
                result.push({ adId, adName, t: daysSinceLaunch, event: true });
                eventFound = true;
                break;
            }
        }

        // Censurado: nunca fatigou
        if (!eventFound) {
            const lastDate = new Date(sorted[sorted.length - 1].date_start);
            const totalDays = Math.round(
                (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            result.push({ adId, adName, t: totalDays, event: false });
        }
    }

    return result;
}

// ─── Kaplan-Meier Estimator ─────────────────────────────────────────────────

export function kaplanMeier(data: CreativeSurvivalData[]): KMPoint[] {
    if (data.length === 0) return [];

    // Agrupar eventos e censuras por tempo
    const timeMap = new Map<number, { events: number; censored: number }>();
    for (const d of data) {
        const entry = timeMap.get(d.t) || { events: 0, censored: 0 };
        if (d.event) {
            entry.events++;
        } else {
            entry.censored++;
        }
        timeMap.set(d.t, entry);
    }

    // Ordenar tempos
    const times = [...timeMap.keys()].sort((a, b) => a - b);

    const curve: KMPoint[] = [{ t: 0, S: 1.0, n: data.length, d: 0 }];
    let nAtRisk = data.length;
    let S = 1.0;

    for (const t of times) {
        const entry = timeMap.get(t)!;
        const d = entry.events;

        if (d > 0 && nAtRisk > 0) {
            S = S * (1 - d / nAtRisk);
            curve.push({ t, S, n: nAtRisk, d });
        }

        // Remover fatigados e censurados do risco
        nAtRisk -= d + entry.censored;
    }

    return curve;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getMedianLifespan(curve: KMPoint[]): number | null {
    for (const point of curve) {
        if (point.S <= 0.5) return point.t;
    }
    return null;
}

export function getSurvivalAt(curve: KMPoint[], day: number): number {
    if (curve.length === 0) return 1;

    // Step function: último S onde t <= day
    let S = 1.0;
    for (const point of curve) {
        if (point.t <= day) {
            S = point.S;
        } else {
            break;
        }
    }
    return S;
}
