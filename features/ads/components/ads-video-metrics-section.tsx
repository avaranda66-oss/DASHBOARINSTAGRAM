'use client';

import type { AdCampaign, AdInsight, AdActionStat } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────

const VIDEO_OBJECTIVES = ['OUTCOME_AWARENESS', 'VIDEO_VIEWS', 'REACH', 'OUTCOME_REACH'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractVideoMetric(stats: AdActionStat[] | undefined): number {
    if (!stats || stats.length === 0) return 0;
    const item = stats.find(s => s.action_type === 'video_view') ?? stats[0];
    return parseFloat(item?.value || '0');
}

function hasVideoData(insights: AdInsight | undefined): boolean {
    if (!insights) return false;
    return (
        extractVideoMetric(insights.video_thruplay_watched_actions) > 0 ||
        extractVideoMetric(insights.video_p25_watched_actions) > 0
    );
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

// ─── VideoFunnelCard ──────────────────────────────────────────────────────────

interface VideoFunnelCardProps {
    name: string;
    insights: AdInsight;
}

function VideoFunnelCard({ name, insights }: VideoFunnelCardProps) {
    const impressions = parseInt(insights.impressions || '0');
    const p25 = extractVideoMetric(insights.video_p25_watched_actions);
    const p50 = extractVideoMetric(insights.video_p50_watched_actions);
    const p75 = extractVideoMetric(insights.video_p75_watched_actions);
    const p95 = extractVideoMetric(insights.video_p95_watched_actions);
    const thruplay = extractVideoMetric(insights.video_thruplay_watched_actions);
    const avgTime = extractVideoMetric(insights.video_avg_time_watched_actions);

    const rate = (val: number) => (impressions > 0 ? (val / impressions) * 100 : 0);

    const thruplayRate = rate(thruplay);
    const thruplayColor =
        thruplayRate >= 25
            ? '#A3E635'
            : thruplayRate >= 12
            ? '#FBBF24'
            : '#EF4444';
    const thruplayLabel =
        thruplayRate >= 25 ? 'STRONG' : thruplayRate >= 12 ? 'NOMINAL' : 'WEAK';

    const funnelSteps = [
        { label: 'P25', val: p25, color: '#A3E635' },
        { label: 'P50', val: p50, color: '#A3E635' },
        { label: 'P75', val: p75, color: '#FBBF24' },
        { label: 'P95', val: p95, color: '#f97316' },
    ];

    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono group hover:border-white/20 transition-all">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5">
                <p
                    className="text-[11px] font-bold text-[#F5F5F5] uppercase tracking-tight truncate"
                    title={name}
                >
                    {name}
                </p>
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                        {formatCount(impressions)}{' '}
                        <span className="text-[#8A8A8A]">IMP</span>
                    </span>
                    {avgTime > 0 && (
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                            AVG_WATCH:{' '}
                            <span className="text-[#F5F5F5] font-bold">{avgTime.toFixed(1)}s</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Funnel bars */}
            <div className="p-5 space-y-3">
                {funnelSteps.map(step => {
                    const pct = rate(step.val);
                    return (
                        <div key={step.label} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">
                                    {step.label}_COMPLETION
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-[#4A4A4A]">
                                        {formatCount(Math.round(step.val))}
                                    </span>
                                    <span
                                        className="text-[11px] font-black"
                                        style={{ color: step.color }}
                                    >
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
                                                (i + 1) * 5 <= pct
                                                    ? step.color
                                                    : 'rgba(255,255,255,0.04)',
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
                                style={{ color: thruplayColor }}
                            >
                                {thruplayRate.toFixed(1)}%
                            </span>
                            <span
                                className="text-[8px] uppercase tracking-[0.2em] font-bold"
                                style={{ color: thruplayColor }}
                            >
                                {thruplayLabel}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${Math.min(thruplayRate * 2.5, 100)}%`,
                                backgroundColor: thruplayColor,
                                boxShadow: `0 0 6px ${thruplayColor}40`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Technical footer */}
            <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                    VIDEO_FUNNEL_ANALYSIS
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

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
}

export function AdsVideoMetricsSection({ campaigns }: Props) {
    const videoCampaigns = campaigns.filter(
        c =>
            (VIDEO_OBJECTIVES.includes(c.objective || '') || hasVideoData(c.insights)) &&
            hasVideoData(c.insights)
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

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {videoCampaigns.map(c => (
                    <VideoFunnelCard key={c.id} name={c.name} insights={c.insights!} />
                ))}
            </div>

            {/* Blueprint legend */}
            <div className="flex items-center gap-6 font-mono text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em] pt-1 opacity-60">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#A3E635] inline-block" /> P25–P50_NORM
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#FBBF24] inline-block" /> P75_DECAY
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#f97316] inline-block" /> P95_ENGAGED
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-[3px] rounded-full bg-[#A3E635]/30 inline-block" /> THRUPLAY_CONV
                </span>
            </div>
        </section>
    );
}
