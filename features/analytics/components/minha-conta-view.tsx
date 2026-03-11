'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Zap, RefreshCw, AlertCircle, TrendingUp, Eye, Heart,
    Bookmark, Share2, Users, BarChart2, BarChart, Hash, Sparkles,
    ExternalLink, Image, Video, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InstagramPostMetrics } from '@/types/analytics';
import { getMetaAnalyticsAction, saveMetaAnalyticsAction } from '@/app/actions/analytics.actions';
import { MetaTimelineChart } from './meta-timeline-chart';
import { MetaContentTypeChart } from './meta-content-type-chart';
import { MetaPostingDayChart } from './meta-posting-day-chart';
import { MetaTopPosts } from './meta-top-posts';
import { MetaHashtagAnalysis } from './meta-hashtag-analysis';
import { MetaAiStrategy } from './meta-ai-strategy';

interface MetaPost extends InstagramPostMetrics {
    reach?: number;
    saved?: number;
    shares?: number;
    totalInteractions?: number;
    source?: 'meta';
}

interface MetaSummary {
    totalPosts: number;
    totalReach: number;
    avgReach: number;
    totalSaves: number;
    totalShares: number;
    totalLikes: number;
    totalComments: number;
    avgEngagementRate: number;
    bestPostByReach: MetaPost | null;
    bestPostByLikes: MetaPost | null;
    imageCount: number;
    videoCount: number;
    carouselCount: number;
    avgReachImage: number;
    avgReachVideo: number;
    avgReachCarousel: number;
}

function computeMetaSummary(posts: MetaPost[]): MetaSummary {
    const totalPosts = posts.length;
    const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0);
    const totalSaves = posts.reduce((s, p) => s + (p.saved ?? 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.shares ?? 0), 0);
    const totalLikes = posts.reduce((s, p) => s + p.likesCount, 0);
    const totalComments = posts.reduce((s, p) => s + p.commentsCount, 0);
    const avgReach = totalPosts > 0 ? Math.round(totalReach / totalPosts) : 0;

    const postsWithReach = posts.filter((p) => (p.reach ?? 0) > 0);
    const avgEngagementRate =
        postsWithReach.length > 0
            ? Math.round(
                (postsWithReach.reduce((s, p) => s + ((p.likesCount + p.commentsCount) / p.reach!) * 100, 0) /
                    postsWithReach.length) * 100,
            ) / 100
            : 0;

    const images = posts.filter((p) => p.type === 'Image');
    const videos = posts.filter((p) => p.type === 'Video');
    const carousels = posts.filter((p) => p.type === 'Sidecar');

    const avgOf = (arr: MetaPost[]) =>
        arr.length > 0 ? Math.round(arr.reduce((s, p) => s + (p.reach ?? 0), 0) / arr.length) : 0;

    const bestPostByReach =
        postsWithReach.length > 0
            ? postsWithReach.reduce((best, p) => ((p.reach ?? 0) > (best.reach ?? 0) ? p : best))
            : null;
    const bestPostByLikes =
        posts.length > 0 ? posts.reduce((best, p) => (p.likesCount > best.likesCount ? p : best)) : null;

    return {
        totalPosts, totalReach, avgReach, totalSaves, totalShares,
        totalLikes, totalComments, avgEngagementRate,
        bestPostByReach, bestPostByLikes,
        imageCount: images.length, videoCount: videos.length, carouselCount: carousels.length,
        avgReachImage: avgOf(images), avgReachVideo: avgOf(videos), avgReachCarousel: avgOf(carousels),
    };
}

function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('pt-BR');
}

function TypeIcon({ type }: { type: string }) {
    if (type === 'Video') return <Video className="h-3 w-3 text-purple-400" />;
    if (type === 'Sidecar') return <Layers className="h-3 w-3 text-blue-400" />;
    return <Image className="h-3 w-3 text-emerald-400" />;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

type InternalTab = 'overview' | 'charts' | 'posts' | 'hashtags' | 'strategy';

const INTERNAL_TABS: { key: InternalTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Visão Geral', icon: TrendingUp },
    { key: 'charts', label: 'Gráficos', icon: BarChart },
    { key: 'posts', label: 'Melhores Posts', icon: BarChart2 },
    { key: 'hashtags', label: 'Hashtags', icon: Hash },
    { key: 'strategy', label: 'Estratégia IA', icon: Sparkles },
];

interface Props {
    token: string;
    username?: string;
}

export function MinhaContaView({ token, username }: Props) {
    const [posts, setPosts] = useState<MetaPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCache, setIsLoadingCache] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [isFromCache, setIsFromCache] = useState(false);
    const [activeTab, setActiveTab] = useState<InternalTab>('overview');
    const [sortBy, setSortBy] = useState<'reach' | 'likes' | 'saves' | 'shares' | 'date'>('reach');

    // Carrega cache do banco na montagem
    useEffect(() => {
        if (!username) { setIsLoadingCache(false); return; }
        getMetaAnalyticsAction(username).then((cached) => {
            if (cached && cached.posts.length > 0) {
                setPosts(cached.posts as MetaPost[]);
                setFetchedAt(cached.fetchedAt);
                setIsFromCache(true);
            }
        }).catch(() => { /* silencioso */ }).finally(() => setIsLoadingCache(false));
    }, [username]);

    const hasFetched = posts.length > 0;
    const summary = hasFetched ? computeMetaSummary(posts) : null;

    const handleFetch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/meta-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, limit: 50 }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error ?? 'Erro ao buscar dados.');
                return;
            }
            const freshPosts = json.data as MetaPost[];
            const now = new Date().toISOString();
            setPosts(freshPosts);
            setFetchedAt(now);
            setIsFromCache(false);
            // Persistir no banco para próximas visitas
            if (username) {
                saveMetaAnalyticsAction(username, freshPosts).catch(console.error);
            }
        } catch (e: any) {
            setError(e.message ?? 'Erro de rede.');
        } finally {
            setIsLoading(false);
        }
    };

    const sortedPosts = [...posts].sort((a, b) => {
        if (sortBy === 'reach') return (b.reach ?? 0) - (a.reach ?? 0);
        if (sortBy === 'likes') return b.likesCount - a.likesCount;
        if (sortBy === 'saves') return (b.saved ?? 0) - (a.saved ?? 0);
        if (sortBy === 'shares') return (b.shares ?? 0) - (a.shares ?? 0);
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return (
        <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
            {/* Header */}
            <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-[var(--v2-accent)]" />
                            <span className="font-semibold text-sm text-[var(--v2-text-primary)]">
                                {username ? `@${username}` : 'Sua Conta'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-[var(--v2-accent)]/10 border border-[var(--v2-accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--v2-accent)]">
                                META API
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-[var(--v2-text-secondary)]">
                                Dados privados exclusivos: alcance real, saves e compartilhamentos.
                            </p>
                            {fetchedAt && (
                                <span className="text-[10px] text-[var(--v2-text-tertiary)]">
                                    {isFromCache ? '💾 Cache de' : '🔄 Atualizado em'}{' '}
                                    {format(parseISO(fetchedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        onClick={handleFetch}
                        disabled={isLoading}
                        size="sm"
                        className="bg-[var(--v2-accent)] hover:bg-[var(--v2-accent-hover)] text-white shrink-0"
                    >
                        {isLoading ? (
                            <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Buscando...</>
                        ) : hasFetched ? (
                            <><RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar</>
                        ) : (
                            <><Zap className="mr-2 h-3.5 w-3.5" /> Buscar Métricas Privadas</>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div variants={item} className="flex items-start gap-2 rounded-xl border border-[var(--v2-danger)]/20 bg-[var(--v2-danger)]/5 p-4">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                </motion.div>
            )}

            {/* Loading cache */}
            {!hasFetched && !isLoading && !error && isLoadingCache && (
                <motion.div variants={item} className="rounded-xl v2-glass border border-dashed border-[var(--v2-border)] p-10 text-center">
                    <RefreshCw className="h-6 w-6 text-[var(--v2-text-tertiary)] mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Verificando dados salvos...</p>
                </motion.div>
            )}

            {/* Empty state (nenhum cache encontrado) */}
            {!hasFetched && !isLoading && !error && !isLoadingCache && (
                <motion.div variants={item} className="rounded-xl v2-glass border border-dashed border-[var(--v2-border)] p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--v2-accent)]/10">
                        <Zap className="h-7 w-7 text-[var(--v2-accent)]" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Dados Privados da Sua Conta</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                        Clique em "Buscar Métricas Privadas" para ver alcance real, saves e compartilhamentos — métricas que o Apify não consegue acessar.
                    </p>
                </motion.div>
            )}

            {/* Internal tabs + content */}
            {hasFetched && summary && (
                <>
                    {/* Tab bar */}
                    <motion.div variants={item} className="flex rounded-xl v2-glass overflow-hidden w-fit">
                        {INTERNAL_TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === t.key
                                    ? 'bg-[var(--v2-accent)]/15 text-[var(--v2-text-primary)]'
                                    : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-primary)]'
                                    }`}
                            >
                                <t.icon className={`h-3.5 w-3.5 ${activeTab === t.key && t.key === 'strategy' ? 'text-purple-400' : ''}`} />
                                {t.label}
                            </button>
                        ))}
                    </motion.div>

                    {/* ── TAB: Visão Geral ── */}
                    {activeTab === 'overview' && (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
                            {/* KPI cards */}
                            <motion.div variants={item}>
                                <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Visão Geral — {summary.totalPosts} posts
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {[
                                        { label: 'Alcance Total', value: fmt(summary.totalReach), sub: `~${fmt(summary.avgReach)} por post`, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                        { label: 'Total Likes', value: fmt(summary.totalLikes), sub: `~${fmt(Math.round(summary.totalLikes / summary.totalPosts))} por post`, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                        { label: 'Total Saves', value: fmt(summary.totalSaves), sub: `~${fmt(Math.round(summary.totalSaves / summary.totalPosts))} por post`, icon: Bookmark, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                        { label: 'Compartilhamentos', value: fmt(summary.totalShares), sub: `~${fmt(Math.round(summary.totalShares / summary.totalPosts))} por post`, icon: Share2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                        { label: 'Tx. Eng. Real', value: `${summary.avgEngagementRate}%`, sub: 'baseado em alcance', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                        { label: 'Comentários', value: fmt(summary.totalComments), sub: `~${fmt(Math.round(summary.totalComments / summary.totalPosts))} por post`, icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                    ].map((kpi) => (
                                        <div key={kpi.label} className="rounded-xl v2-glass v2-glass-hover p-3 space-y-2">
                                            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                                                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold v2-number">{kpi.value}</p>
                                                <p className="text-[10px] font-medium text-[var(--v2-text-secondary)] uppercase tracking-wider leading-tight v2-label">{kpi.label}</p>
                                                <p className="text-[10px] text-[var(--v2-text-tertiary)]">{kpi.sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Breakdown by type */}
                            <motion.div variants={item} className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Alcance Médio — Foto', value: fmt(summary.avgReachImage), count: summary.imageCount, color: 'text-emerald-400', icon: Image },
                                    { label: 'Alcance Médio — Vídeo', value: fmt(summary.avgReachVideo), count: summary.videoCount, color: 'text-purple-400', icon: Video },
                                    { label: 'Alcance Médio — Carrossel', value: fmt(summary.avgReachCarousel), count: summary.carouselCount, color: 'text-blue-400', icon: Layers },
                                ].map((row) => (
                                    <div key={row.label} className="rounded-xl v2-glass v2-glass-hover p-3 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/50 shrink-0">
                                            <row.icon className={`h-4 w-4 ${row.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold">{row.value}</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">{row.label}</p>
                                            <p className="text-[10px] text-muted-foreground/50">{row.count} posts</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Best posts */}
                            {(summary.bestPostByReach || summary.bestPostByLikes) && (
                                <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {summary.bestPostByReach && (
                                        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/5 backdrop-blur-sm p-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1.5">
                                                <Eye className="h-3.5 w-3.5" /> Maior Alcance
                                            </div>
                                            <p className="text-sm line-clamp-2 mb-2">{summary.bestPostByReach.caption || '(sem legenda)'}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                    <span><Eye className="h-3 w-3 inline mr-0.5" />{fmt(summary.bestPostByReach.reach ?? 0)}</span>
                                                    <span><Heart className="h-3 w-3 inline mr-0.5" />{fmt(summary.bestPostByReach.likesCount)}</span>
                                                </div>
                                                {summary.bestPostByReach.url && (
                                                    <a href={summary.bestPostByReach.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">
                                                        Ver <ExternalLink className="h-2.5 w-2.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {summary.bestPostByLikes && (
                                        <div className="rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 to-orange-500/5 backdrop-blur-sm p-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-pink-400 mb-1.5">
                                                <Heart className="h-3.5 w-3.5" /> Mais Curtido
                                            </div>
                                            <p className="text-sm line-clamp-2 mb-2">{summary.bestPostByLikes.caption || '(sem legenda)'}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                    <span><Heart className="h-3 w-3 inline mr-0.5" />{fmt(summary.bestPostByLikes.likesCount)}</span>
                                                    <span><Eye className="h-3 w-3 inline mr-0.5" />{fmt(summary.bestPostByLikes.reach ?? 0)}</span>
                                                </div>
                                                {summary.bestPostByLikes.url && (
                                                    <a href={summary.bestPostByLikes.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-pink-400 hover:underline flex items-center gap-0.5">
                                                        Ver <ExternalLink className="h-2.5 w-2.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Sortable posts table */}
                            <motion.div variants={item}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <BarChart2 className="h-3.5 w-3.5" /> Análise por Post
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground">Ordenar:</span>
                                        {(['reach', 'likes', 'saves', 'shares', 'date'] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setSortBy(s)}
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${sortBy === s
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    : 'border border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                {s === 'reach' ? 'Alcance' : s === 'likes' ? 'Likes' : s === 'saves' ? 'Saves' : s === 'shares' ? 'Shares' : 'Data'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-xl v2-glass overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[var(--v2-border)] bg-[var(--v2-bg-surface)]">
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Post</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                                                    <th className="text-right px-3 py-2 font-medium text-blue-400">Alcance</th>
                                                    <th className="text-right px-3 py-2 font-medium text-pink-400">Likes</th>
                                                    <th className="text-right px-3 py-2 font-medium text-slate-400">Coment.</th>
                                                    <th className="text-right px-3 py-2 font-medium text-amber-400">Saves</th>
                                                    <th className="text-right px-3 py-2 font-medium text-emerald-400">Shares</th>
                                                    <th className="text-right px-3 py-2 font-medium text-purple-400">Tx. Eng.</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedPosts.map((post, idx) => {
                                                    const engRate = (post.reach ?? 0) > 0
                                                        ? ((post.likesCount + post.commentsCount) / post.reach!) * 100
                                                        : 0;
                                                    return (
                                                        <tr key={post.id} className="border-b border-[var(--v2-border)]/50 hover:bg-[var(--v2-accent)]/5 transition-colors">
                                                            <td className="px-3 py-2.5 text-muted-foreground/50 font-mono">{idx + 1}</td>
                                                            <td className="px-3 py-2.5 max-w-[200px]">
                                                                <div className="flex items-center gap-2">
                                                                    <TypeIcon type={post.type} />
                                                                    <span className="truncate text-muted-foreground">
                                                                        {post.caption?.slice(0, 60) || '(sem legenda)'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                                                                {post.timestamp ? format(parseISO(post.timestamp), 'dd/MM/yy', { locale: ptBR }) : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-medium text-blue-400">{fmt(post.reach ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-pink-400">{fmt(post.likesCount)}</td>
                                                            <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(post.commentsCount)}</td>
                                                            <td className="px-3 py-2.5 text-right text-amber-400">{fmt(post.saved ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-emerald-400">{fmt(post.shares ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-purple-400">{engRate > 0 ? `${engRate.toFixed(1)}%` : '—'}</td>
                                                            <td className="px-3 py-2.5">
                                                                {post.url && (
                                                                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                                                                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <p className="mt-2 text-[10px] text-muted-foreground/50 text-right">
                                    {sortedPosts.length} posts · Dados via Meta Graph API
                                </p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ── TAB: Gráficos ── */}
                    {activeTab === 'charts' && (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                            <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                    Alcance + Saves + Shares ao longo do tempo
                                </h4>
                                <MetaTimelineChart posts={posts} />
                            </motion.div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                    <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                        Desempenho por Tipo de Conteúdo
                                    </h4>
                                    <MetaContentTypeChart posts={posts} />
                                </motion.div>

                                <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                    <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                        Alcance Médio por Dia da Semana
                                    </h4>
                                    <MetaPostingDayChart posts={posts} />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── TAB: Melhores Posts ── */}
                    {activeTab === 'posts' && (
                        <motion.div variants={item}>
                            <div className="rounded-xl v2-glass v2-glass-hover p-4">
                                <MetaTopPosts posts={posts} />
                            </div>
                        </motion.div>
                    )}

                    {/* ── TAB: Hashtags ── */}
                    {activeTab === 'hashtags' && (
                        <motion.div variants={item}>
                            <div className="rounded-xl v2-glass v2-glass-hover p-4">
                                <MetaHashtagAnalysis posts={posts} />
                            </div>
                        </motion.div>
                    )}

                    {/* ── TAB: Estratégia IA ── */}
                    {activeTab === 'strategy' && (
                        <motion.div variants={item}>
                            <MetaAiStrategy
                                posts={posts}
                                summary={{ avgReach: summary.avgReach, avgEngagementRate: summary.avgEngagementRate }}
                            />
                        </motion.div>
                    )}
                </>
            )}
        </motion.div>
    );
}
