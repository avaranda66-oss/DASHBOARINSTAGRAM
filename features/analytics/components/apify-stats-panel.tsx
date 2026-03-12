'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, MessageCircle, Eye, TrendingUp, BarChart2, Calendar,
    FileText, Hash, ArrowUpRight, ArrowDownRight, Minus, Zap,
    Activity, Target, Clock
} from 'lucide-react';
import type { InstagramPostMetrics } from '@/types/analytics';
import {
    linearTrend,
    detectOutliers,
    bestTimeToPost,
    captionSegmentAnalysis,
    temporalPeriodComparison,
    hookQualityScore,
    postSentimentRanking,
    apifyEngagementScore,
    performanceBadge,
    hashtagEfficiency,
    postingConsistencyIndex,
    descriptiveStats,
} from '@/lib/utils/statistics';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { PostTooltip, PostMiniCard, PostImage } from './post-detail-card';

export interface ApifyStatsPanelProps {
    posts: InstagramPostMetrics[];
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
    const Icon = direction === 'rising' ? ArrowUpRight : direction === 'falling' ? ArrowDownRight : Minus;
    const color = direction === 'rising' ? 'var(--v2-success)' : direction === 'falling' ? 'var(--v2-danger)' : 'var(--v2-text-tertiary)';
    const text = label ?? (direction === 'rising' ? 'Crescendo' : direction === 'falling' ? 'Caindo' : 'Estável');
    return (
        <div className="flex items-center gap-1">
            <Icon className="h-3 w-3" style={{ color }} />
            <span className="text-[9px] font-mono" style={{ color }}>{text}</span>
        </div>
    );
}

export function ApifyStatsPanel({ posts }: ApifyStatsPanelProps) {
    const stats = useMemo(() => {
        if (posts.length === 0) return null;

        const sorted = [...posts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Basic aggregations
        const totalLikes = sorted.reduce((s, p) => s + p.likesCount, 0);
        const totalComments = sorted.reduce((s, p) => s + p.commentsCount, 0);
        const reels = sorted.filter(p => p.type === 'Video');
        const totalViews = reels.reduce((s, p) => s + (p.videoViewCount ?? 0), 0);

        const likesHistory = sorted.map(p => p.likesCount);
        const commentsHistory = sorted.map(p => p.commentsCount);
        const engHistory = sorted.map(p => p.likesCount + p.commentsCount);

        // Content mix winner
        const images = sorted.filter(p => p.type === 'Image');
        const videos = sorted.filter(p => p.type === 'Video');
        const carousels = sorted.filter(p => p.type === 'Sidecar');

        const avgEngImage = images.length > 0 ? images.reduce((s, p) => s + p.likesCount + p.commentsCount, 0) / images.length : 0;
        const avgEngVideo = videos.length > 0 ? videos.reduce((s, p) => s + p.likesCount + p.commentsCount, 0) / videos.length : 0;
        const avgEngCarousel = carousels.length > 0 ? carousels.reduce((s, p) => s + p.likesCount + p.commentsCount, 0) / carousels.length : 0;

        const typeWinner = [
            { type: 'Imagem', avg: avgEngImage, count: images.length },
            { type: 'Vídeo', avg: avgEngVideo, count: videos.length },
            { type: 'Carrossel', avg: avgEngCarousel, count: carousels.length },
        ].filter(t => t.count > 0).sort((a, b) => b.avg - a.avg)[0] ?? null;

        // Posting consistency
        const consistency = postingConsistencyIndex(sorted);

        // Outliers / viral coefficient
        const engValues = sorted.map(p => p.likesCount + p.commentsCount);
        const outlierResult = detectOutliers(engValues);
        const viralPosts = outlierResult.outliers.filter(o => o.type === 'high');
        const avgNormal = engValues.length > 0
            ? engValues.filter((_, i) => !viralPosts.some(v => v.index === i)).reduce((a, b) => a + b, 0) / Math.max(1, engValues.length - viralPosts.length)
            : 0;
        const avgViral = viralPosts.length > 0 ? viralPosts.reduce((a, b) => a + b.value, 0) / viralPosts.length : 0;

        // Best day
        const bestDay = bestTimeToPost(sorted.map(p => ({
            date: p.timestamp,
            engagement: p.likesCount + p.commentsCount,
        })));

        // Period comparison (temporal inteligente: 30d vs 30d, fallback 14d, fallback split)
        const temporalComp = temporalPeriodComparison(
            sorted.map(p => ({ timestamp: p.timestamp, engagement: p.likesCount + p.commentsCount }))
        );

        // Caption segment analysis (substitui correlacao de Pearson)
        const captionSegments = captionSegmentAnalysis(
            sorted.map(p => ({ caption: p.caption ?? '', engagement: p.likesCount + p.commentsCount }))
        );

        // Hook quality
        const hookQuality = hookQualityScore(
            sorted.map(p => ({ caption: p.caption ?? '', engagement: p.likesCount + p.commentsCount }))
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
            const eng = p.likesCount + p.commentsCount;
            if (eng > (hookPostBestEng.get(hookType) ?? 0)) {
                hookPostBestEng.set(hookType, eng);
                hookPostExamples.set(hookType, p);
            }
        }

        // Sentiment ranking per post
        const sentimentRank = postSentimentRanking(sorted);

        // Per-post scores
        const allScores = sorted.map(p => apifyEngagementScore({ likes: p.likesCount, comments: p.commentsCount, views: p.videoViewCount ?? 0 }));
        const scoredPosts = sorted.map((p, i) => ({
            post: p,
            score: allScores[i],
            badge: performanceBadge(allScores[i], allScores),
        })).sort((a, b) => b.score - a.score);

        // Hashtag efficiency
        const hashtagEff = hashtagEfficiency(sorted);

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
            engStats,
            avgEngPerPost: sorted.length > 0 ? Math.round((totalLikes + totalComments) / sorted.length) : 0,
        };
    }, [posts]);

    if (!stats) {
        return (
            <div className="p-8 text-center" style={{ color: 'var(--v2-text-tertiary)' }}>
                Sem dados para análise.
            </div>
        );
    }

    // ─── KPI Cards ───
    const kpiCards = [
        { label: 'Total Posts', value: formatNumber(stats.totalPosts), icon: BarChart2, color: '#3b82f6' },
        { label: 'Total Likes', value: formatNumber(stats.totalLikes), icon: Heart, color: '#ec4899', spark: stats.likesHistory, trend: linearTrend(stats.likesHistory) },
        { label: 'Total Comentários', value: formatNumber(stats.totalComments), icon: MessageCircle, color: '#f97316', spark: stats.commentsHistory, trend: linearTrend(stats.commentsHistory) },
        { label: 'Views (Reels)', value: stats.reelsCount > 0 ? formatNumber(stats.totalViews) : 'Sem Reels', icon: Eye, color: '#8b5cf6' },
        { label: 'Eng. Médio/Post', value: formatNumber(stats.avgEngPerPost), icon: TrendingUp, color: '#10b981', spark: stats.engHistory, trend: linearTrend(stats.engHistory) },
        { label: 'Consistência', value: `${stats.consistency.score}/100`, icon: Calendar, color: stats.consistency.score >= 45 ? '#10b981' : '#f59e0b', sub: `${stats.consistency.classification} (${stats.consistency.postsPerWeek} posts/sem)` },
        ...(stats.typeWinner ? [{
            label: 'Melhor Tipo', value: stats.typeWinner.type, icon: Target, color: '#a855f7',
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
        significant: '#10b981',
        marginal: '#f59e0b',
        negligible: '#6b7280',
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* ─── Section A: KPI Cards ─── */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 relative z-40">
                {kpiCards.map((card) => (
                    <motion.div key={card.label} variants={item} className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 v2-glass v2-glass-hover">
                        <div className="v2-grain pointer-events-none absolute inset-0 z-[1]" />
                        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none" style={{ background: card.color }} />
                        <div className="relative z-[2]">
                            <div className="flex items-center justify-between">
                                <span className="v2-label">{card.label}</span>
                                <card.icon className="h-3.5 w-3.5" style={{ color: card.color, opacity: 0.8 }} />
                            </div>
                            <p className="mt-2 text-2xl font-mono v2-number font-bold tracking-tight" style={{ color: 'var(--v2-text-primary)' }}>{card.value}</p>
                            {'sub' in card && card.sub && <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--v2-text-tertiary)' }}>{card.sub}</p>}
                            {'trend' in card && card.trend && <div className="mt-1"><TrendBadge direction={card.trend.direction} /></div>}
                            {'spark' in card && card.spark && <SimpleSparkline data={(card.spark as number[]).slice(-10)} color={card.color} />}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ─── Section B: Statistical Insights (2x2 grid) ─── */}
            <div className="grid gap-4 sm:grid-cols-2 relative z-30">
                {/* B1: Coeficiente Viral (melhorado) */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4" style={{ color: '#f59e0b' }} />
                        <span className="v2-label text-sm font-semibold">Coeficiente Viral</span>
                        {stats.viralPosts.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{
                                background: (stats.viralPosts.length / stats.totalPosts) >= 0.15 ? 'rgba(245,158,11,0.2)' : (stats.viralPosts.length / stats.totalPosts) >= 0.08 ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)',
                                color: (stats.viralPosts.length / stats.totalPosts) >= 0.15 ? '#f59e0b' : (stats.viralPosts.length / stats.totalPosts) >= 0.08 ? '#d97706' : '#9ca3af',
                            }}>
                                {(stats.viralPosts.length / stats.totalPosts) >= 0.15 ? 'Alto' : (stats.viralPosts.length / stats.totalPosts) >= 0.08 ? 'Médio' : 'Baixo'}
                            </span>
                        )}
                    </div>
                    {stats.viralPosts.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-3xl font-mono font-bold" style={{ color: '#f59e0b' }}>
                                {stats.viralPosts.length} <span className="text-sm font-normal" style={{ color: 'var(--v2-text-secondary)' }}>posts virais ({Math.round((stats.viralPosts.length / stats.totalPosts) * 100)}%)</span>
                            </p>
                            <div className="flex gap-4 text-xs" style={{ color: 'var(--v2-text-tertiary)' }}>
                                <span>Multiplicador: <strong style={{ color: '#f59e0b' }}>{stats.viralMultiplier}x</strong></span>
                                <span>Threshold: <strong style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(stats.viralThreshold)}</strong> eng</span>
                            </div>
                            <div className="flex gap-4 text-xs" style={{ color: 'var(--v2-text-tertiary)' }}>
                                <span>Viral: <strong style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(stats.avgViral)}</strong> eng</span>
                                <span>Normal: <strong style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(stats.avgNormal)}</strong> eng</span>
                            </div>
                            {stats.viralByType.length > 0 && (
                                <p className="text-[10px]" style={{ color: 'var(--v2-text-tertiary)' }}>
                                    Tipo que mais viraliza: <strong style={{ color: 'var(--v2-text-primary)' }}>
                                        {stats.viralByType[0].type === 'Video' ? 'Reel' : stats.viralByType[0].type === 'Sidecar' ? 'Carrossel' : 'Imagem'}
                                    </strong> ({stats.viralByType[0].count} viral{stats.viralByType[0].count > 1 ? 'is' : ''})
                                </p>
                            )}
                            {stats.viralPostData.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
                                    <p className="text-[9px] mb-1" style={{ color: 'var(--v2-text-tertiary)' }}>Top posts virais:</p>
                                    {stats.viralPostData.map((vp, i) => (
                                        <PostMiniCard key={vp.id} post={vp} rank={i + 1} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--v2-text-tertiary)' }}>Nenhum outlier de engajamento detectado (mínimo 4 posts).</p>
                    )}
                </motion.div>

                {/* B2: Melhor Dia para Postar */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4" style={{ color: '#3b82f6' }} />
                        <span className="v2-label text-sm font-semibold">Melhor Dia para Postar</span>
                    </div>
                    {stats.bestDay.dayBreakdown.length > 0 ? (
                        <div>
                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl font-mono font-bold" style={{ color: '#3b82f6' }}>{stats.bestDay.bestDay}</span>
                                <span className="text-xs" style={{ color: 'var(--v2-text-tertiary)' }}>({formatNumber(Math.round(stats.bestDay.bestDayAvg))} eng. médio)</span>
                            </div>
                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.bestDay.dayBreakdown} barSize={16}>
                                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--v2-text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(0, 3)} />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--v2-bg-secondary)', border: '1px solid var(--v2-border)', borderRadius: '8px', fontSize: '11px' }}
                                            formatter={(value) => [formatNumber(Math.round(Number(value))), 'Eng. Médio']}
                                        />
                                        <Bar dataKey="avgEngagement" radius={[4, 4, 0, 0]}>
                                            {stats.bestDay.dayBreakdown.map((entry, index) => (
                                                <Cell key={index} fill={entry.day === stats.bestDay.bestDay ? '#3b82f6' : 'rgba(59,130,246,0.2)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--v2-text-tertiary)' }}>Sem dados temporais suficientes.</p>
                    )}
                </motion.div>

                {/* B3: Evolução Temporal (30d vs 30d) */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4" style={{ color: '#10b981' }} />
                        <span className="v2-label text-sm font-semibold">Evolução do Engajamento</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                            {stats.temporalComp.method === '30d' ? '30 dias' : stats.temporalComp.method === '14d' ? '14 dias' : '50/50'}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-mono font-bold" style={{ color: stats.temporalComp.direction === 'up' ? '#10b981' : stats.temporalComp.direction === 'down' ? '#ef4444' : 'var(--v2-text-primary)' }}>
                                {stats.temporalComp.direction === 'up' ? '+' : ''}{stats.temporalComp.changePercent}%
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: SIG_COLORS[stats.temporalComp.significance] + '20', color: SIG_COLORS[stats.temporalComp.significance] }}>
                                {SIG_LABELS[stats.temporalComp.significance]}
                            </span>
                        </div>
                        <div className="flex gap-4 text-xs" style={{ color: 'var(--v2-text-tertiary)' }}>
                            <span>Recente: <strong style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(stats.temporalComp.recentAvg)}</strong>/post</span>
                            <span>Anterior: <strong style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(stats.temporalComp.previousAvg)}</strong>/post</span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--v2-text-tertiary)' }}>
                            Cohen&apos;s d: {(stats.temporalComp.cohensD ?? 0).toFixed(2)} — comparação temporal inteligente
                        </p>
                    </div>
                </motion.div>

                {/* B4: Sentimento por Post */}
                <motion.div variants={item} className="rounded-xl p-5 v2-glass">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-4 w-4" style={{ color: '#ec4899' }} />
                        <span className="v2-label text-sm font-semibold">Sentimento por Post</span>
                    </div>
                    {stats.sentimentRank.mostEmotional.length > 0 ? (
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] mb-1" style={{ color: 'var(--v2-text-tertiary)' }}>Mais emocional (pos+neg words)</p>
                                {stats.sentimentRank.mostEmotional.slice(0, 3).map((p, i) => {
                                    const post = posts.find(pp => pp.id === p.id);
                                    if (!post) return null;
                                    return (
                                        <PostTooltip key={p.id} post={post}>
                                            <div className="flex items-center gap-2 text-xs py-1 px-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer w-full">
                                                <PostImage src={post.displayUrl} className="h-7 w-7 rounded shrink-0 border border-white/10" post={post} />
                                                <span className="truncate flex-1" style={{ color: 'var(--v2-text-secondary)' }}>{post.caption?.slice(0, 35) || post.shortCode}</span>
                                                <span className="font-mono text-[10px] shrink-0" style={{ color: '#10b981' }}>+{p.positiveWords}</span>
                                                <span className="font-mono text-[10px] shrink-0" style={{ color: '#ef4444' }}>-{p.negativeWords}</span>
                                            </div>
                                        </PostTooltip>
                                    );
                                })}
                            </div>
                            <div>
                                <p className="text-[10px] mb-1" style={{ color: 'var(--v2-text-tertiary)' }}>Maior interesse ativo (comentários longos)</p>
                                {stats.sentimentRank.mostActiveInterest.slice(0, 3).map((p, i) => {
                                    const post = posts.find(pp => pp.id === p.id);
                                    if (!post) return null;
                                    return (
                                        <PostTooltip key={p.id} post={post}>
                                            <div className="flex items-center gap-2 text-xs py-1 px-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer w-full">
                                                <PostImage src={post.displayUrl} className="h-7 w-7 rounded shrink-0 border border-white/10" post={post} />
                                                <span className="truncate flex-1" style={{ color: 'var(--v2-text-secondary)' }}>{post.caption?.slice(0, 35) || post.shortCode}</span>
                                                <span className="font-mono text-[10px] shrink-0" style={{ color: '#a855f7' }}>{p.longCommentRatio}%</span>
                                                <span className="text-[10px] shrink-0" style={{ color: 'var(--v2-text-tertiary)' }}>{p.avgWordsPerComment}w/c</span>
                                            </div>
                                        </PostTooltip>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--v2-text-tertiary)' }}>Sem comentários para análise de sentimento.</p>
                    )}
                </motion.div>
                {/* B5: Hook Quality (Schwartz) */}
                {stats.hookQuality.hookTypes.length > 0 && (
                    <motion.div variants={item} className="rounded-xl p-5 v2-glass sm:col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                            <span className="v2-label text-sm font-semibold">Qualidade do Hook</span>
                            <span className="text-[10px] ml-auto" style={{ color: 'var(--v2-text-tertiary)' }}>Primeiros 50 chars da legenda</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {stats.hookQuality.hookTypes.map(h => {
                                const examplePost = stats.hookPostExamples.get(h.type);
                                const isBest = h.type === stats.hookQuality.bestHookType;
                                return (
                                    <div key={h.type} className="p-2 rounded-lg" style={{ background: isBest ? 'rgba(139,92,246,0.1)' : 'transparent' }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs" style={{ color: isBest ? '#8b5cf6' : 'var(--v2-text-secondary)' }}>{h.type}</span>
                                                <span className="text-[10px]" style={{ color: 'var(--v2-text-tertiary)' }}>({h.count})</span>
                                            </div>
                                            <span className="font-mono text-xs font-bold" style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(h.avgEngagement)}</span>
                                        </div>
                                        {examplePost && (
                                            <PostTooltip post={examplePost}>
                                                <div className="flex items-center gap-1.5 mt-1 cursor-pointer group/hook">
                                                    <PostImage src={examplePost.displayUrl} className="h-5 w-5 rounded shrink-0 border border-white/10" post={examplePost} />
                                                    <span className="text-[9px] truncate group-hover/hook:text-blue-400 transition-colors" style={{ color: 'var(--v2-text-tertiary)' }}>
                                                        {examplePost.caption?.slice(0, 30) || examplePost.shortCode}
                                                    </span>
                                                </div>
                                            </PostTooltip>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--v2-text-tertiary)' }}>{stats.hookQuality.insight}</p>
                    </motion.div>
                )}
            </div>

            {/* ─── Section C: Post Score Table ─── */}
            <motion.div variants={item} className="rounded-xl p-5 v2-glass relative z-20">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4" style={{ color: '#ec4899' }} />
                    <span className="v2-label text-sm font-semibold">Score de Engajamento por Post</span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--v2-text-tertiary)' }}>
                        Média: {stats.engStats.mean.toFixed(0)} | Mediana: {stats.engStats.median.toFixed(0)} | σ: {stats.engStats.stdDev.toFixed(0)}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr style={{ color: 'var(--v2-text-tertiary)' }}>
                                <th className="text-left py-1 pr-2">#</th>
                                <th className="text-left py-1 pr-2">Post</th>
                                <th className="text-left py-1 pr-2">Tipo</th>
                                <th className="text-right py-1 pr-2">Score</th>
                                <th className="text-left py-1 pr-2">Badge</th>
                                <th className="text-right py-1 pr-2">Likes</th>
                                <th className="text-right py-1 pr-2">Comments</th>
                                <th className="text-right py-1">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.scoredPosts.slice(0, 15).map((sp, i) => (
                                <tr key={sp.post.shortCode} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-1.5 pr-2 font-mono" style={{ color: 'var(--v2-text-tertiary)' }}>{i + 1}</td>
                                    <td className="py-1.5 pr-2 max-w-[250px]">
                                        <PostTooltip post={sp.post}>
                                            <span className="flex items-center gap-2 cursor-pointer">
                                                <PostImage src={sp.post.displayUrl} className="h-6 w-6 rounded shrink-0 border border-white/10" post={sp.post} />
                                                <a href={sp.post.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: 'var(--v2-text-secondary)' }}>
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
                                    <td className="py-1.5 pr-2 text-right font-mono font-bold" style={{ color: 'var(--v2-text-primary)' }}>{sp.score}</td>
                                    <td className="py-1.5 pr-2">
                                        <span className={`text-[10px] font-mono ${sp.badge.color}`}>
                                            {sp.badge.emoji} {BADGE_LABELS[sp.badge.badge]}
                                        </span>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right font-mono" style={{ color: 'var(--v2-text-secondary)' }}>{formatNumber(sp.post.likesCount)}</td>
                                    <td className="py-1.5 pr-2 text-right font-mono" style={{ color: 'var(--v2-text-secondary)' }}>{formatNumber(sp.post.commentsCount)}</td>
                                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--v2-text-tertiary)' }}>
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
                        <Hash className="h-4 w-4" style={{ color: '#10b981' }} />
                        <span className="v2-label text-sm font-semibold">Eficiência de Hashtags</span>
                        <span className="text-[10px] ml-auto" style={{ color: 'var(--v2-text-tertiary)' }}>Mínimo 2 posts por hashtag</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {stats.hashtagEff.slice(0, 15).map((h, i) => {
                            const allAvgs = stats.hashtagEff.map(x => x.avgEngagement);
                            const badge = performanceBadge(h.avgEngagement, allAvgs);
                            return (
                                <div key={h.hashtag} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-mono w-4" style={{ color: 'var(--v2-text-tertiary)' }}>{i + 1}</span>
                                        <span className="text-xs font-mono truncate" style={{ color: 'var(--v2-text-secondary)' }}>#{h.hashtag}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--v2-text-primary)' }}>{formatNumber(h.avgEngagement)}</span>
                                        <span className={`text-[9px] ${badge.color}`}>{badge.emoji}</span>
                                        <span className="text-[10px]" style={{ color: 'var(--v2-text-tertiary)' }}>({h.count})</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
