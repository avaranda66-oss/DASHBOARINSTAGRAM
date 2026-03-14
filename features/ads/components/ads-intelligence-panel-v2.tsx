'use client';

import { useEffect, useState } from 'react';
/* [ZERO_LUCIDE_PURGE] */

import { Button } from '@/design-system/atoms/Button';
import { useAdsStore } from '@/stores';
import type {
    IntelligenceMetrics,
    CreativeFatigueScore,
    AudienceSaturationIndex,
    ABTestResult,
    BenchmarkComparison,
    AccountHealthScore,
} from '@/types/ads';
import { cn } from '@/design-system/utils/cn';
import { AdsInsightsFeed } from './ads-insights-feed';
import { AdsAnomalyMultivariate } from './ads-anomaly-multivariate';
import { AdsAttributionSection } from './ads-attribution-section';
import { AdsVideoMetricsSection } from './ads-video-metrics-section';
import { AdsQualityRankingsSection } from './ads-quality-rankings-section';
import type { DailyAdInsight, AdCampaign } from '@/types/ads';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    token: string | null;
    accountId: string | null;
    /** Série temporal diária para o feed de alertas automáticos (InsightEngine) */
    daily?: DailyAdInsight[];
    /** Campanhas para Shapley Attribution (US-45) */
    campaigns?: AdCampaign[];
}

// ─── Constants & Glyphs ──────────────────────────────────────────────────────

const GLYPHS = {
    BRAIN: '◆',
    HEART: '◑',
    USERS: '○',
    LAB: '◬',
    CHART: '▤',
    LOADING: '◑',
    ALERT: '▲',
    RELOAD: '⚡',
    SPARK: '◆',
    EYE: '◎',
    TREND_UP: '↗',
    TREND_DOWN: '↘',
    MINUS: '─',
    CLOCK: '◷',
    TARGET: '◎',
    INFO: '◎',
    CLOSE: '✕'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

const healthColors: Record<string, string> = {
    excellent: '#A3E635',
    good: '#A3E635', // No blue allowed
    attention: '#FBBF24',
    critical: '#EF4444',
};

const healthBg: Record<string, string> = {
    excellent: 'bg-[#A3E635]/10 border-[#A3E635]/20',
    good: 'bg-blue-500/10 border-blue-500/20',
    attention: 'bg-[#FBBF24]/10 border-[#FBBF24]/20',
    critical: 'bg-[#EF4444]/10 border-[#EF4444]/20',
};

const fatigueColors: Record<string, string> = {
    healthy: '#A3E635',
    early: '#FBBF24',
    moderate: '#f97316',
    severe: '#EF4444',
};

const fatigueBg: Record<string, string> = {
    healthy: 'bg-[#A3E635]/10 text-[#A3E635]/60 border-[#A3E635]/20',
    early: 'bg-[#FBBF24]/10 text-[#FBBF24]/60 border-[#FBBF24]/20',
    moderate: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    severe: 'bg-[#EF4444]/10 text-[#EF4444]/60 border-[#EF4444]/20',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString('pt-BR');
}

function formatCurrency(v: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v);
}

function MiniSparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
    if (!data || data.length < 2) return null;
    const h = 24, w = 80;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    const points = data
        .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
        .join(' ');
    return (
        <svg width={w} height={h} className="inline-block opacity-40 group-hover:opacity-100 transition-opacity">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CircularGauge({ score, level }: { score: number; level: string }) {
    const color = healthColors[level] || '#4A4A4A';
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    // Segmented segments (10 segments)
    const segments = 10;
    const segmentGap = 4;
    const segmentLength = (circumference / segments) - segmentGap;

    return (
        <div className="relative inline-flex items-center justify-center font-mono">
            <svg width={140} height={140} className="-rotate-90">
                {/* Outer Ruler / Markings */}
                {[...Array(12)].map((_, i) => (
                    <line
                        key={i}
                        x1={70} y1={5} x2={70} y2={12}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={1}
                        transform={`rotate(${i * 30}, 70, 70)`}
                    />
                ))}
                
                {/* Background Ring - Segmented */}
                <circle
                    cx={70} cy={70} r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth={10}
                    strokeDasharray={`${segmentLength} ${segmentGap}`}
                />
                
                {/* Active Ring - Segmented */}
                <circle
                    cx={70} cy={70} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={10}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="butt"
                    style={{ 
                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        filter: `drop-shadow(0 0 6px ${color}40)` 
                    }}
                />
                
                {/* Inner Crosshair */}
                <line x1={70} y1={60} x2={70} y2={80} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                <line x1={60} y1={70} x2={80} y2={70} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
            </svg>
            
            <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-[#4A4A4A] mb-[-4px] tracking-[0.2em] font-bold">SCORE_IDX</span>
                <span className="text-4xl font-black tracking-tighter" style={{ color }}>
                    {score}
                </span>
                <div 
                    className="px-2 py-0.5 mt-1 border text-[8px] font-black uppercase tracking-[0.2em]"
                    style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
                >
                    {level}
                </div>
            </div>
        </div>
    );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
    const pct = Math.min(Math.max(value, 0), 100);
    let barColor = '#A3E635';
    if (pct < 40) barColor = '#EF4444';
    else if (pct < 60) barColor = '#FBBF24';

    return (
        <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-end">
                <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">{label}</span>
                <span className="text-[10px] text-[#F5F5F5] font-black tracking-tighter">{value.toFixed(0)}%</span>
            </div>
            <div className="flex gap-[2px] h-[6px]">
                {[...Array(10)].map((_, i) => (
                    <div 
                        key={i}
                        className="flex-1 transition-all duration-700"
                        style={{ 
                            backgroundColor: (i + 1) * 10 <= pct ? barColor : 'rgba(255,255,255,0.03)',
                            opacity: (i + 1) * 10 <= pct ? 1 : 0.3
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function DecayBar({ label, value }: { label: string; value: number | null }) {
    if (value === null) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#4A4A4A] font-bold w-12">{label}</span>
                <span className="text-[9px] text-[#4A4A4A]">NULL</span>
            </div>
        );
    }
    const pct = Math.min(Math.max(Math.abs(value) * 100, 0), 100);
    const isNeg = value < 0;
    const barColor = isNeg ? '#EF4444' : value > 0.1 ? '#A3E635' : '#FBBF24';

    return (
        <div className="flex items-center gap-2 font-mono">
            <span className="text-[9px] text-[#4A4A4A] font-bold w-12">{label}</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <span className="text-[9px] text-[#F5F5F5] w-12 text-right">
                {isNeg ? '' : '+'}{(value * 100).toFixed(0)}%
            </span>
        </div>
    );
}

// ─── Sections ─────────────────────────────────────────────────────────────

function AccountHealthSection({ health }: { health: AccountHealthScore }) {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-[#A3E635] drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]">{wrap(GLYPHS.SPARK)}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">Operational_Heartbeat_Analysis</h3>
                <span className="h-px flex-1 bg-white/5" />
            </div>
            
            <div 
                className="bg-[#0A0A0A] border rounded-lg relative overflow-hidden" 
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
                {/* Blueprint Grid Background */}
                <div 
                    className="absolute inset-0 opacity-[0.03]" 
                    style={{ 
                        backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }} 
                />

                <div className="p-10 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="pt-2">
                            <CircularGauge score={health.score} level={health.level} />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 w-full border-l border-white/5 pl-12">
                            <SubScoreBar label="FATIGUE_MEAN" value={health.subScores.fatigueMean} />
                            <SubScoreBar label="ROAS_EFFICIENCY" value={health.subScores.roasScore} />
                            <SubScoreBar label="SATURATION_IDX" value={health.subScores.saturationMean} />
                            <SubScoreBar label="BUDGET_LOAD" value={health.subScores.budgetUtilization} />
                        </div>
                    </div>
                </div>
                
                {/* Technical Metadata Footer */}
                <div className="px-10 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between font-mono text-[8px] text-[#4A4A4A] tracking-[0.3em]">
                    <span>LINK_STATE: ESTABLISHED</span>
                    <span>KERNEL_FREQ: 144HZ</span>
                    <span>BUFFER_LOAD: STABLE [0.002MS]</span>
                </div>
            </div>
        </section>
    );
}

function CreativeFatigueSection({ scores }: { scores: CreativeFatigueScore[] }) {
    if (scores.length === 0) return null;
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-orange-400">{wrap(GLYPHS.EYE)}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Visual_Pulse_Decay</h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">[{scores.length}_INSTANCES]</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {scores.map((item) => (
                    <div key={item.adId} className="bg-[#0A0A0A] border border-white/10 rounded-lg hover:border-white/20 transition-all group font-mono">
                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-4">
                                {item.thumbnailUrl ? (
                                    <div className="w-16 h-16 rounded overflow-hidden grayscale group-hover:grayscale-0 transition-all border border-white/5">
                                        <img
                                            src={`/api/image-proxy?url=${encodeURIComponent(item.thumbnailUrl)}`}
                                            alt={item.adName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                                        <span className="text-[#4A4A4A]">{wrap(GLYPHS.EYE)}</span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-[#F5F5F5] truncate uppercase tracking-tight" title={item.adName}>
                                        {item.adName}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-black", fatigueBg[item.level])}>
                                            {item.level}
                                        </span>
                                        <span className="text-[11px] font-bold" style={{ color: fatigueColors[item.level] }}>
                                            {item.score.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <span>{wrap(GLYPHS.CLOCK)}</span> {item.daysActive}D_ONLINE
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span>{wrap(GLYPHS.EYE)}</span> {formatNumber(item.totalImpressions)}
                                </span>
                                <MiniSparkline data={item.trend} color={fatigueColors[item.level]} />
                            </div>

                            <p className="text-[10px] text-[#8A8A8A] italic leading-tight uppercase">
                                RECOMM: {item.recommendation}
                            </p>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <DecayBar label="CTR" value={item.decayRatios.ctr} />
                                <DecayBar label="CPM" value={item.decayRatios.cpm} />
                                <DecayBar label="CPA" value={item.decayRatios.cpa} />
                            </div>
                    </div>
                </div>
                ))}
            </div>
        </section>
    );
}

function AudienceSaturationSection({ indexes }: { indexes: AudienceSaturationIndex[] }) {
    if (indexes.length === 0) return null;
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-blue-400">{wrap(GLYPHS.USERS)}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Frequency_Entropy</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-mono">
                {indexes.map((item) => (
                    <div key={item.adsetId} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-5 group hover:border-white/20 transition-all">
                        <p className="text-[11px] font-bold text-[#F5F5F5] truncate uppercase tracking-tight mb-4">{item.adsetName}</p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] text-[#4A4A4A]">
                                <span className="uppercase tracking-widest">FREQ / TARGET</span>
                                <span className="text-[#F5F5F5] font-bold">{item.frequency.toFixed(2)} / {item.optimalFrequency.toFixed(1)}</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em]">
                                    <span className="text-[#4A4A4A]">SATURATION_LOAD</span>
                                    <span style={{ color: healthColors[item.level === 'optimal' ? 'excellent' : item.level === 'saturated' ? 'critical' : 'attention'] }}>
                                        {item.saturationIndex.toFixed(2)}X
                                    </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${Math.min(item.saturationIndex * 30, 100)}%`,
                                            backgroundColor: healthColors[item.level === 'optimal' ? 'excellent' : item.level === 'saturated' ? 'critical' : 'attention']
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em]">
                                    <span className="text-[#4A4A4A]">{item.estimatedAudienceSize ? 'AUDIENCE_REACH' : 'FREQ_RATE'}</span>
                                    <span className="text-[#F5F5F5]">{item.reachPercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(item.reachPercent, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-[#8A8A8A] uppercase italic leading-tight border-t border-white/5 pt-4 mt-2">
                                PROTOCOL: {item.recommendation}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function BenchmarkSection({ benchmark }: { benchmark: BenchmarkComparison }) {
    const [mode, setMode] = useState<'sector' | 'historical'>(benchmark?.mode ?? 'sector');
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-purple-400">{wrap(GLYPHS.CHART)}</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Ecosystem_Calibration</h3>
                    <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">[{benchmark.industry}]</span>
                </div>
                <div className="flex bg-[#050505] border border-white/10 rounded overflow-hidden font-mono p-0.5">
                    {(['sector', 'historical'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                "text-[9px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all",
                                mode === m ? "bg-[#A3E635] text-black" : "text-[#4A4A4A] hover:text-[#F5F5F5]"
                            )}
                        >
                            {m === 'sector' ? 'SECTOR_HUB' : 'HIST_CORE'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 text-[9px] uppercase tracking-widest text-[#4A4A4A]">
                            <th className="px-6 py-4 font-bold">Metric_Node</th>
                            <th className="px-6 py-4 text-right font-bold">Local_Data</th>
                            <th className="px-6 py-4 text-right font-bold">{mode === 'historical' ? 'Período Ant.' : 'Baseline'}</th>
                            <th className="px-6 py-4 text-right font-bold">Delta_Idx</th>
                            <th className="px-6 py-4 text-center font-bold">Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px]">
                        {(mode === 'historical' ? benchmark.historicalEntries : benchmark.entries).map((entry) => (
                            <tr key={entry.metric} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-[#F5F5F5] font-bold uppercase">{entry.label}</td>
                                <td className="px-6 py-4 text-right text-[#F5F5F5]">{entry.clientValue.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[#4A4A4A]">{entry.benchmarkValue.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={cn("font-bold", entry.status === 'above' ? "text-[#A3E635]" : entry.status === 'below' ? "text-[#EF4444]" : "text-[#FBBF24]")}>
                                        {entry.status === 'above' ? wrap(GLYPHS.TREND_UP) : entry.status === 'below' ? wrap(GLYPHS.TREND_DOWN) : wrap(GLYPHS.MINUS)} {entry.indexRatio.toFixed(2)}X
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn("text-[9px] px-2 py-0.5 rounded border uppercase font-black tracking-widest", 
                                        entry.status === 'above' ? "bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20" : 
                                        entry.status === 'below' ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" : 
                                        "bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20")}>
                                        {entry.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function ABTestSection({ tests }: { tests: ABTestResult[] }) {
    if (tests.length === 0) return null;
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-[#A3E635]">{wrap(GLYPHS.LAB)}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Binary_Verification_Kernels</h3>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 font-mono">
                {tests.map((test) => (
                    <div key={test.adsetId} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <p className="text-[11px] font-bold text-[#F5F5F5] uppercase tracking-tight truncate max-w-[70%]">{test.adsetName}</p>
                            <span className={cn("text-[9px] px-2 py-0.5 rounded border uppercase font-black tracking-widest", 
                                test.status === 'significant' ? "bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20" : 
                                test.status === 'trending' ? "bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20" : 
                                "bg-white/5 text-[#4A4A4A] border-white/10")}>
                                {test.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                                    <span className="text-[#4A4A4A]">CONFIDENCE_VAL</span>
                                    <span className="text-[#A3E635]">{test.confidence.toFixed(1)}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#A3E635] transition-all duration-1000" style={{ width: `${test.confidence}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                                    <span className="text-[#4A4A4A]">SAMPLE_LOAD</span>
                                    <span className="text-blue-500">{test.sampleProgress.toFixed(0)}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${test.sampleProgress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto pt-2">
                            <table className="w-full text-left">
                                <thead className="text-[8px] uppercase tracking-widest text-[#4A4A4A]">
                                    <tr className="border-b border-white/5">
                                        <th className="py-2">Variant</th>
                                        <th className="text-right py-2">Imp</th>
                                        <th className="text-right py-2">Yield_CTR</th>
                                        <th className="text-right py-2">Conv</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {test.variants.map((v) => {
                                        const isWinner = test.status === 'significant' && v.adId === test.leadingVariantId;
                                        return (
                                            <tr key={v.adId} className={cn("border-b border-white/5", isWinner && "bg-[#A3E635]/5")}>
                                                <td className="py-2 pr-4 flex items-center gap-2">
                                                    {isWinner && <span className="text-[#A3E635]">{wrap(GLYPHS.TARGET)}</span>}
                                                    <span className={cn("truncate uppercase font-bold", isWinner ? "text-[#A3E635]" : "text-[#8A8A8A]")}>{v.adName}</span>
                                                </td>
                                                <td className="text-right py-2 text-[#4A4A4A]">{formatNumber(v.impressions)}</td>
                                                <td className="text-right py-2 text-[#F5F5F5] font-bold">{v.ctr.toFixed(2)}%</td>
                                                <td className="text-right py-2 text-[#F5F5F5]">{v.conversions}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {test.disclaimer && (
                            <p className="text-[9px] text-[#4A4A4A] uppercase italic leading-tight flex gap-2">
                                <span>{wrap(GLYPHS.INFO)}</span> {test.disclaimer}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsIntelligencePanelV2({ token, accountId, daily, campaigns }: Props) {
    const {
        intelligenceMetrics,
        isLoadingIntelligence,
        intelligenceError,
        fetchIntelligence,
    } = useAdsStore();

    useEffect(() => {
        if (token && accountId && !intelligenceMetrics) {
            fetchIntelligence(token, accountId);
        }
    }, [token, accountId, intelligenceMetrics, fetchIntelligence]);

    if (isLoadingIntelligence) {
        return (
            <div className="space-y-10">
                {/* Skeleton: header */}
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-3 w-48 rounded bg-white/8 animate-pulse" />
                    <div className="h-px flex-1 bg-white/5" />
                </div>
                {/* Skeleton: KPI strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 space-y-2 animate-pulse">
                            <div className="h-2 w-20 rounded bg-white/8" />
                            <div className="h-6 w-14 rounded bg-white/10" />
                            <div className="h-2 w-24 rounded bg-white/5" />
                        </div>
                    ))}
                </div>
                {/* Skeleton: chart placeholder */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-6 animate-pulse">
                    <div className="h-3 w-40 rounded bg-white/8 mb-6" />
                    <div className="h-[160px] rounded bg-white/[0.03]" />
                </div>
                {/* Skeleton: table rows */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-lg overflow-hidden animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
                            <div className="h-3 w-32 rounded bg-white/8" />
                            <div className="flex-1 h-2 rounded bg-white/5" />
                            <div className="h-3 w-16 rounded bg-white/8" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center">
                    <span className="font-mono text-[9px] text-[#3A3A3A] uppercase tracking-[0.4em] animate-pulse">
                        Calculando modelos estatísticos...
                    </span>
                </div>
            </div>
        );
    }

    if (intelligenceError) {
        return (
            <div className="bg-[#0A0A0A] border border-[#EF4444]/20 rounded-lg p-12 flex flex-col items-center justify-center gap-6 text-center font-mono">
                <span className="text-3xl text-[#EF4444] animate-bounce">{wrap(GLYPHS.ALERT)}</span>
                <div className="space-y-2">
                    <p className="text-[12px] font-bold text-[#EF4444] uppercase tracking-[0.3em]">Kernel_Execution_Failure</p>
                    <p className="text-[10px] text-[#4A4A4A] uppercase max-w-sm mx-auto">{intelligenceError}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { if (token && accountId) fetchIntelligence(token, accountId); }} className="h-9 px-6 uppercase tracking-widest text-[10px] border-white/10">
                    <span className="mr-2">{wrap(GLYPHS.RELOAD)}</span> REBOOT_SEQUENCE
                </Button>
            </div>
        );
    }

    if (!intelligenceMetrics) {
        return (
            <div className="py-20 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-6 text-center font-mono opacity-40">
                <span className="text-4xl text-[#4A4A4A]">{wrap(GLYPHS.BRAIN)}</span>
                <div className="space-y-2">
                    <p className="text-[11px] font-bold text-[#F5F5F5] uppercase tracking-widest">Intelligence_Offline</p>
                    <p className="text-[9px] text-[#4A4A4A] uppercase max-w-xs">Initialize handshake to activate deep analysis nodes.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchIntelligence(token!, accountId!)} className="uppercase tracking-widest text-[9px] border-white/10">
                    INITIALIZE_PROT_0x
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {daily && daily.length >= 4 && <AdsInsightsFeed daily={daily} />}
            {daily && daily.length >= 7 && <AdsAnomalyMultivariate daily={daily} />}
            {campaigns && campaigns.length >= 2 && <AdsAttributionSection campaigns={campaigns} />}
            {intelligenceMetrics.healthScore && <AccountHealthSection health={intelligenceMetrics.healthScore} />}
            {intelligenceMetrics.fatigueScores && <CreativeFatigueSection scores={intelligenceMetrics.fatigueScores} />}
            {intelligenceMetrics.saturationIndexes && <AudienceSaturationSection indexes={intelligenceMetrics.saturationIndexes} />}
            {intelligenceMetrics.benchmarkComparison && <BenchmarkSection benchmark={intelligenceMetrics.benchmarkComparison} />}
            <ABTestSection tests={intelligenceMetrics.abTests} />
            {campaigns && campaigns.length > 0 && <AdsVideoMetricsSection campaigns={campaigns} />}
            {campaigns && campaigns.length > 0 && <AdsQualityRankingsSection campaigns={campaigns} />}
            
            {/* Footer markers */}
            <div className="flex items-center justify-center gap-8 opacity-10 font-mono text-[8px] uppercase tracking-[0.6em] py-12">
                <span>INTEL_KERNEL_v2.5 // CORE_STABLE</span>
                <span>{wrap('◎')} ALL_SYSTEMS_OPERATIONAL</span>
            </div>
        </div>
    );
}
