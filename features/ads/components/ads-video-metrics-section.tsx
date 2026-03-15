'use client';

import type { AdCampaign, AdInsight, AdActionStat } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────

const VIDEO_OBJECTIVES = ['OUTCOME_AWARENESS', 'VIDEO_VIEWS', 'REACH', 'OUTCOME_REACH'];

// Benchmarks confirmados pela pesquisa Perplexity (Madgicx, Motion.app, Triple Whale)
const HOOK_RATE_BENCHMARKS = { weak: 25, solid: 35, strong: 45 } as const;
const HOLD_RATE_BENCHMARKS = { weak: 40, solid: 55, strong: 65 } as const;
const THRUPLAY_BENCHMARKS  = { weak: 12, solid: 20, strong: 30 } as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractVideoMetric(stats: AdActionStat[] | undefined): number {
    if (!stats || stats.length === 0) return 0;
    const item = stats.find(s => s.action_type === 'video_view') ?? stats[0];
    return parseFloat(item?.value || '0');
}

// 3s views: actions[video_view] = 3-second video views (Meta nao expoe campo dedicado no insights)
function extract3sViews(insights: AdInsight): number {
    if (insights.video_3_sec_watched_actions) {
        return extractVideoMetric(insights.video_3_sec_watched_actions);
    }
    const fromActions = insights.actions?.filter(a => a.action_type === 'video_view');
    return fromActions && fromActions.length > 0 ? extractVideoMetric(fromActions) : 0;
}

function hasVideoData(insights: AdInsight | undefined): boolean {
    if (!insights) return false;
    return (
        extractVideoMetric(insights.video_thruplay_watched_actions) > 0 ||
        extractVideoMetric(insights.video_p25_watched_actions) > 0 ||
        extract3sViews(insights) > 0
    );
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

/** Thumb Stop / Hook Rate = 3s_views / impressions × 100 (Madgicx, Motion.app) */
function calcThumbStopRate(impressions: number, views3s: number): number {
    return impressions > 0 ? (views3s / impressions) * 100 : 0;
}

/** Hold Rate = thruplay / 3s_views × 100 (retenção condicional pós-hook) */
function calcHoldRate(views3s: number, thruplay: number): number {
    return views3s > 0 ? (thruplay / views3s) * 100 : 0;
}

/** Completion Rate = p100 / 3s_views × 100 */
function calcCompletionRate(views3s: number, p100: number): number {
    return views3s > 0 ? (p100 / views3s) * 100 : 0;
}

/**
 * Fatigue Score baseado na fórmula Madgicx (pesquisa Perplexity Prompt 3):
 * Score = (currentCtr / peakCtr) × (1 / frequency) × (14 / daysActive)
 * > 0.8: saudável | 0.6–0.8: monitorar | < 0.6: provável fadiga
 */
function calcFatigueScore(currentCtr: number, peakCtr: number, frequency: number, daysActive: number): number {
    if (peakCtr <= 0 || frequency <= 0 || daysActive <= 0) return 1;
    return (currentCtr / peakCtr) * (1 / frequency) * (14 / Math.max(daysActive, 1));
}

type BenchmarkLevel = 'weak' | 'solid' | 'strong';

function getHookLevel(rate: number): BenchmarkLevel {
    if (rate >= HOOK_RATE_BENCHMARKS.strong) return 'strong';
    if (rate >= HOOK_RATE_BENCHMARKS.weak) return 'solid';
    return 'weak';
}

function getHoldLevel(rate: number): BenchmarkLevel {
    if (rate >= HOLD_RATE_BENCHMARKS.strong) return 'strong';
    if (rate >= HOLD_RATE_BENCHMARKS.weak) return 'solid';
    return 'weak';
}

function getThruplayLevel(rate: number): BenchmarkLevel {
    if (rate >= THRUPLAY_BENCHMARKS.strong) return 'strong';
    if (rate >= THRUPLAY_BENCHMARKS.weak) return 'solid';
    return 'weak';
}

const LEVEL_COLOR: Record<BenchmarkLevel, string> = {
    strong: '#A3E635',
    solid:  '#FBBF24',
    weak:   '#EF4444',
};

const LEVEL_LABEL: Record<BenchmarkLevel, string> = {
    strong: 'STRONG',
    solid:  'SOLID',
    weak:   'WEAK',
};

// ─── HookHoldHUD ─────────────────────────────────────────────────────────────

interface HookHoldMetricProps {
    label: string;
    value: number;
    level: BenchmarkLevel;
    subLabel?: string;
}

function HookHoldMetric({ label, value, level, subLabel }: HookHoldMetricProps) {
    const color = LEVEL_COLOR[level];
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">{label}</span>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-black tracking-tighter" style={{ color }}>
                    {value.toFixed(1)}%
                </span>
                <span className="text-[8px] uppercase tracking-[0.2em] font-bold mb-0.5" style={{ color }}>
                    {LEVEL_LABEL[level]}
                </span>
            </div>
            {subLabel && (
                <span className="text-[8px] text-[#4A4A4A]">{subLabel}</span>
            )}
        </div>
    );
}

// ─── VideoFunnelCard ──────────────────────────────────────────────────────────

interface VideoFunnelCardProps {
    name: string;
    insights: AdInsight;
}

function VideoFunnelCard({ name, insights }: VideoFunnelCardProps) {
    const impressions = parseInt(insights.impressions || '0');
    const views3s  = extract3sViews(insights);
    const p25      = extractVideoMetric(insights.video_p25_watched_actions);
    const p50      = extractVideoMetric(insights.video_p50_watched_actions);
    const p75      = extractVideoMetric(insights.video_p75_watched_actions);
    const p95      = extractVideoMetric(insights.video_p95_watched_actions);
    const p100     = extractVideoMetric(insights.video_p100_watched_actions);
    const thruplay = extractVideoMetric(insights.video_thruplay_watched_actions);
    const avgTime  = extractVideoMetric(insights.video_avg_time_watched_actions);
    const ctr      = parseFloat(insights.ctr || '0');
    const frequency = parseFloat(insights.frequency || '1');

    // Derived metrics
    const thumbStopRate = views3s > 0
        ? calcThumbStopRate(impressions, views3s)
        : calcThumbStopRate(impressions, p25); // fallback: use p25 if 3s unavailable
    const holdRate       = calcHoldRate(views3s > 0 ? views3s : p25, thruplay);
    const completionRate = calcCompletionRate(views3s > 0 ? views3s : p25, p100);

    const hookLevel    = getHookLevel(thumbStopRate);
    const holdLevel    = getHoldLevel(holdRate);
    const thruplayRate = impressions > 0 ? (thruplay / impressions) * 100 : 0;
    const thruplayLevel = getThruplayLevel(thruplayRate);

    // Fatigue Score (heurístico — assume CTR atual como peak sem histórico)
    const fatigueScore = calcFatigueScore(ctr, Math.max(ctr, 1.25), frequency, 14);
    const fatigueColor = fatigueScore >= 0.8 ? '#A3E635' : fatigueScore >= 0.6 ? '#FBBF24' : '#EF4444';
    const fatigueLabel = fatigueScore >= 0.8 ? 'HEALTHY' : fatigueScore >= 0.6 ? 'MONITOR' : 'FATIGUED';

    // Funil de retenção: baseRef = views3s se disponível, senão impressões
    const baseRef = views3s > 0 ? views3s : impressions;
    const funnelSteps = [
        ...(views3s > 0 ? [{ label: '3S_VIEWS', val: views3s, color: '#A3E635', base: impressions }] : []),
        { label: 'P25',    val: p25,      color: '#A3E635', base: baseRef },
        { label: 'P50',    val: p50,      color: '#A3E635', base: baseRef },
        { label: 'P75',    val: p75,      color: '#FBBF24', base: baseRef },
        { label: 'P95',    val: p95,      color: '#f97316', base: baseRef },
        ...(p100 > 0 ? [{ label: 'P100', val: p100, color: '#EF4444', base: baseRef }] : []),
    ];

    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono group hover:border-white/20 transition-all">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5">
                <p className="text-[11px] font-bold text-[#F5F5F5] uppercase tracking-tight truncate" title={name}>
                    {name}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                        {formatCount(impressions)} <span className="text-[#8A8A8A]">IMP</span>
                    </span>
                    {avgTime > 0 && (
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                            AVG_WATCH: <span className="text-[#F5F5F5] font-bold">{avgTime.toFixed(1)}s</span>
                        </span>
                    )}
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                        FREQ: <span className="text-[#F5F5F5] font-bold">{frequency.toFixed(1)}x</span>
                    </span>
                </div>
            </div>

            {/* Hook + Hold Rate row */}
            <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-white/5">
                <HookHoldMetric
                    label="HOOK_RATE"
                    value={thumbStopRate}
                    level={hookLevel}
                    subLabel={views3s > 0 ? `${formatCount(Math.round(views3s))} 3s` : 'via P25'}
                />
                <HookHoldMetric
                    label="HOLD_RATE"
                    value={holdRate}
                    level={holdLevel}
                    subLabel={`${formatCount(Math.round(thruplay))} thru`}
                />
                {completionRate > 0 ? (
                    <HookHoldMetric
                        label="COMPLETE"
                        value={completionRate}
                        level={completionRate >= 30 ? 'strong' : completionRate >= 15 ? 'solid' : 'weak'}
                        subLabel={`${formatCount(Math.round(p100))} 100%`}
                    />
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">FATIGUE</span>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black tracking-tighter" style={{ color: fatigueColor }}>
                                {(fatigueScore * 100).toFixed(0)}
                            </span>
                            <span className="text-[8px] uppercase tracking-[0.2em] font-bold mb-0.5" style={{ color: fatigueColor }}>
                                {fatigueLabel}
                            </span>
                        </div>
                        <span className="text-[8px] text-[#4A4A4A]">score 0–100</span>
                    </div>
                )}
            </div>

            {/* Funnel bars */}
            <div className="p-5 space-y-3">
                {funnelSteps.map(step => {
                    const pct = step.base > 0 ? (step.val / step.base) * 100 : 0;
                    return (
                        <div key={step.label} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">
                                    {step.label}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-[#4A4A4A]">
                                        {formatCount(Math.round(step.val))}
                                    </span>
                                    <span className="text-[11px] font-black" style={{ color: step.color }}>
                                        {pct.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-[2px] h-[5px]">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 transition-all duration-700"
                                        style={{
                                            backgroundColor:
                                                (i + 1) * 5 <= pct ? step.color : 'rgba(255,255,255,0.04)',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* ThruPlay highlight */}
                <div className="mt-5 pt-5 border-t border-white/5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold block">
                                THRUPLAY_RATE
                            </span>
                            <span className="text-[9px] text-[#4A4A4A]">
                                {formatCount(Math.round(thruplay))} views
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span
                                className="text-3xl font-black tracking-tighter"
                                style={{ color: LEVEL_COLOR[thruplayLevel] }}
                            >
                                {thruplayRate.toFixed(1)}%
                            </span>
                            <span
                                className="text-[8px] uppercase tracking-[0.2em] font-bold"
                                style={{ color: LEVEL_COLOR[thruplayLevel] }}
                            >
                                {LEVEL_LABEL[thruplayLevel]}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${Math.min(thruplayRate * 2.5, 100)}%`,
                                backgroundColor: LEVEL_COLOR[thruplayLevel],
                                boxShadow: `0 0 6px ${LEVEL_COLOR[thruplayLevel]}40`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                    VIDEO_FUNNEL_v2
                </span>
                <span
                    className={cn(
                        'text-[8px] uppercase tracking-[0.3em]',
                        thruplay > 0 ? 'text-[#A3E635]/40' : 'text-[#4A4A4A]'
                    )}
                >
                    {thruplay > 0 ? 'SIGNAL_OK' : 'NO_SIGNAL'}
                </span>
            </div>
        </div>
    );
}

// ─── Summary HUD ─────────────────────────────────────────────────────────────

interface SummaryHUDProps {
    campaigns: AdCampaign[];
}

function VideoSummaryHUD({ campaigns }: SummaryHUDProps) {
    const validCampaigns = campaigns.filter(c => hasVideoData(c.insights));
    if (validCampaigns.length === 0) return null;

    // Compute avg hook & hold across campaigns
    let totalHook = 0, totalHold = 0, countHook = 0, countHold = 0;
    let weakHook = 0, weakHold = 0;

    for (const c of validCampaigns) {
        const ins = c.insights!;
        const imp = parseInt(ins.impressions || '0');
        const v3s = extract3sViews(ins);
        const p25 = extractVideoMetric(ins.video_p25_watched_actions);
        const thru = extractVideoMetric(ins.video_thruplay_watched_actions);

        const hookBase = v3s > 0 ? v3s : p25;
        const hook = calcThumbStopRate(imp, hookBase);
        const hold = calcHoldRate(hookBase, thru);

        if (imp > 0) { totalHook += hook; countHook++; if (hook < HOOK_RATE_BENCHMARKS.weak) weakHook++; }
        if (hookBase > 0) { totalHold += hold; countHold++; if (hold < HOLD_RATE_BENCHMARKS.weak) weakHold++; }
    }

    const avgHook = countHook > 0 ? totalHook / countHook : 0;
    const avgHold = countHold > 0 ? totalHold / countHold : 0;
    const hookLevel = getHookLevel(avgHook);
    const holdLevel = getHoldLevel(avgHold);

    const hasAlert = weakHook > 0 || weakHold > 0;

    return (
        <div className="bg-[#050505] border border-white/10 rounded-lg px-5 py-4 font-mono">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[#A3E635] text-[10px]">▶</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    VIDEO_CREATIVE_SUMMARY
                </span>
                <span className="text-[9px] text-[#4A4A4A] ml-1">[{validCampaigns.length}_STREAMS]</span>
                <span className="h-px flex-1 bg-white/5 ml-2" />
                {hasAlert && (
                    <span className="text-[8px] text-[#EF4444] uppercase tracking-widest font-bold">
                        ◎ {weakHook > 0 ? `${weakHook} HOOK_WEAK` : ''}{weakHook > 0 && weakHold > 0 ? ' · ' : ''}{weakHold > 0 ? `${weakHold} HOLD_WEAK` : ''}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold block mb-1">
                        AVG_HOOK_RATE
                    </span>
                    <span className="text-xl font-black tracking-tighter" style={{ color: LEVEL_COLOR[hookLevel] }}>
                        {avgHook.toFixed(1)}%
                    </span>
                    <span className="text-[8px] ml-2 font-bold" style={{ color: LEVEL_COLOR[hookLevel] }}>
                        {LEVEL_LABEL[hookLevel]}
                    </span>
                    <p className="text-[8px] text-[#4A4A4A] mt-1">bench: 25% sólido · 35% forte</p>
                </div>
                <div>
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold block mb-1">
                        AVG_HOLD_RATE
                    </span>
                    <span className="text-xl font-black tracking-tighter" style={{ color: LEVEL_COLOR[holdLevel] }}>
                        {avgHold.toFixed(1)}%
                    </span>
                    <span className="text-[8px] ml-2 font-bold" style={{ color: LEVEL_COLOR[holdLevel] }}>
                        {LEVEL_LABEL[holdLevel]}
                    </span>
                    <p className="text-[8px] text-[#4A4A4A] mt-1">bench: 40% sólido · 60% forte</p>
                </div>
                <div>
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold block mb-1">
                        HOOK_SIGNAL
                    </span>
                    <span className="text-xl font-black tracking-tighter" style={{ color: weakHook > 0 ? '#EF4444' : '#A3E635' }}>
                        {validCampaigns.length - weakHook}/{validCampaigns.length}
                    </span>
                    <p className="text-[8px] text-[#4A4A4A] mt-1">criativos com hook ≥ 25%</p>
                </div>
                <div>
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold block mb-1">
                        HOLD_SIGNAL
                    </span>
                    <span className="text-xl font-black tracking-tighter" style={{ color: weakHold > 0 ? '#EF4444' : '#A3E635' }}>
                        {validCampaigns.length - weakHold}/{validCampaigns.length}
                    </span>
                    <p className="text-[8px] text-[#4A4A4A] mt-1">criativos com hold ≥ 40%</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
}

export function AdsVideoMetricsSection({ campaigns }: Props) {
    const videoCampaigns = campaigns.filter(
        c => (VIDEO_OBJECTIVES.includes(c.objective || '') || hasVideoData(c.insights)) && hasVideoData(c.insights)
    );

    if (videoCampaigns.length === 0) return null;

    return (
        <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[#A3E635] text-[10px] drop-shadow-[0_0_6px_rgba(163,230,53,0.4)]">
                    ▶
                </span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Video_Retention_Funnel
                </h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">
                    [{videoCampaigns.length}_STREAMS]
                </span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Summary HUD */}
            <VideoSummaryHUD campaigns={videoCampaigns} />

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {videoCampaigns.map(c => (
                    <VideoFunnelCard key={c.id} name={c.name} insights={c.insights!} />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 font-mono text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em] pt-1 opacity-60 flex-wrap">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#A3E635] inline-block" /> HOOK ≥ 35%_STRONG
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#FBBF24] inline-block" /> HOOK 25–35%_SOLID
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#EF4444] inline-block" /> HOOK &lt; 25%_WEAK
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#A3E635]/30 inline-block" /> THRUPLAY_CONV
                </span>
            </div>
        </section>
    );
}
