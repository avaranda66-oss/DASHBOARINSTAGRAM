'use client';

// =============================================================================
// ads-creative-performance.tsx — Creative Performance & Fatigue Ranking
//
// Story: US-43 — Creative Scorer → UI (aba CRIATIVOS)
// Usa: scorePerformance de creative-scorer.ts
// Dados: Ad[] com insights (CTR, saveRate, commentRate, ROAS) da Meta API
//
// Limitação conhecida: scoreVisual/scoreCopy requerem anotação offline (hasFace,
// textDensity etc.) não disponível via Graph API. Usando scorePerformance apenas.
// Fadiga estimada via proxy: CTR relativo ao benchmark + volume de impressões.
// =============================================================================

import { useMemo } from 'react';
import { scorePerformance } from '@/lib/utils/creative-scorer';
import type { CreativeStats, CreativeBenchmark } from '@/lib/utils/creative-scorer';
import type { Ad } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    ads: Ad[];
    currency?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAction(insights: NonNullable<Ad['insights']>, type: string): number {
    const a = insights.actions?.find(a => a.action_type === type);
    return a ? parseInt(a.value) || 0 : 0;
}

function buildStats(ad: Ad): CreativeStats | null {
    const i = ad.insights;
    if (!i) return null;

    const impressions = parseInt(i.impressions) || 0;
    if (impressions < 100) return null; // sem amostra suficiente

    const clicks = parseInt(i.clicks) || 0;
    const spend = parseFloat(i.spend) || 0;

    // CTR: preferir outbound CTR, fallback para CTR geral
    const ctrRaw = parseFloat(i.outbound_clicks_ctr?.[0]?.value || i.ctr || '0') || 0;
    const ctr = ctrRaw / 100; // Meta API retorna CTR como % (ex: 17.49 = 17.49%, 0.16 = 0.16%)

    const saves = getAction(i, 'post_save');
    const comments = getAction(i, 'post_comment');
    const videoViews = getAction(i, 'video_view'); // 3s views = proxy hook rate

    const saveRate = saves / impressions;
    const commentRate = comments / impressions;
    const hookRate = videoViews > 0 ? videoViews / impressions : undefined;

    const roasRaw = parseFloat(i.purchase_roas?.[0]?.value || '0') || 0;
    const roas = roasRaw > 0 ? roasRaw : undefined;

    const dateStart = new Date(i.date_start).getTime();
    const dateEnd = new Date(i.date_stop).getTime();

    return {
        impressions,
        clicks,
        ctr,
        hookRate,
        holdRate: undefined,
        saveRate: Math.max(saveRate, 0),
        commentRate: Math.max(commentRate, 0),
        roas,
        spend,
        period: { start: dateStart, end: dateEnd },
    };
}

function buildBenchmark(statsList: CreativeStats[]): CreativeBenchmark {
    if (statsList.length === 0) {
        return { avgCtr: 0.01, avgSaveRate: 0.001, avgCommentRate: 0.0005 };
    }

    const avgCtr = statsList.reduce((s, v) => s + v.ctr, 0) / statsList.length;
    const avgSaveRate = statsList.reduce((s, v) => s + v.saveRate, 0) / statsList.length;
    const avgCommentRate = statsList.reduce((s, v) => s + v.commentRate, 0) / statsList.length;

    const withRoas = statsList.filter(v => v.roas !== undefined);
    const avgRoas = withRoas.length > 0
        ? withRoas.reduce((s, v) => s + (v.roas ?? 0), 0) / withRoas.length
        : undefined;

    return {
        avgCtr: Math.max(avgCtr, 0.0001),
        avgSaveRate: Math.max(avgSaveRate, 0.00001),
        avgCommentRate: Math.max(avgCommentRate, 0.00001),
        avgRoas,
    };
}

// Fadiga estimada: proxy via CTR relativo + alto volume de impressões
function estimateFatigue(stats: CreativeStats, bench: CreativeBenchmark): {
    level: 'healthy' | 'watch' | 'fatigued';
    reason: string;
} {
    const ctrRatio = bench.avgCtr > 0 ? stats.ctr / bench.avgCtr : 1;

    // Alto volume + CTR bem abaixo da média → sinal forte de fadiga
    if (stats.impressions > 50_000 && ctrRatio < 0.5) {
        return { level: 'fatigued', reason: `CTR ${(ctrRatio * 100).toFixed(0)}% da média — alto volume, alta fadiga` };
    }
    if (stats.impressions > 20_000 && ctrRatio < 0.6) {
        return { level: 'watch', reason: `CTR abaixo da média — monitorar tendência` };
    }
    if (ctrRatio < 0.7) {
        return { level: 'watch', reason: `CTR moderadamente abaixo da média` };
    }
    return { level: 'healthy', reason: `CTR saudável (${(ctrRatio * 100).toFixed(0)}% da média)` };
}

function fmtPct(v: number): string {
    return `${(v * 100).toFixed(2)}%`;
}

function fmtImpressions(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, label }: { value: number; label: string }) {
    const pct = Math.round(value * 100);
    const color = pct >= 65 ? '#A3E635' : pct >= 45 ? '#FBBF24' : '#EF4444';
    return (
        <div className="space-y-1">
            <div className="flex justify-between font-mono text-[8px]">
                <span className="text-[#4A4A4A] uppercase tracking-widest">{label}</span>
                <span className="font-black" style={{ color }}>{pct}</span>
            </div>
            <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

// ─── Creative Card ────────────────────────────────────────────────────────────

function CreativeCard({
    ad,
    stats,
    perfScore,
    fatigue,
    rank,
    bench,
}: {
    ad: Ad;
    stats: CreativeStats;
    perfScore: number;
    fatigue: ReturnType<typeof estimateFatigue>;
    rank: number;
    bench: CreativeBenchmark;
}) {
    const scoreColor = perfScore >= 0.65 ? '#A3E635' : perfScore >= 0.45 ? '#FBBF24' : '#EF4444';
    const fatigueColors = {
        healthy: { text: '#A3E635', bg: 'bg-[#A3E635]/10 border-[#A3E635]/20' },
        watch: { text: '#FBBF24', bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/20' },
        fatigued: { text: '#EF4444', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20' },
    };
    const fc = fatigueColors[fatigue.level];
    const thumbnail = ad.creative?.thumbnail_url || ad.creative?.image_url;
    const ctrRatio = bench.avgCtr > 0 ? stats.ctr / bench.avgCtr : 1;

    return (
        <div className="bg-[#0A0A0A] border border-white/8 rounded-lg hover:border-white/16 transition-all font-mono">
            <div className="p-5 space-y-4">
                {/* Header: rank + thumbnail + name */}
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/5">
                        <span className="text-[10px] font-black text-[#4A4A4A]">#{rank}</span>
                    </div>

                    {thumbnail ? (
                        <div className="w-14 h-14 rounded overflow-hidden border border-white/5 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                                src={`/api/image-proxy?url=${encodeURIComponent(thumbnail)}`}
                                alt={ad.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                            <span className="text-[#3A3A3A] text-[18px]">◈</span>
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-tight truncate" title={ad.name}>
                            {ad.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                            {/* Performance Score */}
                            <div
                                className="text-[9px] px-2 py-0.5 rounded border font-black uppercase tracking-widest"
                                style={{ color: scoreColor, borderColor: `${scoreColor}30`, backgroundColor: `${scoreColor}10` }}
                            >
                                PERF {Math.round(perfScore * 100)}
                            </div>
                            {/* Fatigue badge */}
                            <div className={`text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest ${fc.bg}`} style={{ color: fc.text }}>
                                {fatigue.level === 'healthy' ? '▲ SAUDÁVEL' : fatigue.level === 'watch' ? '◈ ATENÇÃO' : '▼ FATIGADO'}
                            </div>
                        </div>
                    </div>

                    {/* Big score */}
                    <div className="text-right flex-shrink-0">
                        <p className="text-[22px] font-black leading-none" style={{ color: scoreColor }}>
                            {Math.round(perfScore * 100)}
                        </p>
                        <p className="text-[7px] text-[#4A4A4A] uppercase tracking-[0.2em] mt-0.5">SCORE</p>
                    </div>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
                    {[
                        { label: 'CTR', value: fmtPct(stats.ctr), highlight: ctrRatio >= 1 },
                        { label: 'ROAS', value: stats.roas ? `${stats.roas.toFixed(1)}×` : '—', highlight: (stats.roas ?? 0) >= (bench.avgRoas ?? 0) },
                        { label: 'SAVES/IMP', value: fmtPct(stats.saveRate), highlight: stats.saveRate >= bench.avgSaveRate },
                        { label: 'IMPR', value: fmtImpressions(stats.impressions), highlight: false },
                    ].map(k => (
                        <div key={k.label} className="space-y-0.5">
                            <p className="text-[7px] text-[#4A4A4A] uppercase tracking-widest">{k.label}</p>
                            <p className={`text-[10px] font-black ${k.highlight ? 'text-[#F5F5F5]' : 'text-[#8A8A8A]'}`}>{k.value}</p>
                        </div>
                    ))}
                </div>

                {/* Performance score bar */}
                <ScoreBar value={perfScore} label="PERFORMANCE_SCORE" />

                {/* Fatigue reason */}
                <p className="text-[8px] text-[#4A4A4A] uppercase italic leading-tight">
                    ◎ {fatigue.reason}
                </p>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsCreativePerformance({ ads }: Props) {
    const data = useMemo(() => {
        if (ads.length === 0) return null;

        const statsList = ads
            .map(ad => ({ ad, stats: buildStats(ad) }))
            .filter((x): x is { ad: Ad; stats: CreativeStats } => x.stats !== null);

        if (statsList.length === 0) return null;

        const bench = buildBenchmark(statsList.map(x => x.stats));

        const scored = statsList
            .map(({ ad, stats }) => ({
                ad,
                stats,
                perfScore: scorePerformance(stats, bench),
                fatigue: estimateFatigue(stats, bench),
            }))
            .sort((a, b) => b.perfScore - a.perfScore);

        const avgScore = scored.reduce((s, x) => s + x.perfScore, 0) / scored.length;
        const fatigued = scored.filter(x => x.fatigue.level === 'fatigued').length;

        return { scored, bench, avgScore, fatigued, total: scored.length };
    }, [ads]);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!data) {
        return (
            <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-40">
                <span className="font-mono text-[#4A4A4A] text-[10px] uppercase tracking-[0.4em]">◈ CREATIVE_PERF_UNAVAILABLE</span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">Carregue criativos e insights para ativar o ranking</p>
            </div>
        );
    }

    const { scored, bench, avgScore, fatigued, total } = data;

    return (
        <section className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]">◎</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Creative_Performance_Ranking
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">
                        {total} CRIATIVOS ANALISADOS
                    </span>
                    {fatigued > 0 && (
                        <span className="font-mono text-[8px] px-2 py-0.5 rounded border bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444] uppercase tracking-widest">
                            {fatigued} FATIGADOS
                        </span>
                    )}
                </div>
            </div>

            {/* ── Summary strip ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'SCORE_MÉDIO',   value: Math.round(avgScore * 100).toString(), sub: 'performance média' },
                    { label: 'CTR_BENCH',     value: `${(bench.avgCtr * 100).toFixed(2)}%`, sub: 'média da conta' },
                    { label: 'SAVE_BENCH',    value: `${(bench.avgSaveRate * 1000).toFixed(2)}‰`, sub: 'saves / impressões' },
                    { label: 'ROAS_BENCH',    value: bench.avgRoas ? `${bench.avgRoas.toFixed(2)}×` : 'N/A', sub: 'ROAS médio' },
                ].map(item => (
                    <div key={item.label} className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                        <p className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">{item.label}</p>
                        <p className="text-[16px] font-black text-[#F5F5F5] tracking-tight leading-tight">{item.value}</p>
                        <p className="text-[8px] text-[#4A4A4A]">{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Disclaimer ──────────────────────────────────────────────── */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-white/[0.02] border border-white/5 font-mono text-[8px] text-[#4A4A4A] tracking-wide">
                <span className="text-[#FBBF24] mt-0.5 flex-shrink-0">◈</span>
                <span>
                    Score calculado com CTR, saveRate, commentRate e ROAS disponíveis via Meta API.
                    Dimensões visuais (face, cor, UGC) requerem anotação manual — não incluídas.
                    Use como ranking relativo, não como score absoluto.
                </span>
            </div>

            {/* ── Ranking grid ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {scored.map((item, idx) => (
                    <CreativeCard
                        key={item.ad.id}
                        ad={item.ad}
                        stats={item.stats}
                        perfScore={item.perfScore}
                        fatigue={item.fatigue}
                        rank={idx + 1}
                        bench={bench}
                    />
                ))}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-6 text-[8px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>ENGINE: scorePerformance (log2 saturation)</span>
                <span>BENCH: média da conta atual</span>
                <span>MIN_SAMPLE: 100 impressões</span>
            </div>
        </section>
    );
}
