'use client';

import type { AdCampaign, AdInsight, AdActionStat } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Benchmark CTR Meta Ads (setor médio, pesquisa Madgicx/WordStream 2024) */
const CTR_BENCHMARK = 1.25;
/** Frequency acima deste limiar = saturação total (score 0) */
const FREQ_SATURATION = 3.5;
/** Frequency ideal máximo (abaixo = score 100) */
const FREQ_IDEAL_MAX = 1.5;
/** Hook Rate: 35% = strong (score 100) */
const HOOK_STRONG = 35;
/** Hold Rate: 60% = strong (score 100) */
const HOLD_STRONG = 60;

// Pesos do composite score
const WEIGHTS = { hook: 0.4, hold: 0.3, freq: 0.2, ctr: 0.1 } as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type AwarenessLabel = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK';

export interface AwarenessScoreResult {
    score: number;           // 0–100
    label: AwarenessLabel;
    hookScore: number;       // 0–100 (componente normalizado)
    holdScore: number;
    freqScore: number;
    ctrScore: number;
    hookRate: number;        // % real
    holdRate: number;        // % real
    frequency: number;
    ctr: number;
}

// ─── Helpers (locais — sem dependência de ads-video-metrics-section) ─────────

function extractVideoMetric(stats: AdActionStat[] | undefined): number {
    if (!stats || stats.length === 0) return 0;
    const item = stats.find(s => s.action_type === 'video_view') ?? stats[0];
    return parseFloat(item?.value || '0');
}

function extract3sViews(insights: AdInsight): number {
    const fromActions = insights.actions?.filter(a => a.action_type === 'video_view');
    return fromActions && fromActions.length > 0 ? extractVideoMetric(fromActions) : 0;
}

// ─── Score Engine ─────────────────────────────────────────────────────────────

/**
 * Calcula o Awareness Score Composite (0–100).
 *
 * Componentes:
 * - Hook Rate  40% — vídeo 3s / impressões × 100  (35% = score 100)
 * - Hold Rate  30% — thruplay / 3s_views × 100     (60% = score 100)
 * - Frequency  20% — penaliza freq > 3.5            (≤1.5 = 100, ≥3.5 = 0)
 * - CTR rel.   10% — vs benchmark 1.25%             (≥bench = 100)
 *
 * Contexto: conta usa objetivo REACH — estimated_ad_recallers indisponível.
 */
export function calcAwarenessScore(insights: AdInsight): AwarenessScoreResult {
    const impressions = parseInt(insights.impressions || '0');
    const views3s     = extract3sViews(insights);
    const p25         = extractVideoMetric(insights.video_p25_watched_actions);
    const thruplay    = extractVideoMetric(insights.video_thruplay_watched_actions);
    const frequency   = parseFloat(insights.frequency || '1');
    const ctr         = parseFloat(insights.ctr || '0');

    // Hook Rate: usa 3s_views se disponível, fallback p25
    const hookBase = views3s > 0 ? views3s : p25;
    const hookRate = impressions > 0 ? (hookBase / impressions) * 100 : 0;

    // Hold Rate: thruplay / hookBase
    const holdRate = hookBase > 0 ? (thruplay / hookBase) * 100 : 0;

    // Scores normalizados 0–100
    const hookScore = Math.min(100, (hookRate / HOOK_STRONG) * 100);
    const holdScore = Math.min(100, (holdRate / HOLD_STRONG) * 100);
    const freqScore = Math.max(0, Math.min(100,
        ((FREQ_SATURATION - frequency) / (FREQ_SATURATION - FREQ_IDEAL_MAX)) * 100
    ));
    const ctrScore = Math.min(100, (ctr / CTR_BENCHMARK) * 100);

    const score =
        hookScore * WEIGHTS.hook +
        holdScore * WEIGHTS.hold +
        freqScore * WEIGHTS.freq +
        ctrScore  * WEIGHTS.ctr;

    const label: AwarenessLabel =
        score >= 80 ? 'EXCELLENT' :
        score >= 60 ? 'GOOD' :
        score >= 40 ? 'AVERAGE' : 'WEAK';

    return { score, label, hookScore, holdScore, freqScore, ctrScore, hookRate, holdRate, frequency, ctr };
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

const LABEL_COLOR: Record<AwarenessLabel, string> = {
    EXCELLENT: '#A3E635',
    GOOD:      '#4ADE80',
    AVERAGE:   '#FBBF24',
    WEAK:      '#EF4444',
};

function ScoreBar({ value, color }: { value: number; color: string }) {
    const filled = Math.round((value / 100) * 20);
    return (
        <div className="flex gap-[2px] h-[5px]">
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-[1px] transition-all duration-700"
                    style={{ backgroundColor: i < filled ? color : 'rgba(255,255,255,0.04)' }}
                />
            ))}
        </div>
    );
}

interface ComponentRowProps {
    label: string;
    weight: string;
    rawLabel: string;
    rawValue: string;
    score: number;
    color: string;
}

function ComponentRow({ label, weight, rawLabel, rawValue, score, color }: ComponentRowProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A]">{label}</span>
                    <span className="text-[8px] text-[#3A3A3A] uppercase tracking-widest">[{weight}]</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[8px] text-[#4A4A4A]">{rawLabel}: {rawValue}</span>
                    <span className="text-[11px] font-black" style={{ color }}>{score.toFixed(0)}</span>
                </div>
            </div>
            <ScoreBar value={score} color={color} />
        </div>
    );
}

// ─── AdsAwarenessScore ────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
}

/**
 * Awareness Score Composite — agrega métricas de vídeo + frequency + CTR
 * em um score 0–100 ponderado. Projetado para contas com objetivo REACH
 * (sem acesso a estimated_ad_recallers).
 */
export function AdsAwarenessScore({ campaigns }: Props) {
    // Filtra campânhas com dados suficientes
    const valid = campaigns.filter(c => {
        if (!c.insights) return false;
        const ins = c.insights;
        const imp  = parseInt(ins.impressions || '0');
        const v3s  = extract3sViews(ins);
        const p25  = extractVideoMetric(ins.video_p25_watched_actions);
        return imp > 0 && (v3s > 0 || p25 > 0);
    });

    if (valid.length === 0) return null;

    // Média ponderada por impressões
    let totalImp = 0;
    let wScore = 0, wHook = 0, wHold = 0, wFreq = 0, wCtr = 0;
    let wHookRate = 0, wHoldRate = 0, wFrequency = 0, wCtrRaw = 0;

    for (const c of valid) {
        const ins = c.insights!;
        const imp = parseInt(ins.impressions || '0');
        const res = calcAwarenessScore(ins);
        totalImp   += imp;
        wScore     += res.score     * imp;
        wHook      += res.hookScore * imp;
        wHold      += res.holdScore * imp;
        wFreq      += res.freqScore * imp;
        wCtr       += res.ctrScore  * imp;
        wHookRate  += res.hookRate  * imp;
        wHoldRate  += res.holdRate  * imp;
        wFrequency += res.frequency * imp;
        wCtrRaw    += res.ctr       * imp;
    }

    const avg = (v: number) => totalImp > 0 ? v / totalImp : 0;

    const score     = avg(wScore);
    const hookScore = avg(wHook);
    const holdScore = avg(wHold);
    const freqScore = avg(wFreq);
    const ctrScore  = avg(wCtr);
    const hookRate  = avg(wHookRate);
    const holdRate  = avg(wHoldRate);
    const frequency = avg(wFrequency);
    const ctrRaw    = avg(wCtrRaw);

    const label: AwarenessLabel =
        score >= 80 ? 'EXCELLENT' :
        score >= 60 ? 'GOOD' :
        score >= 40 ? 'AVERAGE' : 'WEAK';

    const color = LABEL_COLOR[label];
    const scoreInt = Math.round(score);

    // Cor por componente (score individual ≥ 70 = bom)
    const compColor = (s: number) => s >= 70 ? '#A3E635' : s >= 45 ? '#FBBF24' : '#EF4444';

    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <span className="text-[#A3E635] text-[10px]">◈</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Awareness_Score
                </span>
                <span className="text-[9px] text-[#4A4A4A] ml-1">[{valid.length}_CAMPAIGNS · REACH_OBJ]</span>
                <span className="h-px flex-1 bg-white/5 ml-2" />
                <span className="text-[8px] text-[#3A3A3A] uppercase tracking-[0.2em]">
                    no_estimated_recallers
                </span>
            </div>

            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                {/* Score principal */}
                <div className="flex flex-col items-center justify-center min-w-[120px] py-2">
                    <span
                        className="text-[64px] font-black tracking-tighter leading-none"
                        style={{ color, textShadow: `0 0 24px ${color}40` }}
                    >
                        {scoreInt}
                    </span>
                    <span
                        className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1"
                        style={{ color }}
                    >
                        {label}
                    </span>
                    <span className="text-[8px] text-[#4A4A4A] mt-2 uppercase tracking-[0.2em]">/ 100</span>
                </div>

                {/* Breakdown componentes */}
                <div className="space-y-3 py-1">
                    <ComponentRow
                        label="HOOK_RATE"
                        weight="40%"
                        rawLabel="avg"
                        rawValue={`${hookRate.toFixed(1)}%`}
                        score={hookScore}
                        color={compColor(hookScore)}
                    />
                    <ComponentRow
                        label="HOLD_RATE"
                        weight="30%"
                        rawLabel="avg"
                        rawValue={`${holdRate.toFixed(1)}%`}
                        score={holdScore}
                        color={compColor(holdScore)}
                    />
                    <ComponentRow
                        label="FREQUENCY"
                        weight="20%"
                        rawLabel="avg"
                        rawValue={`${frequency.toFixed(2)}x`}
                        score={freqScore}
                        color={compColor(freqScore)}
                    />
                    <ComponentRow
                        label="CTR_REL"
                        weight="10%"
                        rawLabel={`vs ${CTR_BENCHMARK}%`}
                        rawValue={`${ctrRaw.toFixed(2)}%`}
                        score={ctrScore}
                        color={compColor(ctrScore)}
                    />
                </div>
            </div>

            {/* Score bar global */}
            <div className="px-5 pb-4 space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-[8px] text-[#3A3A3A] uppercase tracking-[0.2em]">COMPOSITE_SCORE</span>
                    <span className="text-[8px] text-[#3A3A3A] uppercase tracking-[0.2em]">
                        40% HOOK · 30% HOLD · 20% FREQ · 10% CTR
                    </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${Math.min(score, 100)}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 8px ${color}50`,
                        }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                    AWARENESS_COMPOSITE_v1 · REACH_MODE
                </span>
                <span className="text-[8px] uppercase tracking-[0.3em]" style={{ color: `${color}80` }}>
                    {label}_SIGNAL
                </span>
            </div>
        </div>
    );
}
