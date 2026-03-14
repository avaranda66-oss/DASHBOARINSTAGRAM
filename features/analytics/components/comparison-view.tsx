'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import { refreshCompetitorAvatarAction } from '@/app/actions/competitor.actions';
import { toast } from 'sonner';
import type { InstagramPostMetrics, AnalyticsSummary } from '@/types/analytics';
import { ComparisonAIChat } from './comparison-ai-chat';
import { analyzeCommentsSentiment } from '@/lib/utils/sentiment';
import {
    postingConsistencyIndex, linearTrend, bestTimeToPost, descriptiveStats,
    contentROIScore, paretoAnalysis, contentVelocityScore, variableRewardScore,
    investmentDepthScore, hookQualityScore, brandEquityScore, persuasionTriggerCount,
} from '@/lib/utils/statistics';
import { useAnalyticsStore } from '@/stores';

// ─── Types ───
interface ProfileData {
    handle: string;
    posts: InstagramPostMetrics[];
    summary: AnalyticsSummary;
    isClient?: boolean;
    avatarUrl?: string;
}

interface ComparisonViewProps {
    client: ProfileData;
    competitors: ProfileData[];
}

type PeriodFilter = '7d' | '30d' | '60d' | '90d' | 'all' | 'custom';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string; days: number }[] = [
    { value: '7d', label: '7 dias', days: 7 },
    { value: '30d', label: '30 dias', days: 30 },
    { value: '60d', label: '60 dias', days: 60 },
    { value: '90d', label: '90 dias', days: 90 },
    { value: 'all', label: 'Todo o período', days: 99999 },
    { value: 'custom', label: 'Personalizado', days: -1 },
];

type PostLimitFilter = '10' | '20' | '50' | 'all';

const LIMIT_OPTIONS: { value: PostLimitFilter; label: string; limit: number }[] = [
    { value: '10', label: 'Últimos 10', limit: 10 },
    { value: '20', label: 'Últimos 20', limit: 20 },
    { value: '50', label: 'Últimos 50', limit: 50 },
    { value: 'all', label: 'Todos', limit: 99999 },
];

// ─── Helpers ───
function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

function pct(n: number): string { return `${n.toFixed(1)}%`; }

function Diff({ value, baseline }: { value: number; baseline: number }) {
    if (baseline === 0) return null;
    const d = Math.round(((value - baseline) / baseline) * 100);
    if (d === 0) return <span className="h-3 w-3 text-muted-foreground inline font-mono">-</span>;
    const pos = d > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${pos ? 'text-green-400' : 'text-red-400'}`}>
            <span className="font-mono text-[8px]">{pos ? '▲' : '▼'}</span>
            {Math.abs(d)}%
        </span>
    );
}

function filterPostsByPeriod(posts: InstagramPostMetrics[], days: number, customRange: { start: string, end: string } | null): InstagramPostMetrics[] {
    if (days === -1 && customRange?.start && customRange?.end) {
        const start = new Date(customRange.start).getTime();
        const end = new Date(customRange.end).getTime() + 86399999;
        return posts.filter(p => p.timestamp && new Date(p.timestamp).getTime() >= start && new Date(p.timestamp).getTime() <= end);
    }
    if (days >= 99999) return posts;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return posts.filter(p => {
        if (!p.timestamp) return false;
        return new Date(p.timestamp).getTime() >= cutoff;
    });
}



// ─── Computed metrics for a filtered set of posts ───
export interface ProfileMetrics {
    handle: string;
    isClient: boolean;
    postCount: number;
    diffDays: number;
    dateRange: string;
    // Per-post averages
    avgLikes: number;
    avgComments: number;
    avgEngagement: number; // (likes+comments)/post
    engagementRateReels: number; // (likes+comments)/views for reels only
    // Temporal
    postsPerWeek: number | null;
    postsPerMonth: number | null;
    likesPerWeek: number | null;
    likesPerMonth: number | null;
    commentsPerWeek: number | null;
    commentsPerMonth: number | null;
    engPerWeek: number | null; // total (likes+comments) per week
    engPerMonth: number | null;
    // Type breakdown
    imageCount: number;
    videoCount: number;
    carouselCount: number;
    avgLikesImage: number;
    avgLikesVideo: number;
    avgLikesCarousel: number;
    avgEngImage: number;
    avgEngVideo: number;
    avgEngCarousel: number;
    // Reels specifics
    reelsWithViews: number;
    avgViewsPerReel: number;
    // Sentiment & Quality
    commentSentiment: { pctPos: number, pctNeu: number, pctNeg: number, total: number, brand: number };
    qualifiedEngagement: number; // Média de Engajamento * Fator de Positividade
    // Statistical indicators
    postingConsistency: { cv: number; postsPerWeek: number; score: number; classification: string };
    engagementVolatility: 'high' | 'medium' | 'low';
    trendDirection: 'rising' | 'falling' | 'stable';
    trendR2: number;
    bestDay: string;
    // Intelligence indicators (Apify-safe — fair for VS)
    contentROI: number;
    paretoEfficiency: number;
    contentVelocity: number;
    variableReward: number;
    investmentDepth: number;
    hookQuality: number;
    brandEquity: number;
    persuasionTriggers: number;
}

function computeProfileMetrics(handle: string, posts: InstagramPostMetrics[], isClient: boolean, filterDays: number, customRange?: { start: string, end: string } | null): ProfileMetrics {
    const n = posts.length;
    const totalLikes = posts.reduce((s, p) => s + Math.max(0, p.likesCount), 0);
    const totalComments = posts.reduce((s, p) => s + Math.max(0, p.commentsCount), 0);
    const totalEng = totalLikes + totalComments;

    // Date range of actual posts
    const dated = posts.filter(p => p.timestamp).map(p => new Date(p.timestamp).getTime()).sort((a, b) => a - b);
    const actualDiffDays = dated.length >= 2 ? Math.max((dated[dated.length - 1] - dated[0]) / (1000 * 60 * 60 * 24), 1) : 0;

    // The baseline for temporal math: if filtering by a specific period, use that period.
    // Otherwise (all time), use the actual spread between first and last post.
    let baselineDays = filterDays < 99999 ? filterDays : Math.max(actualDiffDays, 1);

    if (filterDays === -1 && customRange?.start && customRange?.end) {
        const start = new Date(customRange.start).getTime();
        const end = new Date(customRange.end).getTime() + 86399999;
        baselineDays = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
    }

    const weeks = Math.max(baselineDays / 7, 1);
    const months = Math.max(baselineDays / 30, 1);

    // We consider metrics reliable if the baseline period is large enough
    const isWeeklyRel = baselineDays >= 7;
    const isMonthlyRel = baselineDays >= 28;

    const fmtD = (ts: number) => { const d = new Date(ts); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; };
    const dateRange = dated.length >= 2 ? `${fmtD(dated[0])} — ${fmtD(dated[dated.length - 1])}` : 'N/D';

    // Type breakdown
    const images = posts.filter(p => p.type === 'Image');
    const videos = posts.filter(p => p.type === 'Video');
    const carousels = posts.filter(p => p.type === 'Sidecar');
    const reelsWithViews = videos.filter(p => p.videoViewCount != null && p.videoViewCount > 0);

    const avgOf = (arr: InstagramPostMetrics[], fn: (p: InstagramPostMetrics) => number) =>
        arr.length > 0 ? Math.round((arr.reduce((s, p) => s + Math.max(0, fn(p)), 0) / arr.length) * 10) / 10 : 0;

    const engagementRateReels = reelsWithViews.length > 0
        ? Math.round(reelsWithViews.reduce((s, p) => s + ((Math.max(0, p.likesCount) + Math.max(0, p.commentsCount)) / p.videoViewCount!) * 100, 0) / reelsWithViews.length * 100) / 100
        : 0;

    const sentiment = analyzeCommentsSentiment(posts);
    const avgEngagement = n > 0 ? Math.round((totalEng / n) * 10) / 10 : 0;
    const qualifiedEngagement = Math.round((avgEngagement * sentiment.positivityMultiplier) * 10) / 10;

    // Statistical indicators
    const consistency = postingConsistencyIndex(posts);
    const engValues = posts.map(p => p.likesCount + p.commentsCount);
    const engStats = descriptiveStats(engValues);
    const engVolatility: 'high' | 'medium' | 'low' = engStats.cv > 0.5 ? 'high' : engStats.cv > 0.2 ? 'medium' : 'low';
    const engTrend = linearTrend(engValues);
    const bestDayResult = bestTimeToPost(posts.map(p => ({ date: p.timestamp, engagement: p.likesCount + p.commentsCount })));

    return {
        handle, isClient,
        postCount: n,
        diffDays: Math.round(actualDiffDays),
        dateRange,
        avgLikes: avgOf(posts, p => p.likesCount),
        avgComments: avgOf(posts, p => p.commentsCount),
        avgEngagement: n > 0 ? Math.round((totalEng / n) * 10) / 10 : 0,
        engagementRateReels,
        postsPerWeek: isWeeklyRel ? Math.round((n / weeks) * 10) / 10 : null,
        postsPerMonth: isMonthlyRel ? Math.round((n / months) * 10) / 10 : null,
        likesPerWeek: isWeeklyRel ? Math.round((totalLikes / weeks) * 10) / 10 : null,
        likesPerMonth: isMonthlyRel ? Math.round((totalLikes / months) * 10) / 10 : null,
        commentsPerWeek: isWeeklyRel ? Math.round((totalComments / weeks) * 10) / 10 : null,
        commentsPerMonth: isMonthlyRel ? Math.round((totalComments / months) * 10) / 10 : null,
        engPerWeek: isWeeklyRel ? Math.round((totalEng / weeks) * 10) / 10 : null,
        engPerMonth: isMonthlyRel ? Math.round((totalEng / months) * 10) / 10 : null,
        imageCount: images.length,
        videoCount: videos.length,
        carouselCount: carousels.length,
        avgLikesImage: avgOf(images, p => p.likesCount),
        avgLikesVideo: avgOf(videos, p => p.likesCount),
        avgLikesCarousel: avgOf(carousels, p => p.likesCount),
        avgEngImage: avgOf(images, p => p.likesCount + p.commentsCount),
        avgEngVideo: avgOf(videos, p => p.likesCount + p.commentsCount),
        avgEngCarousel: avgOf(carousels, p => p.likesCount + p.commentsCount),
        reelsWithViews: reelsWithViews.length,
        avgViewsPerReel: avgOf(reelsWithViews, p => p.videoViewCount ?? 0),
        commentSentiment: { pctPos: sentiment.pctPos, pctNeu: sentiment.pctNeu, pctNeg: sentiment.pctNeg, total: sentiment.total, brand: sentiment.brand },
        qualifiedEngagement,
        postingConsistency: consistency,
        engagementVolatility: engVolatility,
        trendDirection: engTrend.direction,
        trendR2: Math.round(engTrend.r2 * 100) / 100,
        bestDay: bestDayResult.bestDay,
        // Intelligence indicators (all Apify-safe)
        contentROI: contentROIScore(posts.map(p => ({ type: p.type, engagement: p.likesCount + p.commentsCount }))).score,
        paretoEfficiency: paretoAnalysis(posts.map(p => ({ id: p.id, engagement: p.likesCount + p.commentsCount }))).percentOfPosts,
        contentVelocity: contentVelocityScore(posts.filter(p => p.timestamp).map(p => ({ timestamp: p.timestamp, engagement: p.likesCount + p.commentsCount }))).score,
        variableReward: variableRewardScore(engValues).score,
        investmentDepth: investmentDepthScore(posts).score,
        hookQuality: hookQualityScore(posts.map(p => ({ caption: p.caption ?? '', engagement: p.likesCount + p.commentsCount }))).score,
        brandEquity: brandEquityScore(posts.map(p => ({ hashtags: p.hashtags ?? [], engagement: p.likesCount + p.commentsCount }))).score,
        persuasionTriggers: posts.reduce((s, p) => s + persuasionTriggerCount(p.caption ?? '').total, 0),
    };
}

function computeSummary(posts: InstagramPostMetrics[]): AnalyticsSummary {
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((s, p) => s + p.likesCount, 0);
    const totalComments = posts.reduce((s, p) => s + p.commentsCount, 0);
    const totalViews = posts.reduce((s, p) => s + (p.videoViewCount ?? 0), 0);
    const avgLikesPerPost = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
    const avgCommentsPerPost = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;
    const images = posts.filter(p => p.type === 'Image');
    const videos = posts.filter(p => p.type === 'Video');
    const carousels = posts.filter(p => p.type === 'Sidecar');
    const postsWithViews = posts.filter(p => p.videoViewCount != null && p.videoViewCount > 0);
    const avgEngagementRate = postsWithViews.length > 0
        ? Math.round((postsWithViews.reduce((s, p) => s + ((p.likesCount + p.commentsCount) / p.videoViewCount!) * 100, 0) / postsWithViews.length) * 100) / 100
        : 0;
    const bestPost = posts.length > 0
        ? posts.reduce((b, p) => p.likesCount + p.commentsCount > b.likesCount + b.commentsCount ? p : b)
        : null;
    const totalEng = posts.reduce((sum, p) => sum + Math.max(0, p.likesCount) + Math.max(0, p.commentsCount), 0);
    const avgEngagement = totalPosts > 0 ? Math.round((totalEng / totalPosts) * 10) / 10 : 0;
    const sentiment = analyzeCommentsSentiment(posts);
    const qualifiedEngagement = Math.round((avgEngagement * sentiment.positivityMultiplier) * 10) / 10;

    return {
        totalPosts, totalLikes, totalComments, totalViews,
        avgLikesPerPost, avgCommentsPerPost, avgEngagementRate, bestPost,
        imageCount: images.length, videoCount: videos.length, carouselCount: carousels.length,
        videosWithViews: postsWithViews.length,
        avgLikesImage: images.length > 0 ? Math.round(images.reduce((s, p) => s + p.likesCount, 0) / images.length) : 0,
        avgLikesVideo: videos.length > 0 ? Math.round(videos.reduce((s, p) => s + p.likesCount, 0) / videos.length) : 0,
        avgLikesCarousel: carousels.length > 0 ? Math.round(carousels.reduce((s, p) => s + p.likesCount, 0) / carousels.length) : 0,
        commentSentiment: { pctPos: sentiment.pctPos, pctNeu: sentiment.pctNeu, pctNeg: sentiment.pctNeg, total: sentiment.total, brand: sentiment.brand },
        qualifiedEngagement,
    };
}

// ─── Table Row Component ───
function MetricRow({ label, icon: Icon, color, profiles, getValue, formatValue, clientIdx = 0 }: {
    label: string; icon: React.ElementType; color: string;
    profiles: ProfileMetrics[];
    getValue: (m: ProfileMetrics) => number | null;
    formatValue: (n: number) => string;
    clientIdx?: number;
}) {
    const clientVal = getValue(profiles[clientIdx]);
    return (
        <tr className="hover:bg-muted/10">
            <td className="px-4 py-2 whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-xs">
                    <span className={`font-mono text-[10px] ${color}`}>◎</span> {label}
                </span>
            </td>
            {profiles.map(p => {
                const val = getValue(p);
                return (
                    <td key={p.handle} className="px-3 py-2 text-center">
                        <span className="font-semibold text-xs">{(val !== null && val >= 0) ? formatValue(val) : 'N/D'}</span>
                        {!p.isClient && val !== null && val > 0 && clientVal !== null && clientVal > 0 && <span className="ml-1"><Diff value={val as number} baseline={clientVal as number} /></span>}
                    </td>
                );
            })}
        </tr>
    );
}

// ─── Main Component ───
export function ComparisonView({ client, competitors }: ComparisonViewProps) {
    const [period, setPeriod] = useState<PeriodFilter>('all');
    const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string } | null>(null);
    const [postLimit, setPostLimit] = useState<PostLimitFilter>('all');

    const selectedDays = PERIOD_OPTIONS.find(o => o.value === period)!.days;
    const selectedLimit = LIMIT_OPTIONS.find(o => o.value === postLimit)!.limit;
    const [refreshing, setRefreshing] = useState<string | null>(null);
    const [localAvatars, setLocalAvatars] = useState<Record<string, string>>({});

    const handleRefreshAvatar = async (handle: string) => {
        setRefreshing(handle);
        try {
            const newUrl = await refreshCompetitorAvatarAction(handle);
            if (newUrl) {
                toast.success("Foto de perfil atualizada!");
                setLocalAvatars(prev => ({ ...prev, [handle]: newUrl }));

                // Atualiza o store global se este for o perfil selecionado atualmente
                const store = useAnalyticsStore.getState();
                if (store.selectedAccountHandle === handle) {
                    useAnalyticsStore.setState({ avatarUrl: newUrl });
                }
            } else {
                toast.error("Não foi possível capturar a foto agora.");
            }
        } catch (e) {
            toast.error("Falha na conexão.");
        } finally {
            setRefreshing(null);
        }
    };

    // Filter posts by period and compute metrics
    const profiles = useMemo(() => {
        const all = [
            { ...client, isClient: true },
            ...competitors.map(c => ({ ...c, isClient: false })),
        ];
        return all.map(p => {
            let filtered = filterPostsByPeriod(p.posts, selectedDays, customDateRange);

            // Apply post limit filter (most recent first)
            filtered.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            filtered = filtered.slice(0, selectedLimit);

            return computeProfileMetrics(p.handle, filtered, !!p.isClient, selectedDays, customDateRange);
        });
    }, [client, competitors, selectedDays, selectedLimit, customDateRange]);

    const clientProfile = profiles[0];

    return (
        <div className="space-y-4">
            {/* ─── Filters ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                        <span className="font-mono text-xs">◎</span>
                        <span>Período:</span>
                    </div>
                    {PERIOD_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setPeriod(opt.value)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${period === opt.value
                                ? 'bg-purple-500 text-white border border-purple-500'
                                : 'border border-border text-muted-foreground hover:text-foreground hover:border-purple-500/50'
                                }`}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                {period === 'custom' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1 shadow-sm">
                            <input
                                type="date"
                                className="text-[11px] bg-transparent outline-none flex-1 text-foreground"
                                value={customDateRange?.start || ''}
                                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value, end: customDateRange?.end || '' })}
                            />
                            <span className="text-muted-foreground text-[10px] font-medium">até</span>
                            <input
                                type="date"
                                className="text-[11px] bg-transparent outline-none flex-1 text-foreground"
                                value={customDateRange?.end || ''}
                                onChange={(e) => setCustomDateRange({ ...customDateRange, start: customDateRange?.start || '', end: e.target.value })}
                            />
                        </div>
                    </motion.div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                        <span className="font-mono text-xs">◎</span>
                        <span>Quantidade:</span>
                    </div>
                    {LIMIT_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setPostLimit(opt.value)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${postLimit === opt.value
                                ? 'bg-pink-500 text-white border border-pink-500'
                                : 'border border-border text-muted-foreground hover:text-foreground hover:border-pink-500/50'
                                }`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ─── Profile cards ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="grid gap-3" style={{ gridTemplateColumns: `repeat(${profiles.length}, minmax(0, 1fr))` }}>
                {profiles.map(p => {
                    // 1. Prioridade: Foto acabou de ser sincronizada (localAvatars)
                    // 2. Segunda: Foto que veio nos props do perfil (p.avatarUrl)
                    // 3. Terceira: Fallback para o objeto original se necessário
                    const avatarUrl = localAvatars[p.handle] ||
                        [client, ...competitors].find(c => c.handle === p.handle)?.avatarUrl;

                    return (
                        <div key={p.handle}
                            className={`group relative rounded-xl border p-3 text-center ${p.isClient ? 'border-blue-500/40 bg-blue-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>

                            <div className="flex flex-col items-center gap-2">
                                <div className="relative h-12 w-12 rounded-full border-2 border-border/50 overflow-hidden bg-muted flex items-center justify-center shadow-sm">
                                    {avatarUrl ? (
                                        <img src={`/api/image-proxy?url=${encodeURIComponent(avatarUrl)}`} alt={p.handle} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="font-mono text-lg text-muted-foreground/40">◎</span>
                                    )}
                                    {refreshing === p.handle && (
                                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                            <span className="font-mono text-xs animate-spin text-primary">↻</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    <p className={`text-sm font-bold ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                        {p.isClient && '⭐ '}@{p.handle}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {p.postCount} posts {period !== 'all' && `(no período)`}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleRefreshAvatar(p.handle)}
                                disabled={!!refreshing}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm border border-border"
                                title="Atualizar Foto de Perfil"
                            >
                                <span className={`font-mono text-[10px] text-muted-foreground ${refreshing === p.handle ? 'animate-spin' : ''}`}>↻</span>
                            </button>

                            <div className="mt-2 pt-2 border-t border-border/20">
                                <p className="text-[10px] text-muted-foreground">{p.dateRange}</p>
                                <p className="text-[10px] text-muted-foreground/70">{p.diffDays} dias</p>
                            </div>
                        </div>
                    );
                })}
            </motion.div>

            {/* ─── No posts warning ─── */}
            {profiles.some(p => p.postCount === 0) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400">
                    ⚠️ Um ou mais perfis não tem posts neste período. Tente ampliar o filtro.
                </div>
            )}

            {/* ─── Médias por Post ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-blue-400">◎</span>
                        Médias por Post (todos os tipos)
                    </h4>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase">Métrica</th>
                            {profiles.map(p => (
                                <th key={p.handle} className={`px-3 py-2 text-center text-[10px] uppercase ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    @{p.handle}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        <MetricRow label="Likes/Post" icon={() => null} color="text-pink-400" profiles={profiles} getValue={m => m.avgLikes} formatValue={fmt} />
                        <MetricRow label="Comentários/Post" icon={() => null} color="text-blue-400" profiles={profiles} getValue={m => m.avgComments} formatValue={fmt} />

                        {/* Sentimento */}
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-emerald-400">●</span> Sentimento (Comentários)
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center text-[10px]">
                                    {p.commentSentiment.total > 0 ? (
                                        <div className="flex flex-col items-center gap-1 mt-1 mb-1">
                                            <div className="flex w-16 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-green-500" style={{ width: `${p.commentSentiment.pctPos}%` }} title={`🟢 Positivo: ${p.commentSentiment.pctPos}%`} />
                                                <div className="bg-slate-300 dark:bg-slate-600" style={{ width: `${p.commentSentiment.pctNeu}%` }} title={`⚪ Neutro: ${p.commentSentiment.pctNeu}%`} />
                                                <div className="bg-red-500" style={{ width: `${p.commentSentiment.pctNeg}%` }} title={`🔴 Negativo: ${p.commentSentiment.pctNeg}%`} />
                                            </div>
                                            <span className="text-muted-foreground whitespace-nowrap text-[9px] font-medium tracking-tighter">
                                                <span className="text-green-500">{p.commentSentiment.pctPos}%</span> | <span className="text-red-500">{p.commentSentiment.pctNeg}%</span>
                                            </span>
                                        </div>
                                    ) : <span className="text-muted-foreground">—</span>}
                                </td>
                            ))}
                        </tr>

                        <MetricRow label="Engajamento/Post" icon={() => null} color="text-green-400" profiles={profiles} getValue={m => m.avgEngagement} formatValue={fmt} />
                        <MetricRow label="Engajamento Qualificado" icon={() => null} color="text-yellow-400" profiles={profiles} getValue={m => m.qualifiedEngagement} formatValue={fmt} />
                        <MetricRow label="Engaj. Reels (%)" icon={() => null} color="text-purple-400" profiles={profiles} getValue={m => m.engagementRateReels} formatValue={pct} />
                        <MetricRow label="Views/Reel" icon={() => null} color="text-violet-400" profiles={profiles} getValue={m => m.avgViewsPerReel} formatValue={fmt} />
                    </tbody>
                </table>
            </motion.div>

            {/* ─── Engajamento por Tipo ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-amber-400">⊞</span>
                        Engajamento por Tipo de Conteúdo
                    </h4>
                    <p className="text-[10px] text-muted-foreground">(likes + comentários médios por tipo)</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase">Tipo</th>
                            {profiles.map(p => (
                                <th key={p.handle} className={`px-3 py-2 text-center text-[10px] uppercase ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    @{p.handle}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {/* Simple rows for each type */}
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-blue-400">◫</span> 📷 Posts (imagem)
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    {p.imageCount > 0 ? (
                                        <div>
                                            <span className="font-semibold text-xs">{fmt(p.avgEngImage)}</span>
                                            <span className="text-[10px] text-muted-foreground ml-1">({p.imageCount})</span>
                                            {!p.isClient && clientProfile.avgEngImage > 0 && <span className="ml-1"><Diff value={p.avgEngImage} baseline={clientProfile.avgEngImage} /></span>}
                                        </div>
                                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-pink-400">▶</span> 🎬 Reels (vídeo)
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    {p.videoCount > 0 ? (
                                        <div>
                                            <span className="font-semibold text-xs">{fmt(p.avgEngVideo)}</span>
                                            <span className="text-[10px] text-muted-foreground ml-1">({p.videoCount})</span>
                                            {!p.isClient && clientProfile.avgEngVideo > 0 && <span className="ml-1"><Diff value={p.avgEngVideo} baseline={clientProfile.avgEngVideo} /></span>}
                                        </div>
                                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-orange-400">⊞</span> 🔲 Carrosséis
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    {p.carouselCount > 0 ? (
                                        <div>
                                            <span className="font-semibold text-xs">{fmt(p.avgEngCarousel)}</span>
                                            <span className="text-[10px] text-muted-foreground ml-1">({p.carouselCount})</span>
                                            {!p.isClient && clientProfile.avgEngCarousel > 0 && <span className="ml-1"><Diff value={p.avgEngCarousel} baseline={clientProfile.avgEngCarousel} /></span>}
                                        </div>
                                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </motion.div>

            {/* ─── Médias Temporais ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-green-400">◎</span>
                        Médias Temporais (Engajamento)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Atividade por semana/mês no período filtrado. Precisa ≥7d para semanal, ≥28d para mensal.</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase">Métrica</th>
                            {profiles.map(p => (
                                <th key={p.handle} className={`px-3 py-2 text-center text-[10px] uppercase ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    @{p.handle}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {/* Period */}
                        <tr className="bg-muted/5">
                            <td className="px-4 py-2"><span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="font-mono text-xs">◎</span> Período</span></td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center text-xs font-medium">{p.diffDays > 0 ? `${p.diffDays}d` : 'N/D'}</td>
                            ))}
                        </tr>
                        {/* Weekly */}
                        <MetricRow label="Posts/Semana" icon={() => null} color="text-cyan-400" profiles={profiles} getValue={m => m.postsPerWeek} formatValue={n => n.toFixed(1)} />
                        <MetricRow label="Engaj./Semana" icon={() => null} color="text-green-400" profiles={profiles} getValue={m => m.engPerWeek} formatValue={fmt} />
                        <MetricRow label="Likes/Semana" icon={() => null} color="text-pink-400" profiles={profiles} getValue={m => m.likesPerWeek} formatValue={fmt} />
                        <MetricRow label="Coment./Semana" icon={() => null} color="text-blue-400" profiles={profiles} getValue={m => m.commentsPerWeek} formatValue={fmt} />
                        {/* Monthly */}
                        <MetricRow label="Posts/Mês" icon={() => null} color="text-cyan-400" profiles={profiles} getValue={m => m.postsPerMonth} formatValue={n => n.toFixed(1)} />
                        <MetricRow label="Engaj./Mês" icon={() => null} color="text-green-400" profiles={profiles} getValue={m => m.engPerMonth} formatValue={fmt} />
                        <MetricRow label="Likes/Mês" icon={() => null} color="text-pink-400" profiles={profiles} getValue={m => m.likesPerMonth} formatValue={fmt} />
                        <MetricRow label="Coment./Mês" icon={() => null} color="text-blue-400" profiles={profiles} getValue={m => m.commentsPerMonth} formatValue={fmt} />
                    </tbody>
                </table>
            </motion.div>

            {/* ─── Content distribution ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                    <span className="font-mono text-xs text-amber-400">⊞</span>
                    Distribuição de Conteúdo (%)
                </h4>
                <div className="space-y-3">
                    {profiles.map(p => {
                        const total = p.postCount || 1;
                        const imgPct = (p.imageCount / total) * 100;
                        const vidPct = (p.videoCount / total) * 100;
                        const carPct = (p.carouselCount / total) * 100;
                        return (
                            <div key={p.handle}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className={`font-medium ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                        {p.isClient && '⭐ '}@{p.handle}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{p.postCount} posts</span>
                                </div>
                                <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
                                    {imgPct > 0 && (
                                        <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${imgPct}%` }}>
                                            {imgPct > 12 && <span className="text-[8px] text-white font-medium">{Math.round(imgPct)}%</span>}
                                        </div>
                                    )}
                                    {vidPct > 0 && (
                                        <div className="bg-pink-500 flex items-center justify-center" style={{ width: `${vidPct}%` }}>
                                            {vidPct > 12 && <span className="text-[8px] text-white font-medium">{Math.round(vidPct)}%</span>}
                                        </div>
                                    )}
                                    {carPct > 0 && (
                                        <div className="bg-orange-500 flex items-center justify-center" style={{ width: `${carPct}%` }}>
                                            {carPct > 12 && <span className="text-[8px] text-white font-medium">{Math.round(carPct)}%</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Posts</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500" /> Reels</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Carrosséis</span>
                    </div>
                </div>
            </motion.div>

            {/* ─── Visual bars ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="font-mono text-xs text-green-400">↗</span>
                    Engajamento por Post (likes + comentários)
                </h4>
                {(() => {
                    const maxVal = Math.max(...profiles.map(p => p.avgEngagement), 1);
                    return profiles.map((p, i) => (
                        <div key={p.handle} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {p.isClient && '⭐ '}@{p.handle}
                                </span>
                                <span className="text-muted-foreground">{fmt(p.avgEngagement)}/post</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden bg-muted/30">
                                <motion.div
                                    className={`h-full rounded-full ${p.isClient ? 'bg-blue-500' : 'bg-orange-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(p.avgEngagement / maxVal) * 100}%` }}
                                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                                />
                            </div>
                        </div>
                    ));
                })()}
            </motion.div>

            {/* ─── Posting frequency bars ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="font-mono text-xs text-cyan-400">◷</span>
                    Frequência de Postagem (posts/semana)
                </h4>
                {(() => {
                    const maxVal = Math.max(...profiles.map(p => p.postsPerWeek || 0), 0.1);
                    return profiles.map((p, i) => (
                        <div key={p.handle} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {p.isClient && '⭐ '}@{p.handle}
                                </span>
                                <span className="text-muted-foreground">{(p.postsPerWeek !== null && p.postsPerWeek > 0) ? `${p.postsPerWeek.toFixed(1)}/sem` : 'N/D'}</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden bg-muted/30">
                                <motion.div
                                    className={`h-full rounded-full ${p.isClient ? 'bg-blue-500' : 'bg-orange-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((p.postsPerWeek || 0) / maxVal) * 100}%` }}
                                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                                />
                            </div>
                        </div>
                    ));
                })()}
            </motion.div>

            {/* ─── Indicadores Estatísticos ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-purple-400">↗</span>
                        Indicadores Estatísticos
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Análise matemática de consistência, volatilidade e tendência</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase">Indicador</th>
                            {profiles.map(p => (
                                <th key={p.handle} className={`px-3 py-2 text-center text-[10px] uppercase ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    @{p.handle}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-cyan-400">◎</span> Consistência
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    <span className={`text-xs font-medium ${p.postingConsistency.score >= 45 ? 'text-green-400' : p.postingConsistency.score >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {p.postingConsistency.classification}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-1">({p.postingConsistency.score}/100)</span>
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-amber-400">◎</span> Volatilidade
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    <span className={`text-xs font-medium ${p.engagementVolatility === 'low' ? 'text-green-400' : p.engagementVolatility === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                                        {p.engagementVolatility === 'low' ? 'Baixa' : p.engagementVolatility === 'medium' ? 'Média' : 'Alta'}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-green-400">↗</span> Tendência
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    <span className={`text-xs font-medium ${p.trendDirection === 'rising' ? 'text-green-400' : p.trendDirection === 'falling' ? 'text-red-400' : 'text-muted-foreground'}`}>
                                        {p.trendDirection === 'rising' ? '↑ Crescendo' : p.trendDirection === 'falling' ? '↓ Caindo' : '→ Estável'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-1">(R²: {p.trendR2})</span>
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-muted/10">
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-xs text-blue-400">◎</span> Melhor Dia
                                </span>
                            </td>
                            {profiles.map(p => (
                                <td key={p.handle} className="px-3 py-2 text-center">
                                    <span className="text-xs font-semibold">{p.bestDay || 'N/D'}</span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </motion.div>

            {/* ─── Inteligência Competitiva ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="rounded-xl border border-border bg-card overflow-x-auto">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-violet-400">◎</span>
                        Inteligência Competitiva
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Indicadores baseados em frameworks de especialistas (Hormozi, Cialdini, Eyal, Schwartz, Lindstrom, Brunson)</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase">Indicador</th>
                            {profiles.map(p => (
                                <th key={p.handle} className={`px-3 py-2 text-center text-[10px] uppercase ${p.isClient ? 'text-blue-400' : 'text-orange-400'}`}>
                                    @{p.handle}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        <MetricRow label="Content ROI" icon={() => null} color="text-emerald-400" profiles={profiles} getValue={m => m.contentROI} formatValue={n => `${n}/100`} />
                        <MetricRow label="Pareto (80/20)" icon={() => null} color="text-amber-400" profiles={profiles} getValue={m => m.paretoEfficiency} formatValue={n => `${n}%`} />
                        <MetricRow label="Content Velocity" icon={() => null} color="text-sky-400" profiles={profiles} getValue={m => m.contentVelocity} formatValue={n => `${n}/100`} />
                        <MetricRow label="Variable Reward" icon={() => null} color="text-cyan-400" profiles={profiles} getValue={m => m.variableReward} formatValue={n => `${n}/100`} />
                        <MetricRow label="Investment Depth" icon={() => null} color="text-purple-400" profiles={profiles} getValue={m => m.investmentDepth} formatValue={n => `${n}/100`} />
                        <MetricRow label="Hook Quality" icon={() => null} color="text-yellow-400" profiles={profiles} getValue={m => m.hookQuality} formatValue={n => `${n}/100`} />
                        <MetricRow label="Brand Equity" icon={() => null} color="text-violet-400" profiles={profiles} getValue={m => m.brandEquity} formatValue={n => `${n}/100`} />
                        <MetricRow label="Persuasion Triggers" icon={() => null} color="text-rose-400" profiles={profiles} getValue={m => m.persuasionTriggers} formatValue={n => `${n}`} />
                    </tbody>
                </table>
            </motion.div>

            {/* AI Analysis */}
            <ComparisonAIChat
                client={profiles.find(p => p.isClient)!}
                competitors={profiles.filter(p => !p.isClient)}
                periodLabel={PERIOD_OPTIONS.find(o => o.value === period)?.label || 'Todo período'}
            />

            {/* Info */}
            <p className="text-[10px] text-muted-foreground/50 text-center mt-4">
                ⓘ Todas as métricas são filtradas pelo período selecionado e normalizadas pelo nº de posts e tempo real de cada perfil. N/D = dados insuficientes no período.
            </p>
        </div>
    );
}

export { computeSummary };
export type { ProfileData };
