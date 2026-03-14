'use client';

import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics, MetaPostMetrics } from '@/types/analytics';
import {
    linearTrend,
    detectOutliers,
    bestTimeToPost,
    captionSegmentAnalysis,
    temporalPeriodComparison,
    hookQualityScore,
    postSentimentRanking,
    apifyEngagementScore,
    engagementScore,
    performanceBadge,
    hashtagEfficiency,
    postingConsistencyIndex,
    descriptiveStats,
} from '@/lib/utils/statistics';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { PostTooltip, PostMiniCard, PostImage } from './post-detail-card';
import { cn } from '@/design-system/utils/cn';

export interface ApifyStatsPanelProps {
    posts: InstagramPostMetrics[];
    /** Quando true, esconde os KPI cards (já exibidos pelo MetaKpiCards) e mostra apenas os painéis analíticos */
    isMeta?: boolean;
}

// Minimal animations — stagger disabled to avoid CPU spike on profile switch
const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
};

const item = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15 } },
};

function formatNumber(n: number): string {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(n);
}

function SimpleSparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const chartData = data.map((value, i) => ({ i, value }));
    return (
        <div className="mt-2 h-6 w-full opacity-30 group-hover:opacity-70 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <Area type="monotone" dataKey="value" stroke={color} fill="none" strokeWidth={2} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function TrendBadge({ direction, label }: { direction: 'rising' | 'falling' | 'stable'; label?: string }) {
    const glyph = direction === 'rising' ? '↗' : direction === 'falling' ? '↘' : '-';
    const color = direction === 'rising' ? '#10B981' : direction === 'falling' ? '#EF4444' : '#8A8A8A';
    const text = label ?? (direction === 'rising' ? 'Crescendo' : direction === 'falling' ? 'Caindo' : 'Estável');
    return (
        <div className="flex items-center gap-1">
            <span className="font-mono text-[10px]" style={{ color }}>{glyph}</span>
            <span className="text-[9px] font-mono" style={{ color }}>{text}</span>
        </div>
    );
}

export const ApifyStatsPanel = memo(function ApifyStatsPanel({ posts, isMeta = false }: ApifyStatsPanelProps) {
    const stats = useMemo(() => {
        if (posts.length === 0) return null;

        const sorted = [...posts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Helper: engagement completo (com saves/shares quando Meta disponível)
        const postEng = (p: InstagramPostMetrics): number => {
            const base = p.likesCount + p.commentsCount;
            if (!isMeta) return base;
            const mp = p as any;
            return base + (mp.saved ?? 0) + (mp.shares ?? 0);
        };

        // Helper: reach do post (só Meta)
        const postReach = (p: InstagramPostMetrics): number => isMeta ? ((p as any).reach ?? 0) : 0;

        // Basic aggregations
        const totalLikes = sorted.reduce((s, p) => s + p.likesCount, 0);
        const totalComments = sorted.reduce((s, p) => s + p.commentsCount, 0);
        const reels = sorted.filter(p => p.type === 'Video');
        const totalViews = reels.reduce((s, p) => s + (p.videoViewCount ?? 0), 0);

        const likesHistory = sorted.map(p => p.likesCount);
        const commentsHistory = sorted.map(p => p.commentsCount);
        const engHistory = sorted.map(p => postEng(p));

        // Content mix winner
        const images = sorted.filter(p => p.type === 'Image');
        const videos = sorted.filter(p => p.type === 'Video');
        const carousels = sorted.filter(p => p.type === 'Sidecar');

        const avgEngImage = images.length > 0 ? images.reduce((s, p) => s + postEng(p), 0) / images.length : 0;
        const avgEngVideo = videos.length > 0 ? videos.reduce((s, p) => s + postEng(p), 0) / videos.length : 0;
        const avgEngCarousel = carousels.length > 0 ? carousels.reduce((s, p) => s + postEng(p), 0) / carousels.length : 0;

        const typeWinner = [
            { type: 'Imagem', avg: avgEngImage, count: images.length },
            { type: 'Vídeo', avg: avgEngVideo, count: videos.length },
            { type: 'Carrossel', avg: avgEngCarousel, count: carousels.length },
        ].filter(t => t.count > 0).sort((a, b) => b.avg - a.avg)[0] ?? null;

        // Posting consistency
        const consistency = postingConsistencyIndex(sorted);

        // Outliers / viral coefficient — usa engagement completo
        const engValues = sorted.map(p => postEng(p));
        const outlierResult = detectOutliers(engValues);
        const viralPosts = outlierResult.outliers.filter(o => o.type === 'high');
        const avgNormal = engValues.length > 0
            ? engValues.filter((_, i) => !viralPosts.some(v => v.index === i)).reduce((a, b) => a + b, 0) / Math.max(1, engValues.length - viralPosts.length)
            : 0;
        const avgViral = viralPosts.length > 0 ? viralPosts.reduce((a, b) => a + b.value, 0) / viralPosts.length : 0;

        // Meta-exclusive: Viral Spread Rate (shares/reach) — mede difusão real
        let viralSpreadRate: number | null = null;
        if (isMeta) {
            const totalShares = sorted.reduce((s, p) => s + ((p as any).shares ?? 0), 0);
            const totalReach = sorted.reduce((s, p) => s + postReach(p), 0);
            viralSpreadRate = totalReach > 0 ? (totalShares / totalReach) * 100 : 0;
        }

        // Best day — usa engagement completo
        const bestDay = bestTimeToPost(sorted.map(p => ({
            date: p.timestamp,
            engagement: postEng(p),
        })));

        // Period comparison — usa engagement completo
        const temporalComp = temporalPeriodComparison(
            sorted.map(p => ({ timestamp: p.timestamp, engagement: postEng(p) }))
        );

        // Caption segment analysis — usa engagement completo
        const captionSegments = captionSegmentAnalysis(
            sorted.map(p => ({ caption: p.caption ?? '', engagement: postEng(p) }))
        );

        // Hook quality — usa engagement completo
        const hookQuality = hookQualityScore(
            sorted.map(p => ({ caption: p.caption ?? '', engagement: postEng(p) }))
        );

        // Hook post examples — best post for each hook type
        const hookPostExamples = new Map<string, InstagramPostMetrics>();
        const hookPostBestEng = new Map<string, number>();
        for (const p of sorted) {
            const hook = (p.caption ?? '').slice(0, 50).trim();
            let hookType: string;
            if (!hook) hookType = 'sem legenda';
            else if (/^[A-Z\s]{5,}/.test(hook)) hookType = 'CAPS (urgência)';
            else if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(hook)) hookType = 'emoji lead';
            else if (/\?/.test(hook)) hookType = 'pergunta';
            else if (/^[\d]|^\d/.test(hook)) hookType = 'número/lista';
            else if (/!/.test(hook)) hookType = 'exclamação';
            else hookType = 'narrativo';
            const eng = postEng(p);
            if (eng > (hookPostBestEng.get(hookType) ?? 0)) {
                hookPostBestEng.set(hookType, eng);
                hookPostExamples.set(hookType, p);
            }
        }

        // Sentiment ranking per post
        const sentimentRank = postSentimentRanking(sorted);

        // Per-post scores — usa score completo com saves/shares quando Meta
        const allScores = isMeta
            ? sorted.map(p => engagementScore({ likes: p.likesCount, comments: p.commentsCount, views: p.videoViewCount ?? 0, saves: (p as any).saved ?? 0, shares: (p as any).shares ?? 0 }))
            : sorted.map(p => apifyEngagementScore({ likes: p.likesCount, comments: p.commentsCount, views: p.videoViewCount ?? 0 }));
        const scoredPosts = sorted.map((p, i) => ({
            post: p,
            score: allScores[i],
            badge: performanceBadge(allScores[i], allScores),
        })).sort((a, b) => b.score - a.score);

        // Hashtag efficiency — usa engagement completo
        // Quando Meta, recalcula com reach para medir amplificação real
        const hashtagEff = hashtagEfficiency(sorted);
        let hashtagReachEff: { hashtag: string; avgReach: number; count: number }[] | null = null;
        if (isMeta) {
            const hashtagReachMap = new Map<string, { totalReach: number; count: number }>();
            for (const p of sorted) {
                const reach = postReach(p);
                for (const tag of p.hashtags ?? []) {
                    const t = tag.toLowerCase().replace('#', '');
                    if (!t) continue;
                    const existing = hashtagReachMap.get(t) ?? { totalReach: 0, count: 0 };
                    existing.totalReach += reach;
                    existing.count++;
                    hashtagReachMap.set(t, existing);
                }
            }
            hashtagReachEff = Array.from(hashtagReachMap.entries())
                .filter(([, v]) => v.count >= 2)
                .map(([hashtag, v]) => ({ hashtag, avgReach: Math.round(v.totalReach / v.count), count: v.count }))
                .sort((a, b) => b.avgReach - a.avgReach);
        }

        // Engagement stats
        const engStats = descriptiveStats(engValues);

        return {
            totalPosts: sorted.length,
            totalLikes,
            totalComments,
            totalViews,
            reelsCount: reels.length,
            likesHistory,
            commentsHistory,
            engHistory,
            typeWinner,
            consistency,
            viralPosts,
            avgNormal: Math.round(avgNormal),
            avgViral: Math.round(avgViral),
            viralMultiplier: avgNormal > 0 ? Math.round((avgViral / avgNormal) * 10) / 10 : 0,
            viralPostData: viralPosts.slice(0, 3).map(v => sorted[v.index]).filter(Boolean),
            viralByType: (() => {
                const viralTypes = new Map<string, number>();
                for (const v of viralPosts) {
                    const post = sorted[v.index];
                    if (post) {
                        const t = post.type || 'Unknown';
                        viralTypes.set(t, (viralTypes.get(t) ?? 0) + 1);
                    }
                }
                return Array.from(viralTypes.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
            })(),
            viralThreshold: Math.round(engStats.q3 + engStats.iqr * 1.5),
            bestDay,
            temporalComp,
            captionSegments,
            hookQuality,
            hookPostExamples,
            sentimentRank,
            scoredPosts,
            hashtagEff,
            hashtagReachEff,
            viralSpreadRate,
            engStats,
            avgEngPerPost: sorted.length > 0 ? Math.round(engValues.reduce((a, b) => a + b, 0) / sorted.length) : 0,
        };
    }, [posts, isMeta]);

    if (!stats) {
        return (
            <div className="p-8 text-center text-[#8A8A8A]">
                Sem dados para análise.
            </div>
        );
    }

    // ─── KPI Cards ───
    const kpiCards = [
        { label: 'Total Posts', value: formatNumber(stats.totalPosts), glyph: '⊞', color: '#8A8A8A' },
        { label: 'Total Likes', value: formatNumber(stats.totalLikes), glyph: '▲', color: '#A3E635', spark: stats.likesHistory, trend: linearTrend(stats.likesHistory) },
        { label: 'Total Comentários', value: formatNumber(stats.totalComments), glyph: '◐', color: '#D4D4D4', spark: stats.commentsHistory, trend: linearTrend(stats.commentsHistory) },
        { label: 'Views (Reels)', value: stats.reelsCount > 0 ? formatNumber(stats.totalViews) : 'Sem Reels', glyph: '◎', color: '#A3E635' },
        { label: 'Eng. Médio/Post', value: formatNumber(stats.avgEngPerPost), glyph: '↗', color: '#10B981', spark: stats.engHistory, trend: linearTrend(stats.engHistory) },
        { label: 'Consistência', value: `${stats.consistency.score}/100`, glyph: '◷', color: stats.consistency.score >= 45 ? '#10B981' : '#F59E0B', sub: `${stats.consistency.classification} (${stats.consistency.postsPerWeek} posts/sem)` },
        ...(stats.typeWinner ? [{
            label: 'Melhor Tipo', value: stats.typeWinner.type, glyph: '◎', color: '#A3E635',
            sub: `${formatNumber(Math.round(stats.typeWinner.avg))} eng. médio (${stats.typeWinner.count} posts)`,
        }] : []),
    ];

    const BADGE_LABELS: Record<string, string> = {
        exceptional: 'Excepcional',
        above_average: 'Acima da Média',
        average: 'Na Média',
        below_average: 'Abaixo da Média',
        underperforming: 'Fraco',
    };

    const SIG_LABELS: Record<string, string> = {
        significant: 'Significativo',
        marginal: 'Marginal',
        negligible: 'Negligível',
    };

    const SIG_COLORS: Record<string, string> = {
        significant: '#10B981',
        marginal: '#F59E0B',
        negligible: '#4A4A4A',
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* ─── Section A: KPI Cards (esconde quando isMeta pois MetaKpiCards já exibe) ─── */}
            {!isMeta && (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 relative z-40">
                    {kpiCards.map((card) => (
                        <motion.div key={card.label} variants={item} className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 v2-glass v2-glass-hover">
                            <div className="v2-grain pointer-events-none absolute inset-0 z-[1]" />
                            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none" style={{ background: card.color }} />
                            <div className="relative z-[2]">
                                <div className="flex items-center justify-between">
                                    <span className="v2-label">{card.label}</span>
                                    <span className="font-mono text-[10px]" style={{ color: card.color }}>{card.glyph}</span>
                                </div>
                                <p className="mt-2 text-2xl font-mono v2-number font-bold tracking-tight" style={{ color: '#F5F5F5' }}>{card.value}</p>
                                {'sub' in card && card.sub && <p className="mt-0.5 text-[10px] leading-tight" style={{ color: '#8A8A8A' }}>{card.sub}</p>}
                                {'trend' in card && card.trend && <div className="mt-1"><TrendBadge direction={card.trend.direction} /></div>}
                                {'spark' in card && card.spark && <SimpleSparkline data={(card.spark as number[]).slice(-10)} color={card.color} />}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ─── Section B: Statistical Insights (2x2 grid) ─── */}
            <div className="grid gap-4 sm:grid-cols-2 relative z-30">
                {/* B1: Coeficiente Viral (Blueprint Redesign) */}
                <motion.div 
                    variants={item} 
                    className="group relative overflow-hidden rounded-lg border bg-[#0A0A0A] font-mono p-0 transition-all duration-300"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                    {/* Blueprint Grid Background */}
                    <div 
                        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                        style={{ 
                            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                            backgroundSize: '24px 24px'
                        }} 
                    />

                    {/* Header HUD */}
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] relative z-10">
                        <div className="flex items-center gap-2">
                            <span className="text-[#FBBF24] text-[10px]">⚡</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F5F5]">Coeficiente_Viral</span>
                            {stats.viralPosts.length > 0 && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-widest ml-2" style={{
                                    background: (stats.viralPosts.length / stats.totalPosts) >= 0.15 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                                    color: (stats.viralPosts.length / stats.totalPosts) >= 0.15 ? '#FBBF24' : '#8A8A8A',
                                }}>
                                    {(stats.viralPosts.length / stats.totalPosts) >= 0.15 ? 'HIGH_CALIBER' : 'BUFFER_STATE'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 grayscale opacity-30 group-hover:opacity-100 transition-opacity">
                            <span className="w-1 h-1 bg-[#A3E635] rounded-full" />
                            <span className="text-[8px] text-[#4A4A4A]">NODE_V25_ACTIVE</span>
                        </div>
                    </div>

                    <div className="p-6 relative z-10 space-y-5">
                        {stats.viralPosts.length > 0 ? (
                            <>
                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[#FBBF24] tracking-tighter">
                                            {stats.viralPosts.length.toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A8A8A]">Posts_Detected</span>
                                    </div>
                                    <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">
                                        Diffusion_Rate: {Math.round((stats.viralPosts.length / stats.totalPosts) * 100)}% of total volume
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                    <div className="space-y-1">
                                        <span className="text-[8px] uppercase tracking-[0.3em] text-[#4A4A4A]">Viral_Multiplier</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold text-[#FBBF24]">{stats.viralMultiplier}x</span>
                                            <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#FBBF24]" 
                                                    style={{ width: `${Math.min(100, (stats.viralMultiplier / 10) * 100)}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] uppercase tracking-[0.3em] text-[#4A4A4A]">Energy_Threshold</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold text-[#F5F5F5]">{formatNumber(stats.viralThreshold)}</span>
                                            <span className="text-[8px] text-[#4A4A4A]">ENG</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-[9px] uppercase tracking-widest">
                                        <span className="text-[#4A4A4A]">Dominant_Format:</span>
                                        <span className="text-[#F5F5F5]">
                                            {stats.viralByType[0].type === 'Video' ? 'REEL' : stats.viralByType[0].type === 'Sidecar' ? 'CAROUSEL' : 'IMAGE'}
                                        </span>
                                    </div>
                                    {stats.viralSpreadRate != null && (
                                        <div className="flex justify-between text-[9px] uppercase tracking-widest">
                                            <span className="text-[#4A4A4A]">Spread_Efficiency:</span>
                                            <span className="text-[#FBBF24]">{stats.viralSpreadRate.toFixed(2)}%</span>
                                        </div>
                                    )}
                                </div>

                                {stats.viralPostData.length > 0 && (
                                    <div className="pt-4 space-y-2 border-t border-white/5">
                                        <span className="text-[8px] uppercase tracking-[0.4em] text-[#4A4A4A] mb-2 block">High_Performing_Nodes:</span>
                                        {stats.viralPostData.map((vp, i) => (
                                            <PostMiniCard key={vp.id} post={vp} rank={i + 1} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-10 text-center space-y-2 opacity-50">
                                <span className="text-[10px] uppercase tracking-[0.5em] text-[#4A4A4A]">INSUFFICIENT_DATA_FOR_CALIBRATION</span>
                                <p className="text-[8px] uppercase tracking-widest text-[#3A3A3A]">Minimum 04 posts required for viral detection</p>
                            </div>
                        )}
                    </div>

                    {/* Footer HUD */}
                    <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[7px] text-[#3A3A3A] tracking-[0.4em] uppercase">
                        <span>Calibration_Stable</span>
                        <span>0x_VIR_NODE_ALPHA</span>
                    </div>
                </motion.div>

                {/* B2: Melhor Dia para Postar */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass border border-white/[0.08] bg-[#0A0A0A]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="font-mono text-xs text-[#A3E635]">◷</span>
                        <span className="v2-label text-sm font-semibold">Melhor Dia para Postar</span>
                    </div>
                    {stats.bestDay.dayBreakdown.length > 0 ? (() => {
                        const breakdown = stats.bestDay.dayBreakdown;
                        const avgGeral = breakdown.reduce((acc, curr) => acc + curr.avgEngagement, 0) / breakdown.length;
                        const deltaPercent = Math.round(((stats.bestDay.bestDayAvg - avgGeral) / avgGeral) * 100);
                        const ranking = [...breakdown].sort((a, b) => b.avgEngagement - a.avgEngagement);
                        
                        return (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-mono font-bold text-[#A3E635] leading-none">
                                            {stats.bestDay.bestDay}
                                        </span>
                                        <span className="text-[10px] font-mono text-[#8A8A8A] mt-1">
                                            {formatNumber(Math.round(stats.bestDay.bestDayAvg))} ENG. MÉDIO
                                        </span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-[#A3E635]/10 border border-[#A3E635]/20">
                                        <span className="text-[10px] font-mono font-bold text-[#A3E635]">
                                            +{deltaPercent}% VS MÉDIA
                                        </span>
                                    </div>
                                </div>

                                <div className="h-36 mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={breakdown} barSize={20}>
                                            <XAxis 
                                                dataKey="day" 
                                                tick={{ fontSize: 9, fill: '#4A4A4A', fontFamily: 'var(--font-mono)' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tickFormatter={(v: string) => v.slice(0, 3).toUpperCase()} 
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ 
                                                    background: '#141414', 
                                                    border: '1px solid rgba(255,255,255,0.08)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '11px',
                                                    fontFamily: 'var(--font-mono)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                                }}
                                                itemStyle={{ color: '#F5F5F5', padding: 0 }}
                                                labelStyle={{ color: '#8A8A8A', marginBottom: '4px', fontWeight: 'bold' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                formatter={(value) => [formatNumber(Math.round(Number(value))), 'ENG. MÉDIO']}
                                            />
                                            <Bar dataKey="avgEngagement" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                                                {breakdown.map((entry, index) => (
                                                    <Cell 
                                                        key={index} 
                                                        fill={entry.day === stats.bestDay.bestDay ? '#A3E635' : 'rgba(255,255,255,0.08)'} 
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                                    <p className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-[0.1em] flex items-center gap-2">
                                        <span className="text-[#A3E635]">◆</span> Poste às {stats.bestDay.bestDay} para maximizar engajamento
                                    </p>
                                    
                                    <div className="flex gap-4">
                                        {ranking[1] && (
                                            <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#D4D4D4]">
                                                <span className="text-[#A3E635]/60">2º ▸</span> {ranking[1].day.toUpperCase()}
                                            </div>
                                        )}
                                        {ranking[2] && (
                                            <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#D4D4D4]">
                                                <span className="text-[#A3E635]/60">3º ▸</span> {ranking[2].day.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <p className="text-sm" style={{ color: '#8A8A8A' }}>Sem dados temporais suficientes.</p>
                    )}
                </motion.div>

                {/* B3: Evolução Temporal (Blueprint Redesign) */}
                <motion.div 
                    variants={item} 
                    className="group relative overflow-hidden rounded-lg border bg-[#0A0A0A] font-mono p-0 transition-all duration-300"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                    {/* Blueprint Grid Background */}
                    <div 
                        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                        style={{ 
                            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                            backgroundSize: '24px 24px'
                        }} 
                    />

                    {/* Header HUD */}
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] relative z-10">
                        <div className="flex items-center gap-2">
                            <span className="text-[#10B981] text-[10px]">◎</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F5F5]">Evolução_Engajamento</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-widest ml-2" style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: '#10B981',
                            }}>
                                {stats.temporalComp.method === '30d' ? 'WINDOW_30D' : stats.temporalComp.method === '14d' ? 'WINDOW_14D' : 'DYNAMIC_50/50'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 grayscale opacity-30 group-hover:opacity-100 transition-opacity">
                            <span className="w-1 h-1 bg-[#10B981] rounded-full" />
                            <span className="text-[8px] text-[#4A4A4A]">TEMPORAL_NODE_V25</span>
                        </div>
                    </div>

                    <div className="p-6 relative z-10 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[8px] uppercase tracking-[0.3em] text-[#4A4A4A]">Variance_Coefficient</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-4xl font-black tracking-tighter",
                                            stats.temporalComp.direction === 'up' ? 'text-[#10B981]' : stats.temporalComp.direction === 'down' ? 'text-[#EF4444]' : 'text-[#F5F5F5]'
                                        )}>
                                            {stats.temporalComp.direction === 'up' ? '+' : ''}{stats.temporalComp.changePercent}%
                                        </span>
                                        <span className="text-[8px] px-2 py-0.5 rounded-[2px] font-bold uppercase tracking-widest" style={{ 
                                            background: SIG_COLORS[stats.temporalComp.significance] + '15', 
                                            color: SIG_COLORS[stats.temporalComp.significance] 
                                        }}>
                                            {SIG_LABELS[stats.temporalComp.significance]}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="text-[8px] uppercase tracking-[0.3em] text-[#4A4A4A]">Cohen_Effect_Size</span>
                                    <p className="text-xl font-bold text-[#F5F5F5]">d={(stats.temporalComp.cohensD ?? 0).toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Comparison Visualization */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#4A4A4A]">
                                        <span>Current_Period_Avg</span>
                                        <span className="text-[#F5F5F5] font-bold">{formatNumber(stats.temporalComp.recentAvg)}/POST</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#10B981]" 
                                            style={{ width: `${Math.min(100, (stats.temporalComp.recentAvg / Math.max(stats.temporalComp.recentAvg, stats.temporalComp.previousAvg)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#4A4A4A]">
                                        <span>Baseline_Period_Avg</span>
                                        <span className="text-[#8A8A8A]">{formatNumber(stats.temporalComp.previousAvg)}/POST</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#4A4A4A]/50" 
                                            style={{ width: `${Math.min(100, (stats.temporalComp.previousAvg / Math.max(stats.temporalComp.recentAvg, stats.temporalComp.previousAvg)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 text-[9px] leading-relaxed text-[#4A4A4A] uppercase tracking-widest">
                            <p>Statistical comparison executed via <span className="text-[#10B981]">Smart_Bilateral_windowing</span></p>
                        </div>
                    </div>

                    {/* Footer HUD */}
                    <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[7px] text-[#3A3A3A] tracking-[0.4em] uppercase">
                        <span>Analysis_Node_Calibrated</span>
                        <span>0x_TEMP_NOD_V2.1</span>
                    </div>
                </motion.div>

                {/* B4: Sentimento por Post */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-xs text-[#A3E635]">▲</span>
                        <span className="v2-label text-sm font-semibold">Sentimento por Post</span>
                    </div>
                    {(() => {
                        const hasSentiment = stats.sentimentRank.mostEmotional.some(p => p.score > 0);
                        const hasActiveInterest = stats.sentimentRank.mostActiveInterest.some(p => p.longCommentRatio > 0);

                        if (!hasSentiment && !hasActiveInterest) {
                            return (
                                <div className="space-y-1">
                                    <p className="text-sm" style={{ color: '#8A8A8A' }}>Comentários não carregados.</p>
                                    <p className="text-[10px]" style={{ color: '#8A8A8A' }}>
                                        Use <span className="font-mono text-[#A3E635]/70">ENRIQUECER_DATA</span> (Meta API) para ativar esta análise.
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {hasSentiment && (
                                    <div>
                                        <p className="text-[10px] mb-1" style={{ color: '#8A8A8A' }}>Mais emocional (pos+neg words)</p>
                                        {stats.sentimentRank.mostEmotional.filter(p => p.score > 0).slice(0, 3).map((p) => {
                                            const post = posts.find(pp => pp.id === p.id);
                                            if (!post) return null;
                                            return (
                                                <PostTooltip key={p.id} post={post}>
                                                    <div className="flex items-center gap-2 text-xs py-1 px-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer w-full">
                                                        <PostImage src={post.displayUrl} className="h-7 w-7 rounded shrink-0 border border-white/[0.08]" post={post} />
                                                        <span className="truncate flex-1" style={{ color: '#8A8A8A' }}>{post.caption?.slice(0, 35) || post.shortCode}</span>
                                                        <span className="font-mono text-[10px] shrink-0" style={{ color: '#10B981' }}>+{p.positiveWords}</span>
                                                        <span className="font-mono text-[10px] shrink-0" style={{ color: '#EF4444' }}>-{p.negativeWords}</span>
                                                    </div>
                                                </PostTooltip>
                                            );
                                        })}
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] mb-1" style={{ color: '#8A8A8A' }}>Maior interesse ativo (comentários longos)</p>
                                    {hasActiveInterest ? (
                                        stats.sentimentRank.mostActiveInterest.filter(p => p.longCommentRatio > 0).slice(0, 3).map((p) => {
                                            const post = posts.find(pp => pp.id === p.id);
                                            if (!post) return null;
                                            return (
                                                <PostTooltip key={p.id} post={post}>
                                                    <div className="flex items-center gap-2 text-xs py-1 px-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer w-full">
                                                        <PostImage src={post.displayUrl} className="h-7 w-7 rounded shrink-0 border border-white/[0.08]" post={post} />
                                                        <span className="truncate flex-1" style={{ color: '#8A8A8A' }}>{post.caption?.slice(0, 35) || post.shortCode}</span>
                                                        <span className="font-mono text-[10px] shrink-0" style={{ color: '#A3E635' }}>{p.longCommentRatio}%</span>
                                                        <span className="text-[10px] shrink-0" style={{ color: '#8A8A8A' }}>{p.avgWordsPerComment}w/c</span>
                                                    </div>
                                                </PostTooltip>
                                            );
                                        })
                                    ) : (
                                        <p className="text-[10px]" style={{ color: '#8A8A8A' }}>
                                            Nenhum comentário longo detectado — use Meta API para enriquecer.
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </motion.div>
                {/* B5: Hook Quality (Schwartz) */}
                {stats.hookQuality.hookTypes.length > 0 && (
                    <motion.div variants={item} className="rounded-xl p-5 v2-glass sm:col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-mono text-xs text-[#A3E635]">◎</span>
                            <span className="v2-label text-sm font-semibold">Qualidade do Hook</span>
                            <span className="text-[10px] ml-auto" style={{ color: '#8A8A8A' }}>Primeiros 50 chars da legenda</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {stats.hookQuality.hookTypes.map(h => {
                                const examplePost = stats.hookPostExamples.get(h.type);
                                const isBest = h.type === stats.hookQuality.bestHookType;
                                return (
                                    <div key={h.type} className="p-2 rounded-lg" style={{ background: isBest ? 'rgba(139,92,246,0.1)' : 'transparent' }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs" style={{ color: isBest ? '#A3E635' : '#8A8A8A' }}>{h.type}</span>
                                                <span className="text-[10px]" style={{ color: '#8A8A8A' }}>({h.count})</span>
                                            </div>
                                            <span className="font-mono text-xs font-bold" style={{ color: '#F5F5F5' }}>{formatNumber(h.avgEngagement)}</span>
                                        </div>
                                        {examplePost && (
                                            <PostTooltip post={examplePost}>
                                                <div className="flex items-center gap-1.5 mt-1 cursor-pointer group/hook">
                                                    <PostImage src={examplePost.displayUrl} className="h-5 w-5 rounded shrink-0 border border-white/[0.08]" post={examplePost} />
                                                    <span className="text-[9px] truncate group-hover/hook:text-blue-400 transition-colors" style={{ color: '#8A8A8A' }}>
                                                        {examplePost.caption?.slice(0, 30) || examplePost.shortCode}
                                                    </span>
                                                </div>
                                            </PostTooltip>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: '#8A8A8A' }}>{stats.hookQuality.insight}</p>
                    </motion.div>
                )}
            </div>

            {/* ─── Section C: Post Score Table ─── */}
            <motion.div variants={item} className="rounded-xl p-5 v2-glass relative z-20">
                <div className="flex items-center gap-2 mb-4">
                    <span className="font-mono text-xs text-[#A3E635]">◎</span>
                    <span className="v2-label text-sm font-semibold">Score de Engajamento por Post</span>
                    {isMeta && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(163,230,53,0.15)', color: '#A3E635' }}>Meta Enhanced</span>}
                    <span className="text-[10px] ml-auto" style={{ color: '#8A8A8A' }}>
                        Média: {stats.engStats.mean.toFixed(0)} | Mediana: {stats.engStats.median.toFixed(0)} | σ: {stats.engStats.stdDev.toFixed(0)}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr style={{ color: '#8A8A8A' }}>
                                <th className="text-left py-1 pr-2">#</th>
                                <th className="text-left py-1 pr-2">Post</th>
                                <th className="text-left py-1 pr-2">Tipo</th>
                                <th className="text-right py-1 pr-2">Score</th>
                                <th className="text-left py-1 pr-2">Badge</th>
                                <th className="text-right py-1 pr-2">Likes</th>
                                <th className="text-right py-1 pr-2">Comments</th>
                                {isMeta && <th className="text-right py-1 pr-2">Saves</th>}
                                {isMeta && <th className="text-right py-1 pr-2">Shares</th>}
                                <th className="text-right py-1">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.scoredPosts.slice(0, 15).map((sp, i) => (
                                <tr key={sp.post.shortCode} className="border-t border-white/[0.08] hover:bg-white/[0.04] transition-colors">
                                    <td className="py-1.5 pr-2 font-mono" style={{ color: '#8A8A8A' }}>{i + 1}</td>
                                    <td className="py-1.5 pr-2 max-w-[250px]">
                                        <PostTooltip post={sp.post}>
                                            <span className="flex items-center gap-2 cursor-pointer">
                                                <PostImage src={sp.post.displayUrl} className="h-6 w-6 rounded shrink-0 border border-white/[0.08]" post={sp.post} />
                                                <a href={sp.post.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: '#8A8A8A' }}>
                                                    {sp.post.caption?.slice(0, 45) || sp.post.shortCode}
                                                </a>
                                            </span>
                                        </PostTooltip>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                                            background: sp.post.type === 'Video' ? '#8b5cf620' : sp.post.type === 'Sidecar' ? '#3b82f620' : '#ec489920',
                                            color: sp.post.type === 'Video' ? '#8b5cf6' : sp.post.type === 'Sidecar' ? '#3b82f6' : '#ec4899',
                                        }}>
                                            {sp.post.type === 'Video' ? 'Reel' : sp.post.type === 'Sidecar' ? 'Carrossel' : 'Imagem'}
                                        </span>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right font-mono font-bold" style={{ color: '#F5F5F5' }}>{sp.score}</td>
                                    <td className="py-1.5 pr-2">
                                        <span className={`text-[10px] font-mono ${sp.badge.color}`}>
                                            {sp.badge.emoji} {BADGE_LABELS[sp.badge.badge]}
                                        </span>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right font-mono" style={{ color: '#8A8A8A' }}>{formatNumber(sp.post.likesCount)}</td>
                                    <td className="py-1.5 pr-2 text-right font-mono" style={{ color: '#8A8A8A' }}>{formatNumber(sp.post.commentsCount)}</td>
                                    {isMeta && <td className="py-1.5 pr-2 text-right font-mono" style={{ color: '#F59E0B' }}>{formatNumber((sp.post as any).saved ?? 0)}</td>}
                                    {isMeta && <td className="py-1.5 pr-2 text-right font-mono" style={{ color: '#10B981' }}>{formatNumber((sp.post as any).shares ?? 0)}</td>}
                                    <td className="py-1.5 text-right font-mono" style={{ color: '#8A8A8A' }}>
                                        {sp.post.timestamp ? new Date(sp.post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* ─── Section D: Hashtag Efficiency ─── */}
            {stats.hashtagEff.length > 0 && (
                <motion.div variants={item} className="rounded-xl p-5 v2-glass relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="font-mono text-xs text-[#10B981]">#</span>
                        <span className="v2-label text-sm font-semibold">Eficiência de Hashtags</span>
                        <span className="text-[10px] ml-auto" style={{ color: '#8A8A8A' }}>
                            {isMeta ? 'Engagement completo (likes+comments+saves+shares)' : 'Mínimo 2 posts por hashtag'}
                        </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {stats.hashtagEff.slice(0, 15).map((h, i) => {
                            const allAvgs = stats.hashtagEff.map(x => x.avgEngagement);
                            const badge = performanceBadge(h.avgEngagement, allAvgs);
                            // Buscar reach correspondente quando Meta
                            const reachData = stats.hashtagReachEff?.find(r => r.hashtag === h.hashtag);
                            return (
                                <div key={h.hashtag} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-mono w-4" style={{ color: '#8A8A8A' }}>{i + 1}</span>
                                        <span className="text-xs font-mono truncate" style={{ color: '#8A8A8A' }}>#{h.hashtag}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-mono font-bold" style={{ color: '#F5F5F5' }}>{formatNumber(h.avgEngagement)}</span>
                                        {reachData && (
                                            <span className="text-[9px] font-mono" style={{ color: '#3E63DD' }} title="Alcance médio por post com esta hashtag">
                                                {formatNumber(reachData.avgReach)}r
                                            </span>
                                        )}
                                        <span className={`text-[9px] ${badge.color}`}>{badge.emoji}</span>
                                        <span className="text-[10px]" style={{ color: '#8A8A8A' }}>({h.count})</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
});
