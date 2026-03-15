'use client';

import type { AdCampaign, AdInsight } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Types & Config ───────────────────────────────────────────────────────────

type RankValue =
    | 'ABOVE_AVERAGE'
    | 'AVERAGE'
    | 'BELOW_AVERAGE_10'
    | 'BELOW_AVERAGE_20'
    | 'BELOW_AVERAGE_35'
    | 'UNKNOWN'
    | string;

interface RankCfg {
    label: string;
    color: string;
    border: string;
    bg: string;
    score: number;
}

const RANK_MAP: Record<string, RankCfg> = {
    ABOVE_AVERAGE: {
        label: 'ABOVE_AVG',
        color: '#A3E635',
        border: 'border-[#A3E635]/20',
        bg: 'bg-[#A3E635]/10',
        score: 4,
    },
    AVERAGE: {
        label: 'AVERAGE',
        color: '#FBBF24',
        border: 'border-[#FBBF24]/20',
        bg: 'bg-[#FBBF24]/10',
        score: 3,
    },
    BELOW_AVERAGE_10: {
        label: 'BELOW_10%',
        color: '#f97316',
        border: 'border-orange-500/20',
        bg: 'bg-orange-500/10',
        score: 2,
    },
    BELOW_AVERAGE_20: {
        label: 'BELOW_20%',
        color: '#EF4444',
        border: 'border-[#EF4444]/20',
        bg: 'bg-[#EF4444]/10',
        score: 1,
    },
    BELOW_AVERAGE_35: {
        label: 'BELOW_35%',
        color: '#EF4444',
        border: 'border-[#EF4444]/20',
        bg: 'bg-[#EF4444]/10',
        score: 0,
    },
    UNKNOWN: {
        label: 'UNKNOWN',
        color: '#4A4A4A',
        border: 'border-white/10',
        bg: 'bg-white/5',
        score: -1,
    },
};

function getRankCfg(value: RankValue | undefined): RankCfg {
    if (!value) return RANK_MAP.UNKNOWN;
    return RANK_MAP[value] ?? RANK_MAP.UNKNOWN;
}

function hasRankData(ins: AdInsight | undefined): boolean {
    if (!ins) return false;
    const vals = [ins.quality_ranking, ins.engagement_rate_ranking, ins.conversion_rate_ranking];
    return vals.some(v => v && v !== 'UNKNOWN');
}

function computeOverall(ins: AdInsight): 'good' | 'average' | 'poor' {
    const scores = [
        getRankCfg(ins.quality_ranking).score,
        getRankCfg(ins.engagement_rate_ranking).score,
        getRankCfg(ins.conversion_rate_ranking).score,
    ].filter(s => s >= 0);
    if (scores.length === 0) return 'average';
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 3.5) return 'good';
    if (avg >= 1.5) return 'average';
    return 'poor';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankBadge({ value }: { value: RankValue | undefined }) {
    const cfg = getRankCfg(value);
    return (
        <span
            className={cn(
                'inline-block text-[8px] px-1.5 py-0.5 border rounded uppercase tracking-[0.15em] font-black font-mono',
                cfg.bg,
                cfg.border
            )}
            style={{ color: cfg.color }}
        >
            {cfg.label}
        </span>
    );
}

function OverallPill({ status }: { status: 'good' | 'average' | 'poor' }) {
    const map = {
        good: { label: 'OPTIMAL', color: '#A3E635' },
        average: { label: 'NOMINAL', color: '#FBBF24' },
        poor: { label: 'AT_RISK', color: '#EF4444' },
    };
    const { label, color } = map[status];
    return (
        <span
            className="text-[9px] px-2 py-0.5 border rounded uppercase font-black tracking-widest font-mono"
            style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
        >
            {label}
        </span>
    );
}

// ─── Rank Score bar (visual score 0–4) ───────────────────────────────────────

function RankMiniBar({ score }: { score: number }) {
    if (score < 0) return <span className="text-[9px] text-[#4A4A4A]">—</span>;
    const pct = (score / 4) * 100;
    const color = score >= 3.5 ? '#A3E635' : score >= 1.5 ? '#FBBF24' : '#EF4444';
    return (
        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
}

export function AdsQualityRankingsSection({ campaigns }: Props) {
    const ranked = campaigns.filter(c => hasRankData(c.insights));

    if (ranked.length === 0) return null;

    const good = ranked.filter(c => computeOverall(c.insights!) === 'good').length;
    const avg = ranked.filter(c => computeOverall(c.insights!) === 'average').length;
    const poor = ranked.filter(c => computeOverall(c.insights!) === 'poor').length;

    return (
        <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-purple-400 text-[10px]">◈</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Creative_Quality_Matrix
                </h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">
                    [{ranked.length}_NODES]
                </span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3 font-mono">
                {[
                    { label: 'HIGH_PERF', value: good, color: '#A3E635' },
                    { label: 'NOMINAL', value: avg, color: '#FBBF24' },
                    { label: 'AT_RISK', value: poor, color: '#EF4444' },
                ].map(item => (
                    <div
                        key={item.label}
                        className="bg-[#0A0A0A] border border-white/5 rounded-lg px-4 py-3 flex items-center justify-between"
                    >
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em]">
                            {item.label}
                        </span>
                        <span
                            className="text-2xl font-black tracking-tighter"
                            style={{ color: item.color }}
                        >
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Rankings table */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                {/* Blueprint grid BG */}
                <div className="relative">
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                        }}
                    />
                    <table className="w-full text-left relative z-10">
                        <thead>
                            <tr className="bg-white/[0.04] text-[9px] uppercase tracking-widest text-[#4A4A4A] border-b border-white/5">
                                <th className="px-5 py-3.5 font-bold">Campaign_Node</th>
                                <th className="px-5 py-3.5 text-center font-bold">Quality_Rank</th>
                                <th className="px-5 py-3.5 text-center font-bold">Engagement_Rank</th>
                                <th className="px-5 py-3.5 text-center font-bold">Conv_Rank</th>
                                <th className="px-5 py-3.5 text-center font-bold">Overall</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranked.map(c => {
                                const ins = c.insights!;
                                const overall = computeOverall(ins);

                                // Avg score bar
                                const scores = [
                                    getRankCfg(ins.quality_ranking).score,
                                    getRankCfg(ins.engagement_rate_ranking).score,
                                    getRankCfg(ins.conversion_rate_ranking).score,
                                ].filter(s => s >= 0);
                                const avgScore =
                                    scores.length > 0
                                        ? scores.reduce((a, b) => a + b, 0) / scores.length
                                        : -1;

                                return (
                                    <tr
                                        key={c.id}
                                        className={cn(
                                            'border-b border-white/5 hover:bg-white/[0.02] transition-colors text-[11px]',
                                            overall === 'poor' && 'bg-[#EF4444]/[0.02]'
                                        )}
                                    >
                                        <td
                                            className="px-5 py-3.5 font-bold text-[#F5F5F5] max-w-[200px] truncate uppercase"
                                            title={c.name}
                                        >
                                            {c.name}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <RankBadge value={ins.quality_ranking} />
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <RankBadge value={ins.engagement_rate_ranking} />
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <RankBadge value={ins.conversion_rate_ranking} />
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <OverallPill status={overall} />
                                                <RankMiniBar score={avgScore} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend footer */}
                <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center gap-6 font-mono text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em]">
                    <span>QUALITY_RANK: criativo vs. audiência</span>
                    <span>ENGAGEMENT_RANK: CTR vs. categoria</span>
                    <span>CONV_RANK: conversão vs. concorrência</span>
                </div>
            </div>
        </section>
    );
}
