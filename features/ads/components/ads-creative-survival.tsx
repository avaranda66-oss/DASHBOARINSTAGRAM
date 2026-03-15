'use client';

import { useMemo } from 'react';
import type { AdInsight } from '@/types/ads';
import {
    buildSurvivalData,
    kaplanMeier,
    getMedianLifespan,
    getSurvivalAt,
} from '@/lib/utils/creative-survival';

// ─── SVG Chart ──────────────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 240;
const PAD = { top: 20, right: 20, bottom: 32, left: 48 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

interface Props {
    adDailyInsights: AdInsight[];
}

export function AdsCreativeSurvival({ adDailyInsights }: Props) {
    const { survivalData, curve, median, s7, s14, maxT } = useMemo(() => {
        const sd = buildSurvivalData(adDailyInsights);
        const c = kaplanMeier(sd);
        const med = getMedianLifespan(c);
        const survival7 = getSurvivalAt(c, 7);
        const survival14 = getSurvivalAt(c, 14);
        const mt = sd.length > 0 ? Math.max(...sd.map(d => d.t), 30) : 30;
        return { survivalData: sd, curve: c, median: med, s7: survival7, s14: survival14, maxT: mt };
    }, [adDailyInsights]);

    if (survivalData.length < 5) {
        return (
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg px-5 py-6 font-mono">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#A3E635] text-[10px]">◈</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                        CREATIVE_SURVIVAL
                    </span>
                    <span className="text-[8px] text-[#A3E635]/40 uppercase tracking-widest ml-1 border border-[#A3E635]/20 px-1.5 py-0.5 rounded">
                        ⚗ EXPERIMENTAL
                    </span>
                </div>
                <p className="text-[10px] text-[#4A4A4A] mt-2">
                    ◈ DADOS INSUFICIENTES — mínimo 5 criativos com ≥7 dias
                </p>
            </div>
        );
    }

    // Build step-function path
    const xScale = (t: number) => PAD.left + (t / maxT) * INNER_W;
    const yScale = (s: number) => PAD.top + (1 - s) * INNER_H;

    let pathD = '';
    let areaD = '';

    if (curve.length > 0) {
        // Start path
        pathD = `M ${xScale(curve[0].t)} ${yScale(curve[0].S)}`;
        areaD = `M ${xScale(curve[0].t)} ${yScale(0)} L ${xScale(curve[0].t)} ${yScale(curve[0].S)}`;

        for (let i = 1; i < curve.length; i++) {
            // Horizontal step to new t at old S
            pathD += ` L ${xScale(curve[i].t)} ${yScale(curve[i - 1].S)}`;
            areaD += ` L ${xScale(curve[i].t)} ${yScale(curve[i - 1].S)}`;
            // Vertical drop to new S
            pathD += ` L ${xScale(curve[i].t)} ${yScale(curve[i].S)}`;
            areaD += ` L ${xScale(curve[i].t)} ${yScale(curve[i].S)}`;
        }

        // Extend to maxT
        const lastS = curve[curve.length - 1].S;
        pathD += ` L ${xScale(maxT)} ${yScale(lastS)}`;
        areaD += ` L ${xScale(maxT)} ${yScale(lastS)}`;
        areaD += ` L ${xScale(maxT)} ${yScale(0)} Z`;
    }

    // X axis ticks
    const xTicks: number[] = [];
    const step = maxT <= 14 ? 2 : maxT <= 30 ? 5 : 10;
    for (let t = 0; t <= maxT; t += step) xTicks.push(t);

    // Y axis ticks
    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="text-[#A3E635] text-[10px]">◈</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    CREATIVE_SURVIVAL — Curva de Kaplan-Meier
                </span>
                <span className="text-[8px] text-[#A3E635]/40 uppercase tracking-widest ml-1 border border-[#A3E635]/20 px-1.5 py-0.5 rounded">
                    ⚗ EXPERIMENTAL
                </span>
                <span className="h-px flex-1 bg-white/5 ml-2" />
                <span className="text-[9px] text-[#4A4A4A]">[{survivalData.length}_CRIATIVOS]</span>
            </div>

            {/* Metrics row */}
            <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-white/5">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">MEDIANA</span>
                    <span className="text-2xl font-black tracking-tighter text-[#F5F5F5]">
                        {median !== null ? `${median}d` : 'N/A'}
                    </span>
                    <span className="text-[8px] text-[#4A4A4A]">
                        {median !== null ? 'dias até 50% fatigarem' : 'curva não cruza 50%'}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">SOBREVIVÊNCIA_7D</span>
                    <span
                        className="text-2xl font-black tracking-tighter"
                        style={{ color: s7 >= 0.7 ? '#A3E635' : s7 >= 0.4 ? '#FBBF24' : '#EF4444' }}
                    >
                        {(s7 * 100).toFixed(0)}%
                    </span>
                    <span className="text-[8px] text-[#4A4A4A]">saudáveis no dia 7</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">SOBREVIVÊNCIA_14D</span>
                    <span
                        className="text-2xl font-black tracking-tighter"
                        style={{ color: s14 >= 0.5 ? '#A3E635' : s14 >= 0.3 ? '#FBBF24' : '#EF4444' }}
                    >
                        {(s14 * 100).toFixed(0)}%
                    </span>
                    <span className="text-[8px] text-[#4A4A4A]">saudáveis no dia 14</span>
                </div>
            </div>

            {/* SVG Chart */}
            <div className="px-5 py-4">
                <svg
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                    className="w-full"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Grid lines */}
                    {yTicks.map(pct => (
                        <line
                            key={pct}
                            x1={PAD.left}
                            y1={yScale(pct / 100)}
                            x2={CHART_W - PAD.right}
                            y2={yScale(pct / 100)}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth={1}
                        />
                    ))}

                    {/* 50% median line (dashed) */}
                    <line
                        x1={PAD.left}
                        y1={yScale(0.5)}
                        x2={CHART_W - PAD.right}
                        y2={yScale(0.5)}
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth={1}
                        strokeDasharray="6 4"
                    />
                    <text
                        x={CHART_W - PAD.right + 4}
                        y={yScale(0.5) + 3}
                        fill="rgba(255,255,255,0.2)"
                        fontSize={8}
                        fontFamily="monospace"
                    >
                        50%
                    </text>

                    {/* Area under curve */}
                    {areaD && (
                        <path
                            d={areaD}
                            fill="rgba(163,230,53,0.08)"
                        />
                    )}

                    {/* Step curve */}
                    {pathD && (
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#A3E635"
                            strokeWidth={2}
                        />
                    )}

                    {/* Median marker */}
                    {median !== null && (
                        <g>
                            <line
                                x1={xScale(median)}
                                y1={yScale(0.5)}
                                x2={xScale(median)}
                                y2={yScale(0)}
                                stroke="rgba(163,230,53,0.3)"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                            />
                            <text
                                x={xScale(median)}
                                y={yScale(0) + 12}
                                fill="#A3E635"
                                fontSize={9}
                                fontFamily="monospace"
                                textAnchor="middle"
                                fontWeight="bold"
                            >
                                ◆ {median}d
                            </text>
                        </g>
                    )}

                    {/* X axis labels */}
                    {xTicks.map(t => (
                        <text
                            key={t}
                            x={xScale(t)}
                            y={CHART_H - 4}
                            fill="rgba(255,255,255,0.25)"
                            fontSize={8}
                            fontFamily="monospace"
                            textAnchor="middle"
                        >
                            {t}d
                        </text>
                    ))}

                    {/* Y axis labels */}
                    {yTicks.map(pct => (
                        <text
                            key={pct}
                            x={PAD.left - 6}
                            y={yScale(pct / 100) + 3}
                            fill="rgba(255,255,255,0.25)"
                            fontSize={8}
                            fontFamily="monospace"
                            textAnchor="end"
                        >
                            {pct}%
                        </text>
                    ))}
                </svg>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em]">
                    Evento: CTR ≤80% do pico E frequency ≥3.0 | Censurados: ainda ativos ao fim do período
                </span>
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                    KM_ESTIMATOR_v1
                </span>
            </div>
        </div>
    );
}
