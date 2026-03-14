'use client';

// =============================================================================
// ads-mmm-section.tsx — Media Mix Modeling: Curva ROAS + Budget Ótimo
//
// Story: US-46 — Conectar mmm.ts à UI do dashboard de Ads
// Dados: DailyAdInsight[] → spend[] + conversionValue[] → fitMMM → ROAS curve
//
// O que exibimos:
//   1. Qualidade do modelo (R², θ, K interpretados)
//   2. Curva de ROAS marginal vs. nível de gasto
//   3. Ponto ótimo de budget (max marginal ROAS)
//   4. Recomendação de escala (↗ / ↘ / ─)
// =============================================================================

import { useMemo } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
    fitMMM,
    computeROASCurve,
    findOptimalBudget,
} from '@/lib/utils/mmm';
import type { DailyAdInsight } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    daily: DailyAdInsight[];
    currency?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_POINTS = 14; // precisa de sazonalidade mínima para MMM confiável
const CURVE_STEPS = 40;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency: string): string {
    if (v >= 1_000_000) return `${currency === 'BRL' ? 'R$' : '$'}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${currency === 'BRL' ? 'R$' : '$'}${(v / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}

function fmtROAS(v: number): string {
    return `${v.toFixed(2)}×`;
}

// ─── Quality Badge ────────────────────────────────────────────────────────────

function QualityBadge({ r2 }: { r2: number }) {
    let label: string, color: string, bg: string;
    if (r2 >= 0.7)      { label = 'BOM AJUSTE';   color = '#A3E635'; bg = 'bg-[#A3E635]/10 border-[#A3E635]/20'; }
    else if (r2 >= 0.4) { label = 'MODERADO';     color = '#FBBF24'; bg = 'bg-[#FBBF24]/10 border-[#FBBF24]/20'; }
    else                { label = 'BAIXO AJUSTE';  color = '#EF4444'; bg = 'bg-[#EF4444]/10 border-[#EF4444]/20'; }

    return (
        <span className={`text-[8px] px-2 py-0.5 rounded border uppercase font-black tracking-widest ${bg}`} style={{ color }}>
            {label} R²={r2.toFixed(2)}
        </span>
    );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function MMMTooltip({ active, payload, label, currency }: {
    active?: boolean; payload?: { name: string; value: number }[]; label?: number; currency: string;
}) {
    if (!active || !payload?.length || label === undefined) return null;
    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded p-3 font-mono text-[9px] space-y-1 min-w-[140px]">
            <p className="text-[#A3E635] font-black uppercase tracking-widest mb-2">
                Spend: {fmtCurrency(label, currency)}
            </p>
            {payload.map(p => (
                <div key={p.name} className="flex justify-between gap-4">
                    <span className="text-[#4A4A4A] uppercase">{p.name === 'marginalROAS' ? 'ROAS Marginal' : 'ROAS Total'}</span>
                    <span className="text-[#F5F5F5] font-bold">{fmtROAS(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsMMMSection({ daily, currency = 'BRL' }: Props) {
    const result = useMemo(() => {
        if (daily.length < MIN_POINTS) return null;

        const spend  = daily.map(d => d.spend);
        const outcome = daily.map(d =>
            // Preferir conversionValue (receita), fallback para conversões
            d.conversionValue > 0 ? d.conversionValue : d.conversions
        );

        const fit = fitMMM(spend, outcome);
        if (!fit.optimized) return null;

        // Nível médio de gasto dos últimos 30 dias (ou todos)
        const window = spend.slice(-30);
        const avgSpend = window.reduce((s, v) => s + v, 0) / window.length;
        const maxSpend = Math.max(...spend) * 1.8;
        const minSpend = avgSpend * 0.2;

        const spendLevels = Array.from(
            { length: CURVE_STEPS + 1 },
            (_, i) => minSpend + (i / CURVE_STEPS) * (maxSpend - minSpend)
        );

        const curve = computeROASCurve(spendLevels, fit);
        const optimal = findOptimalBudget(minSpend, maxSpend, fit, CURVE_STEPS);

        return { fit, curve, optimal, avgSpend };
    }, [daily]);

    // ── Empty states ──────────────────────────────────────────────────────────

    if (daily.length < MIN_POINTS) {
        return (
            <div className="h-[160px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#A3E635] text-[10px] uppercase tracking-[0.4em]">
                    ◈ MMM_UNAVAILABLE
                </span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Mínimo de {MIN_POINTS} dias de dados para calibrar o modelo
                </p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-[160px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#FBBF24] text-[10px] uppercase tracking-[0.4em]">
                    ▲ MMM_FIT_FAILED
                </span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Variância insuficiente nos dados de spend para ajustar o modelo
                </p>
            </div>
        );
    }

    const { fit, curve, optimal, avgSpend } = result;

    // Direção de escala: comparar avg vs optimal
    const scaleDelta = optimal.optimalSpend - avgSpend;
    const scalePercent = avgSpend > 0 ? (scaleDelta / avgSpend) * 100 : 0;
    const scaleDir = Math.abs(scalePercent) < 5 ? 'MANTER' : scalePercent > 0 ? 'ESCALAR' : 'REDUZIR';
    const scaleDirColor = scaleDir === 'ESCALAR' ? '#A3E635' : scaleDir === 'REDUZIR' ? '#EF4444' : '#FBBF24';

    // Interpretação de θ (carryover)
    const carryoverLabel = fit.theta < 0.3 ? 'CURTO (< 3d)' : fit.theta < 0.6 ? 'MÉDIO (3-7d)' : 'LONGO (> 7d)';

    return (
        <section className="space-y-6">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#A3E635] drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]">▤</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Media_Mix_Model — ROAS_Response_Curve
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <QualityBadge r2={fit.rSquared} />
            </div>

            {/* ── Model params strip ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'CARRYOVER_θ', value: fit.theta.toFixed(2), sub: carryoverLabel },
                    { label: 'HALF_SAT_K',  value: fmtCurrency(fit.K, currency), sub: 'spend p/ 50% máx' },
                    { label: 'SPEND_ÓTIMO', value: fmtCurrency(optimal.optimalSpend, currency), sub: 'max ROAS marginal' },
                    { label: 'ROAS_MARG_ÓT', value: fmtROAS(optimal.maxMarginalROAS), sub: `ROAS total: ${fmtROAS(optimal.totalROAS)}` },
                ].map(item => (
                    <div key={item.label} className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                        <p className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">{item.label}</p>
                        <p className="text-[16px] font-black text-[#F5F5F5] tracking-tight leading-tight">{item.value}</p>
                        <p className="text-[8px] text-[#4A4A4A]">{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Recomendação ───────────────────────────────────────────── */}
            <div
                className="flex items-center gap-4 px-5 py-3 rounded-lg border font-mono"
                style={{ borderColor: `${scaleDirColor}30`, backgroundColor: `${scaleDirColor}08` }}
            >
                <span className="text-[20px]" style={{ color: scaleDirColor }}>
                    {scaleDir === 'ESCALAR' ? '↗' : scaleDir === 'REDUZIR' ? '↘' : '─'}
                </span>
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: scaleDirColor }}>
                        RECOMENDAÇÃO: {scaleDir} BUDGET
                    </p>
                    <p className="text-[9px] text-[#8A8A8A]">
                        Budget atual ~{fmtCurrency(avgSpend, currency)}/dia →
                        Ótimo MMM: {fmtCurrency(optimal.optimalSpend, currency)}/dia
                        ({scalePercent > 0 ? '+' : ''}{scalePercent.toFixed(0)}%)
                    </p>
                </div>
            </div>

            {/* ── ROAS Curve Chart ───────────────────────────────────────── */}
            <div className="space-y-2">
                <div className="flex items-center gap-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 bg-[#A3E635]" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">ROAS Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 bg-[#FBBF24]" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">ROAS Marginal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm border border-dashed border-blue-500/50" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Spend Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm border border-dashed border-[#A3E635]/50" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Budget Ótimo</span>
                    </div>
                </div>

                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={curve}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="2 4"
                                stroke="rgba(255,255,255,0.03)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="spend"
                                tickFormatter={v => fmtCurrency(Number(v), currency)}
                                tick={{ fontSize: 8, fill: '#3A3A3A', fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 8, fill: '#3A3A3A', fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `${Number(v).toFixed(1)}×`}
                                width={35}
                            />
                            <Tooltip
                                content={<MMMTooltip currency={currency} />}
                            />

                            {/* Spend atual */}
                            <ReferenceLine
                                x={avgSpend}
                                stroke="rgba(59,130,246,0.4)"
                                strokeDasharray="4 3"
                                label={{ value: 'ATUAL', fill: '#3b82f6', fontSize: 7, fontFamily: 'monospace' }}
                            />
                            {/* Budget ótimo */}
                            <ReferenceLine
                                x={optimal.optimalSpend}
                                stroke="rgba(163,230,53,0.5)"
                                strokeDasharray="4 3"
                                label={{ value: 'ÓTIMO', fill: '#A3E635', fontSize: 7, fontFamily: 'monospace' }}
                            />

                            {/* ROAS total */}
                            <Line
                                type="monotone"
                                dataKey="roas"
                                stroke="#A3E635"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                            {/* ROAS marginal */}
                            <Line
                                type="monotone"
                                dataKey="marginalROAS"
                                stroke="#FBBF24"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                                dot={false}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Technical footer ───────────────────────────────────────── */}
            <div className="flex items-center gap-6 text-[8px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>MODEL: GEOMETRIC_ADSTOCK + HILL_SATURATION</span>
                <span>GRID: 5θ × 4K = 20 COMBINATIONS</span>
                <span>WINDOW: {Math.min(daily.length, 90)}D</span>
                <span>β₁={fit.beta1.toFixed(3)}</span>
            </div>
        </section>
    );
}
