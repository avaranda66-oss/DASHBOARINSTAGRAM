'use client';

// =============================================================================
// ads-incrementality-section.tsx — Incrementality: Interrupted Time Series UI
//
// Story: US-47 — Incrementality (ITS) → UI (aba INSIGHTS)
// Usa: fitITS, bootstrapDiffMeans de incrementality.ts
//
// Lógica:
//   1. Detecta automaticamente o maior salto de spend como "intervenção"
//   2. Ajusta modelo ITS: Y = β₀ + β₁·t + β₂·D + β₃·(t·D)
//   3. Exibe gráfico pré/pós + contrafactual
//   4. Mostra efeito causal acumulado com interpretação em português
// =============================================================================

import { useMemo } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fitITS, bootstrapDiffMeans } from '@/lib/utils/incrementality';
import type { DailyAdInsight } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    daily: DailyAdInsight[];
    currency?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_POINTS = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function fmtPct(v: number, sign = true): string {
    const s = sign && v > 0 ? '+' : '';
    return `${s}${(v * 100).toFixed(1)}%`;
}

// Detecta o índice da maior mudança absoluta de spend
function detectIntervention(spends: number[], minPre = 5, minPost = 5): number {
    let maxDelta = 0;
    let idx = Math.floor(spends.length * 0.4); // fallback: 40% do período

    for (let i = minPre; i < spends.length - minPost; i++) {
        const delta = Math.abs(spends[i] - spends[i - 1]);
        if (delta > maxDelta) {
            maxDelta = delta;
            idx = i;
        }
    }
    return idx;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ITSTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
}) {
    if (!active || !payload?.length || !label) return null;
    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded p-3 font-mono text-[9px] space-y-1 min-w-[160px]">
            <p className="text-[#A3E635] font-black uppercase tracking-widest mb-2">{label}</p>
            {payload.map(p => {
                const name = p.name === 'actual' ? 'CONVERSÕES REAIS'
                    : p.name === 'counterfactual' ? 'CONTRAFACTUAL'
                    : p.name === 'effect' ? 'EFEITO CAUSAL'
                    : p.name;
                return (
                    <div key={p.name} className="flex justify-between gap-6">
                        <span style={{ color: p.color }} className="uppercase">{name}</span>
                        <span className="text-[#F5F5F5] font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsIncrementalitySection({ daily }: Props) {
    const result = useMemo(() => {
        if (daily.length < MIN_POINTS) return null;

        const spends = daily.map(d => d.spend);
        const conversions = daily.map(d => d.conversions);

        // Não tem conversões em nenhum dia → modo awareness, não aplicável
        const totalConv = conversions.reduce((s, v) => s + v, 0);
        if (totalConv === 0) return null;

        const iIdx = detectIntervention(spends, 5, 5);
        const its = fitITS(conversions, iIdx + 1); // fitITS usa índice 1-based

        // Bootstrap CI para pré vs pós conversões
        const pre = conversions.slice(0, iIdx);
        const post = conversions.slice(iIdx);
        const bootstrap = bootstrapDiffMeans(post, pre, 2000);

        // Contrafactual: projeção sem intervenção (só β₀ + β₁·t)
        const [b0, b1] = its.beta;
        const chartData = daily.map((d, i) => {
            const t = i + 1;
            const counterfactual = b0 + b1 * t;
            return {
                date: fmtDate(d.date),
                actual: d.conversions,
                counterfactual: Math.max(0, counterfactual),
                isPost: i >= iIdx,
            };
        });

        // Pré-médias para contexto
        const preMean = pre.reduce((s, v) => s + v, 0) / (pre.length || 1);
        const postMean = post.reduce((s, v) => s + v, 0) / (post.length || 1);
        const liftEstimate = preMean > 0 ? (postMean - preMean) / preMean : 0;

        return {
            its,
            bootstrap,
            chartData,
            interventionDate: daily[iIdx]?.date ?? '',
            preMean,
            postMean,
            liftEstimate,
            preN: pre.length,
            postN: post.length,
            iIdx,
        };
    }, [daily]);

    // ── Empty states ──────────────────────────────────────────────────────────
    if (daily.length < MIN_POINTS) {
        return (
            <div className="h-[120px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#A3E635] text-[10px] uppercase tracking-[0.4em]">
                    ◈ ITS_UNAVAILABLE
                </span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Mínimo de {MIN_POINTS} dias para análise de incrementalidade
                </p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-[120px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#FBBF24] text-[10px] uppercase tracking-[0.4em]">
                    ◈ ITS_NO_CONVERSIONS
                </span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Sem conversões no período — incrementalidade requer campanhas com pixel ativo
                </p>
            </div>
        );
    }

    const { its, bootstrap, chartData, interventionDate, preMean, postMean, liftEstimate, preN, postN } = result;

    // Interpretação do efeito
    const liftAbs = postMean - preMean;
    const liftPositive = liftAbs > 0;
    const liftColor = liftPositive ? '#A3E635' : '#EF4444';

    // Qualidade do modelo
    const r2Color = its.rSquared >= 0.5 ? '#A3E635' : its.rSquared >= 0.25 ? '#FBBF24' : '#EF4444';
    const r2Label = its.rSquared >= 0.5 ? 'BOM' : its.rSquared >= 0.25 ? 'MODERADO' : 'BAIXO';

    // Bootstrap IC contém zero?
    const icContainsZero = bootstrap.lower <= 0 && bootstrap.upper >= 0;

    return (
        <section className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]">◎</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Incrementality_ITS — Causal_Effect_Analysis
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <div
                    className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest"
                    style={{ color: r2Color, borderColor: `${r2Color}30`, backgroundColor: `${r2Color}10` }}
                >
                    {r2Label} R²={its.rSquared.toFixed(2)}
                </div>
            </div>

            {/* ── KPI strip ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: 'LIFT_ESTIMADO',
                        value: fmtPct(liftEstimate),
                        sub: `${liftPositive ? '↗' : '↘'} ${Math.abs(liftAbs).toFixed(1)} conv/dia`,
                        color: liftColor,
                    },
                    {
                        label: 'PRÉ_MÉDIA',
                        value: preMean.toFixed(1),
                        sub: `${preN} dias pré-intervenção`,
                        color: '#F5F5F5',
                    },
                    {
                        label: 'PÓS_MÉDIA',
                        value: postMean.toFixed(1),
                        sub: `${postN} dias pós-intervenção`,
                        color: '#F5F5F5',
                    },
                    {
                        label: 'IC_95%_BOOT',
                        value: `[${bootstrap.lower.toFixed(1)}, ${bootstrap.upper.toFixed(1)}]`,
                        sub: icContainsZero ? 'IC inclui zero' : 'IC não inclui zero',
                        color: icContainsZero ? '#FBBF24' : '#A3E635',
                    },
                ].map(item => (
                    <div key={item.label} className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                        <p className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">{item.label}</p>
                        <p className="text-[14px] font-black tracking-tight leading-tight" style={{ color: item.color }}>
                            {item.value}
                        </p>
                        <p className="text-[8px] text-[#4A4A4A]">{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Interpretação ───────────────────────────────────────────── */}
            <div
                className="flex items-start gap-4 px-5 py-3.5 rounded-lg border font-mono"
                style={{ borderColor: `${liftColor}25`, backgroundColor: `${liftColor}06` }}
            >
                <span className="text-[18px] flex-shrink-0 mt-0.5" style={{ color: liftColor }}>
                    {liftPositive ? '↗' : '↘'}
                </span>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: liftColor }}>
                        {liftPositive
                            ? `A mudança de budget em ${interventionDate ? fmtDate(interventionDate) : 'data detectada'} gerou +${Math.abs(liftAbs).toFixed(1)} conversões/dia em média`
                            : `A mudança de budget em ${interventionDate ? fmtDate(interventionDate) : 'data detectada'} reduziu ${Math.abs(liftAbs).toFixed(1)} conversões/dia em média`
                        }
                    </p>
                    <p className="text-[9px] text-[#8A8A8A]">
                        {icContainsZero
                            ? 'Intervalo de confiança inclui zero — efeito pode ser ruído estatístico. Aguarde mais dados.'
                            : 'Intervalo de confiança não inclui zero — efeito causal provavelmente real.'
                        }
                        {` R²=${its.rSquared.toFixed(2)} (${r2Label.toLowerCase()} ajuste do modelo ITS).`}
                    </p>
                </div>
            </div>

            {/* ── Chart: real vs contrafactual ────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center gap-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 bg-[#A3E635]" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Conversões Reais</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 border-t border-dashed border-[#FBBF24]" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Contrafactual (sem intervenção)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm border border-dashed border-blue-500/50" />
                        <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Ponto de Intervenção</span>
                    </div>
                </div>

                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 7, fill: '#3A3A3A', fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 7, fill: '#3A3A3A', fontFamily: 'monospace' }}
                                axisLine={false}
                                tickLine={false}
                                width={30}
                            />
                            <Tooltip content={<ITSTooltip />} />

                            {/* Linha de intervenção */}
                            <ReferenceLine
                                x={chartData[result.iIdx]?.date}
                                stroke="rgba(96,165,250,0.4)"
                                strokeDasharray="4 3"
                                label={{ value: 'INTERVENÇÃO', fill: '#60a5fa', fontSize: 7, fontFamily: 'monospace' }}
                            />

                            {/* Contrafactual */}
                            <Line
                                type="monotone"
                                dataKey="counterfactual"
                                stroke="#FBBF24"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                                dot={false}
                                isAnimationActive={false}
                                name="counterfactual"
                            />

                            {/* Conversões reais */}
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#A3E635"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                name="actual"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Coeficientes do modelo ───────────────────────────────────── */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 font-mono text-[8px] space-y-2">
                <p className="text-[#4A4A4A] uppercase tracking-[0.3em] mb-3">MODELO ITS — COEFICIENTES</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { sym: 'β₀', label: 'Nível base', value: its.beta[0].toFixed(2) },
                        { sym: 'β₁', label: 'Tendência pré', value: its.beta[1].toFixed(4) },
                        { sym: 'β₂', label: 'Shift de nível', value: its.beta[2].toFixed(2) },
                        { sym: 'β₃', label: 'Mudança slope', value: its.beta[3].toFixed(4) },
                    ].map(b => (
                        <div key={b.sym} className="space-y-0.5">
                            <span className="text-[#A3E635] font-black text-[9px]">{b.sym}</span>
                            <p className="text-[#F5F5F5] font-bold">{b.value}</p>
                            <p className="text-[#4A4A4A]">{b.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Disclaimer ──────────────────────────────────────────────── */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-white/[0.02] border border-white/5 font-mono text-[8px] text-[#4A4A4A] tracking-wide">
                <span className="text-[#FBBF24] mt-0.5 flex-shrink-0">◈</span>
                <span>
                    Modelo ITS assume paralel trends: sem outras mudanças concomitantes (sazonalidade, promoções, eventos).
                    Conta única — sem grupo controle. Efeito causal é estimativa, não medição direta.
                    Bootstrap 2000 reamostras, seed=42 (reprodutível).
                </span>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-6 text-[8px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>MODEL: SEGMENTED_REGRESSION_ITS_4PARAM</span>
                <span>INTERVENÇÃO: {interventionDate ? fmtDate(interventionDate) : 'AUTO'}</span>
                <span>N: {daily.length}D</span>
            </div>
        </section>
    );
}
