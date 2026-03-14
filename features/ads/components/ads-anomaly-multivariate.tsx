'use client';

// =============================================================================
// ads-anomaly-multivariate.tsx — Detecção de Anomalias Multivariada via Isolation Forest
//
// Story: US-44 — Conectar isolation-forest.ts à UI de intelligence
// Input: DailyAdInsight[] → pontos 4D [ctr, roas, cpc, cpm] normalizados
// Threshold: 0.62 (conservador — reduz falsos positivos)
// =============================================================================

import { useMemo } from 'react';
import { IsolationForest } from '@/lib/utils/isolation-forest';
import type { DailyAdInsight } from '@/types/ads';

interface Props {
    daily: DailyAdInsight[];
}

const MIN_POINTS = 7;
const ANOMALY_THRESHOLD = 0.62;

function fmtDate(d: string): string {
    try {
        return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch { return d; }
}

function normalize(series: number[]): number[] {
    const mean = series.reduce((a, v) => a + v, 0) / series.length;
    const std  = Math.sqrt(series.reduce((a, v) => a + (v - mean) ** 2, 0) / series.length) || 1;
    return series.map(v => (v - mean) / std);
}

interface AnomalyDay {
    date: string;
    score: number;
    ctr: number;
    roas: number;
    cpc: number;
    cpm: number;
}

function useAnomalyDays(daily: DailyAdInsight[]): AnomalyDay[] {
    return useMemo(() => {
        if (daily.length < MIN_POINTS) return [];

        const ctrN  = normalize(daily.map(d => d.ctr));
        const roasN = normalize(daily.map(d => d.roas));
        const cpcN  = normalize(daily.map(d => d.cpc));
        const cpmN  = normalize(daily.map(d => d.cpm));

        const points = daily.map((_, i) => [ctrN[i], roasN[i], cpcN[i], cpmN[i]]);

        const forest = new IsolationForest({ nTrees: 100, subSampling: Math.min(256, daily.length), seed: 42 });
        const { scores } = forest.fit(points).detect(points, ANOMALY_THRESHOLD);

        return daily
            .map((d, i) => ({ date: d.date, score: scores[i], ctr: d.ctr, roas: d.roas, cpc: d.cpc, cpm: d.cpm }))
            .filter(d => d.score > ANOMALY_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }, [daily]);
}

function ScoreBar({ score }: { score: number }) {
    const pct = Math.round((score - 0.5) / 0.5 * 100);
    const color = score > 0.75 ? '#EF4444' : score > 0.65 ? '#FBBF24' : '#A3E635';
    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="font-mono text-[9px] font-black" style={{ color }}>{score.toFixed(3)}</span>
        </div>
    );
}

export function AdsAnomalyMultivariate({ daily }: Props) {
    const anomalyDays = useAnomalyDays(daily);

    if (daily.length < MIN_POINTS) {
        return (
            <div className="h-[120px] flex items-center justify-center opacity-30">
                <p className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.4em]">
                    Mínimo de {MIN_POINTS} dias para detecção multivariada
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#FBBF24]">◈</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Multivariate_Anomaly_Scanner
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <span className="text-[8px] font-mono text-[#4A4A4A] uppercase tracking-widest">
                    4D: CTR × ROAS × CPC × CPM — IF threshold={ANOMALY_THRESHOLD}
                </span>
            </div>

            {anomalyDays.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-3 opacity-40">
                    <span className="font-mono text-[#A3E635]">◎</span>
                    <p className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.4em]">
                        SYSTEM_NOMINAL — Nenhuma anomalia multivariada detectada
                    </p>
                </div>
            ) : (
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg overflow-hidden font-mono">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[8px] uppercase tracking-widest text-[#4A4A4A]">
                                <th className="px-5 py-3 font-bold">Data</th>
                                <th className="px-5 py-3 text-right font-bold">CTR</th>
                                <th className="px-5 py-3 text-right font-bold">ROAS</th>
                                <th className="px-5 py-3 text-right font-bold">CPC</th>
                                <th className="px-5 py-3 text-right font-bold">CPM</th>
                                <th className="px-5 py-3 font-bold">Anomaly Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {anomalyDays.map(day => (
                                <tr key={day.date} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 text-[10px] font-bold text-[#F5F5F5]">{fmtDate(day.date)}</td>
                                    <td className="px-5 py-3 text-right text-[10px] text-[#8A8A8A]">{(day.ctr * 100).toFixed(2)}%</td>
                                    <td className="px-5 py-3 text-right text-[10px] text-[#8A8A8A]">{day.roas.toFixed(2)}×</td>
                                    <td className="px-5 py-3 text-right text-[10px] text-[#8A8A8A]">R${day.cpc.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-[10px] text-[#8A8A8A]">R${day.cpm.toFixed(2)}</td>
                                    <td className="px-5 py-3"><ScoreBar score={day.score} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 text-[8px] text-[#3A3A3A] tracking-[0.3em] uppercase">
                        MODELO: ISOLATION_FOREST (n_trees=100) — WINDOW: {daily.length}D — FEATURES: 4
                    </div>
                </div>
            )}
        </section>
    );
}
