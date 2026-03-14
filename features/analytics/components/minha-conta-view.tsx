'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/design-system/atoms/Button';
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
import { MetaKpiCards } from './kpi-cards';
import { MetaAccountTrends } from './meta-account-trends';
import { MetaFollowerGrowth } from './meta-follower-growth';
import { MetaAudienceDemographics } from './meta-audience-demographics';
import { MetaBestHourChart } from './meta-best-hour-chart';
import { MetaReelsChart } from './meta-reels-chart';
import { MetaPublishForm } from './meta-publish-form';
import { MetaDiscoveryCard } from './meta-discovery-card';
import { FeedPreviewTab } from './feed-preview-tab';
import { periodComparison, engagementScore, performanceBadge, metricSummary, hookQualityScore, persuasionTriggerCount } from '@/lib/utils/statistics';

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
    // BUG FIX: incluir saves e shares no cálculo de engagement rate (fórmula completa e consistente)
    const avgEngagementRate =
        postsWithReach.length > 0
            ? Math.round(
                (postsWithReach.reduce((s, p) => s + ((p.likesCount + p.commentsCount + (p.saved ?? 0) + (p.shares ?? 0)) / p.reach!) * 100, 0) /
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
    if (type === 'Video') return <span className="font-mono text-xs text-purple-400">▶</span>;
    if (type === 'Sidecar') return <span className="font-mono text-xs text-blue-400">⊞</span>;
    return <span className="font-mono text-xs text-emerald-400">◫</span>;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

type InternalTab = 'overview' | 'charts' | 'posts' | 'hashtags' | 'strategy' | 'audience' | 'competitors' | 'publish' | 'feed-preview';

const INTERNAL_TABS: { key: InternalTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Visão Geral', icon: '↗' },
    { key: 'charts', label: 'Gráficos', icon: '◎' },
    { key: 'posts', label: 'Melhores Posts', icon: '◎' },
    { key: 'hashtags', label: 'Hashtags', icon: '#' },
    { key: 'strategy', label: 'Estratégia IA', icon: '◆' },
    { key: 'audience', label: 'Audiência', icon: '◎' },
    { key: 'competitors', label: 'Concorrentes', icon: '◎' },
    { key: 'publish', label: 'Publicar', icon: '↗' },
    { key: 'feed-preview', label: 'Feed Preview', icon: '◫' },
];

interface AccountOption {
    id: string;
    username: string;
    name: string | null;
    picture: string | null;
    oauthToken: string;
}

interface Props {
    token: string;
    username?: string;
    allAccounts?: AccountOption[];
}

export function MinhaContaView({ token: initialToken, username: initialUsername, allAccounts }: Props) {
    const [activeAccountIdx, setActiveAccountIdx] = useState(0);

    // Se temos múltiplas contas, usar a conta selecionada
    const hasMultipleAccounts = (allAccounts?.length ?? 0) > 1;
    const selectedAccount = allAccounts?.[activeAccountIdx];
    const token = selectedAccount?.oauthToken ?? initialToken;
    const username = selectedAccount?.username ?? initialUsername;
    const [posts, setPosts] = useState<MetaPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCache, setIsLoadingCache] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [isFromCache, setIsFromCache] = useState(false);
    const [activeTab, setActiveTab] = useState<InternalTab>('overview');
    const [sortBy, setSortBy] = useState<'reach' | 'likes' | 'saves' | 'shares' | 'date'>('reach');

    const [accountProfile, setAccountProfile] = useState<{
        followersCount?: number;
        name?: string;
        biography?: string;
        picture?: string;
        follows_count?: number;
        mediaCount?: number;
        website?: string;
    } | undefined>();
    const [insightsData, setInsightsData] = useState<{ accountInsights: any[], demographics: any } | null>(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

    // Concorrentes (Business Discovery)
    const [competitorUsername, setCompetitorUsername] = useState('');
    const [competitorData, setCompetitorData] = useState<{ profile: any; posts: any[]; fetchedAt: string } | null>(null);
    const [isLoadingCompetitor, setIsLoadingCompetitor] = useState(false);
    const [competitorError, setCompetitorError] = useState<string | null>(null);

    // Reset dados quando troca de conta
    const handleSwitchAccount = (idx: number) => {
        if (idx === activeAccountIdx) return;
        setActiveAccountIdx(idx);
        setPosts([]);
        setFetchedAt(null);
        setIsFromCache(false);
        setError(null);
        setAccountProfile(undefined);
        setInsightsData(null);
        setCompetitorData(null);
        setCompetitorError(null);
        setIsLoadingCache(true);
    };

    // BUG FIX: Fetch Insights when Audience OR Strategy tab is active (ambas usam esses dados)
    useEffect(() => {
        if ((activeTab === 'audience' || activeTab === 'strategy') && !insightsData && !isLoadingInsights && token) {
            setIsLoadingInsights(true);
            fetch('/api/meta-account-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, days: 30 })
            })
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setInsightsData({ accountInsights: json.accountInsights, demographics: json.demographics });
                }
            })
            .catch(console.error)
            .finally(() => setIsLoadingInsights(false));
        }
    }, [activeTab, insightsData, isLoadingInsights, token]);

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
        
        // Fetch Account fields from the database
        import('@/app/actions/account.actions').then(({ getAccountByUsernameAction }) => {
            getAccountByUsernameAction(username).then((acc) => {
                if (acc) setAccountProfile(acc);
            });
        }).catch(console.error);
    }, [username]);

    const hasFetched = posts.length > 0;
    const summary = hasFetched ? computeMetaSummary(posts) : null;

    const handleFetchCompetitor = async () => {
        if (!competitorUsername.trim()) return;
        // Não faz sentido buscar a própria conta aqui
        if (username && competitorUsername.trim().toLowerCase() === username.toLowerCase()) {
            setCompetitorError('Não é possível buscar sua própria conta. Use a aba "Visão Geral" para ver seus dados.');
            return;
        }
        setIsLoadingCompetitor(true);
        setCompetitorError(null);
        try {
            const handle = competitorUsername.trim().replace('@', '');
            // Usa Apify (scraping público) — funciona para qualquer conta pública
            const res = await fetch('/api/apify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileUrls: [`https://www.instagram.com/${handle}/`],
                    resultsLimit: 25,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                setCompetitorError(json.error ?? 'Erro ao buscar perfil. Verifique se a conta existe e é pública.');
                return;
            }
            const posts: any[] = json.data ?? [];
            if (posts.length === 0) {
                setCompetitorError('Nenhum post encontrado. A conta pode ser privada ou não existir.');
                return;
            }
            const firstPost = posts[0];
            setCompetitorData({
                profile: {
                    handle: firstPost.ownerUsername ?? handle,
                    name: undefined,
                    biography: undefined,
                    followersCount: 0,
                    followsCount: 0,
                    mediaCount: posts.length,
                    avatarUrl: firstPost.ownerProfilePicUrl,
                },
                posts: posts.map((p: any) => ({
                    id: p.id ?? p.shortCode,
                    caption: p.caption,
                    type: p.type,
                    likesCount: p.likesCount ?? 0,
                    commentsCount: p.commentsCount ?? 0,
                    timestamp: p.timestamp,
                    url: p.url ?? `https://instagram.com/p/${p.shortCode}/`,
                    thumbnailUrl: p.displayUrl,
                })),
                fetchedAt: new Date().toISOString(),
            });
        } catch (e: any) {
            setCompetitorError(e.message ?? 'Erro de rede.');
        } finally {
            setIsLoadingCompetitor(false);
        }
    };

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
            // Atualiza perfil com dados frescos da API (seguidores, bio, foto, etc.)
            if (json.followersCount != null || json.name || json.biography) {
                setAccountProfile(prev => ({
                    ...prev,
                    followersCount: json.followersCount ?? prev?.followersCount,
                    name: json.name ?? prev?.name,
                    biography: json.biography ?? prev?.biography,
                    picture: json.profilePictureUrl ?? prev?.picture,
                    follows_count: json.followsCount ?? prev?.follows_count,
                    mediaCount: json.mediaCount ?? prev?.mediaCount,
                    website: json.website ?? prev?.website,
                }));
                // Persiste no banco para não resetar no F5
                if (username) {
                    import('@/app/actions/account.actions').then(({ updateAccountMetaProfileAction }) => {
                        updateAccountMetaProfileAction(username, {
                            followersCount: json.followersCount,
                            name: json.name,
                            biography: json.biography,
                            profilePictureUrl: json.profilePictureUrl,
                            followsCount: json.followsCount,
                            mediaCount: json.mediaCount,
                            website: json.website,
                        }).catch(console.error);
                    });
                }
            }
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-[var(--v2-accent)]">◆</span>
                            {hasMultipleAccounts ? (
                                <select
                                    value={activeAccountIdx}
                                    onChange={(e) => handleSwitchAccount(Number(e.target.value))}
                                    className="bg-transparent border border-zinc-700 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--v2-text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--v2-accent)]"
                                >
                                    {allAccounts!.map((acc, idx) => (
                                        <option key={acc.id} value={idx} className="bg-zinc-900 text-white">
                                            @{acc.username}{acc.name ? ` (${acc.name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="font-semibold text-sm text-[var(--v2-text-primary)]">
                                    {username ? `@${username}` : 'Sua Conta'}
                                </span>
                            )}
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
                            <><span className="mr-2 font-mono text-xs animate-spin">◷</span> Buscando...</>
                        ) : hasFetched ? (
                            <><span className="mr-2 font-mono text-xs text-sm">↻</span> Atualizar</>
                        ) : (
                            <><span className="mr-2 font-mono text-xs text-sm">◆</span> Buscar Métricas Privadas</>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div variants={item} className="flex items-start gap-2 rounded-xl border border-[var(--v2-danger)]/20 bg-[var(--v2-danger)]/5 p-4">
                    <span className="font-mono text-sm text-destructive mt-0.5 shrink-0">!</span>
                    <p className="text-sm text-destructive">{error}</p>
                </motion.div>
            )}

            {/* Loading cache */}
            {!hasFetched && !isLoading && !error && isLoadingCache && (
                <motion.div variants={item} className="rounded-xl v2-glass border border-dashed border-[var(--v2-border)] p-10 text-center">
                    <span className="block font-mono text-xl text-[var(--v2-text-tertiary)] mx-auto mb-3 animate-spin">◷</span>
                    <p className="text-sm text-muted-foreground">Verificando dados salvos...</p>
                </motion.div>
            )}

            {/* Empty state (nenhum cache encontrado) */}
            {!hasFetched && !isLoading && !error && !isLoadingCache && (
                <motion.div variants={item} className="rounded-xl v2-glass border border-dashed border-[var(--v2-border)] p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--v2-accent)]/10">
                        <span className="font-mono text-2xl text-[var(--v2-accent)]">◆</span>
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
                                <span className={`font-mono text-xs leading-none ${activeTab === t.key && t.key === 'strategy' ? 'text-purple-400' : ''}`}>{t.icon}</span>
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
                                <MetaKpiCards posts={posts} accountProfile={accountProfile} />
                            </motion.div>

                            {/* Breakdown by type */}
                            <motion.div variants={item} className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Alcance Médio — Foto', value: fmt(summary.avgReachImage), count: summary.imageCount, color: 'text-emerald-400', glyph: '◫' },
                                    { label: 'Alcance Médio — Vídeo', value: fmt(summary.avgReachVideo), count: summary.videoCount, color: 'text-purple-400', glyph: '▶' },
                                    { label: 'Alcance Médio — Carrossel', value: fmt(summary.avgReachCarousel), count: summary.carouselCount, color: 'text-blue-400', glyph: '⊞' },
                                ].map((row) => (
                                    <div key={row.label} className="rounded-xl v2-glass v2-glass-hover p-3 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/50 shrink-0">
                                            <span className={`font-mono text-base ${row.color}`}>{row.glyph}</span>
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
                                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1.5 font-mono">
                                                <span>◎</span> Maior Alcance
                                            </div>
                                            <p className="text-sm line-clamp-2 mb-2">{summary.bestPostByReach.caption || '(sem legenda)'}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                                                    <span>◎ {fmt(summary.bestPostByReach.reach ?? 0)}</span>
                                                    <span>▲ {fmt(summary.bestPostByReach.likesCount)}</span>
                                                </div>
                                                {summary.bestPostByReach.url && (
                                                    <a href={summary.bestPostByReach.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 font-mono">
                                                        Ver ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {summary.bestPostByLikes && (
                                        <div className="rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 to-orange-500/5 backdrop-blur-sm p-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-pink-400 mb-1.5 font-mono">
                                                <span>▲</span> Mais Curtido
                                            </div>
                                            <p className="text-sm line-clamp-2 mb-2">{summary.bestPostByLikes.caption || '(sem legenda)'}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                                                    <span>▲ {fmt(summary.bestPostByLikes.likesCount)}</span>
                                                    <span>◎ {fmt(summary.bestPostByLikes.reach ?? 0)}</span>
                                                </div>
                                                {summary.bestPostByLikes.url && (
                                                    <a href={summary.bestPostByLikes.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-pink-400 hover:underline flex items-center gap-0.5 font-mono">
                                                        Ver ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ─── Indicadores Avançados (Meta-exclusivos) ─── */}
                            <motion.div variants={item} className="space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                    <span>◎</span> Indicadores Avançados
                                </h3>
                                {(() => {
                                    const metaPosts = posts.filter(p => (p as any).reach > 0);
                                    if (metaPosts.length < 3) return <p className="text-xs text-muted-foreground">Mínimo 3 posts com dados Meta para análise.</p>;

                                    const reaches = metaPosts.map(p => (p as any).reach as number);
                                    const saves = metaPosts.map(p => (p as any).saved as number ?? 0);
                                    const shares = metaPosts.map(p => (p as any).shares as number ?? 0);

                                    // Period comparison
                                    const mid = Math.floor(reaches.length / 2);
                                    const reachComp = periodComparison(reaches.slice(mid), reaches.slice(0, mid));

                                    // Type efficiency
                                    const typeMap: Record<string, { saves: number; shares: number; reach: number; count: number }> = {};
                                    metaPosts.forEach(p => {
                                        const type = p.type === 'Video' ? 'Reels' : p.type === 'Sidecar' ? 'Carrossel' : 'Imagem';
                                        if (!typeMap[type]) typeMap[type] = { saves: 0, shares: 0, reach: 0, count: 0 };
                                        typeMap[type].saves += (p as any).saved ?? 0;
                                        typeMap[type].shares += (p as any).shares ?? 0;
                                        typeMap[type].reach += (p as any).reach ?? 0;
                                        typeMap[type].count++;
                                    });

                                    // Top 5 by depth score
                                    const scored = metaPosts.map(p => ({
                                        post: p,
                                        score: engagementScore({ likes: p.likesCount, comments: p.commentsCount, views: p.videoViewCount ?? 0, saves: (p as any).saved ?? 0, shares: (p as any).shares ?? 0 }),
                                    })).sort((a, b) => b.score - a.score);
                                    const allScores = scored.map(s => s.score);

                                    // Metric summaries
                                    const reachSummary = metricSummary(reaches, 'Alcance');
                                    const saveSummary = metricSummary(saves, 'Saves');

                                    const SIG_LABELS: Record<string, string> = { significant: 'Significativo', marginal: 'Marginal', negligible: 'Negligível' };
                                    const SIG_COLORS: Record<string, string> = { significant: '#10b981', marginal: '#f59e0b', negligible: '#6b7280' };

                                    return (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {/* Period Comparison */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-green-400">↗</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Evolução do Alcance</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-2xl font-mono font-bold ${reachComp.direction === 'up' ? 'text-green-400' : reachComp.direction === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}>
                                                        {reachComp.direction === 'up' ? '+' : ''}{Math.round(reachComp.changePercent)}%
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: SIG_COLORS[reachComp.significance] + '20', color: SIG_COLORS[reachComp.significance] }}>
                                                        {SIG_LABELS[reachComp.significance]}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">Recente: {fmt(Math.round(reachComp.currentAvg))} | Anterior: {fmt(Math.round(reachComp.previousAvg))}</p>
                                            </div>

                                            {/* Type Efficiency */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-amber-400">⊞</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Eficiência por Tipo</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {Object.entries(typeMap).map(([type, d]) => (
                                                        <div key={type} className="flex items-center justify-between text-[11px]">
                                                            <span className="text-muted-foreground">{type} ({d.count})</span>
                                                            <div className="flex gap-3 text-[10px] font-mono">
                                                                <span title="Save Rate">◆ {d.reach > 0 ? ((d.saves / d.reach) * 100).toFixed(1) : '0'}%</span>
                                                                <span title="Share Rate">↗ {d.reach > 0 ? ((d.shares / d.reach) * 100).toFixed(1) : '0'}%</span>
                                                                <span title="Alcance Médio">◎ {fmt(Math.round(d.reach / d.count))}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Top 5 Depth Score */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-rose-400">◎</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Top 5 — Depth Score</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {scored.slice(0, 5).map((s, i) => {
                                                        const badge = performanceBadge(s.score, allScores);
                                                        return (
                                                            <div key={s.post.id} className="flex items-center gap-2 text-[11px]">
                                                                <span className="font-mono text-muted-foreground w-4">{i + 1}</span>
                                                                <span className="truncate flex-1" title={s.post.caption}>{s.post.caption?.slice(0, 40) || '(sem legenda)'}</span>
                                                                <span className="font-mono font-bold">{s.score}</span>
                                                                <span className={`text-[9px] ${badge.color}`}>{badge.emoji}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Metric Summaries */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-blue-400">◎</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Resumo de Métricas</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {[reachSummary, saveSummary].map((ms) => (
                                                        <div key={ms.insight.slice(0, 20)} className="text-[10px]">
                                                            <p className="text-muted-foreground leading-relaxed">{ms.insight}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Value Per Follower (Meta-exclusivo) */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-violet-400">◎</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Value Per Follower</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 ml-auto font-mono uppercase">Meta Only</span>
                                                </div>
                                                {(() => {
                                                    const totalSavesVPF = metaPosts.reduce((s, p) => s + ((p as any).saved ?? 0), 0);
                                                    const totalSharesVPF = metaPosts.reduce((s, p) => s + ((p as any).shares ?? 0), 0);
                                                    const vpf = totalSavesVPF + totalSharesVPF;
                                                    return (
                                                        <div>
                                                            <p className="text-2xl font-mono font-bold text-violet-400">{fmt(vpf)}</p>
                                                            <p className="text-[10px] text-muted-foreground">saves ({fmt(totalSavesVPF)}) + shares ({fmt(totalSharesVPF)}) = ações de alto valor</p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Persuasion Triggers Summary (Meta-exclusivo) */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-amber-400">◆</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Gatilhos de Persuasão</span>
                                                </div>
                                                {(() => {
                                                    let urgTotal = 0, authTotal = 0, scarTotal = 0, postsWithTriggers = 0;
                                                    for (const p of metaPosts) {
                                                        const result = persuasionTriggerCount(p.caption ?? '');
                                                        if (result.hasPersuasion) postsWithTriggers++;
                                                        urgTotal += result.urgency;
                                                        authTotal += result.authority;
                                                        scarTotal += result.scarcity;
                                                    }
                                                    return (
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-muted-foreground">Urgência</span>
                                                                <span className="font-mono font-bold">{urgTotal}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-muted-foreground">Autoridade</span>
                                                                <span className="font-mono font-bold">{authTotal}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-muted-foreground">Escassez</span>
                                                                <span className="font-mono font-bold">{scarTotal}</span>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground mt-1">{postsWithTriggers} de {metaPosts.length} posts usam gatilhos</p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Hook Quality (Meta-exclusivo) */}
                                            <div className="rounded-xl v2-glass p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-mono text-xs text-sky-400">◆</span>
                                                    <span className="text-xs font-semibold uppercase tracking-tight">Hook Quality</span>
                                                </div>
                                                {(() => {
                                                    const hq = hookQualityScore(
                                                        metaPosts.map(p => ({ caption: p.caption ?? '', engagement: p.likesCount + p.commentsCount }))
                                                    );
                                                    return (
                                                        <div>
                                                            <div className="flex items-baseline gap-2 mb-2">
                                                                <span className="text-2xl font-mono font-bold text-sky-400">{hq.score}/100</span>
                                                                <span className="text-[10px] text-muted-foreground">Melhor: {hq.bestHookType}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {hq.hookTypes.slice(0, 4).map(h => (
                                                                    <div key={h.type} className="flex justify-between text-[10px]">
                                                                        <span className={h.type === hq.bestHookType ? 'text-sky-400' : 'text-muted-foreground'}>{h.type}</span>
                                                                        <span className="font-mono">{fmt(h.avgEngagement)} eng ({h.count})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </motion.div>

                            {/* Sortable posts table */}
                            <motion.div variants={item}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                        <span>◎</span> Análise por Post
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground">Ordenar:</span>
                                        {(['reach', 'likes', 'saves', 'shares', 'date'] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setSortBy(s)}
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-all ${sortBy === s
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
                                                    <th className="text-right px-3 py-2 font-mono text-blue-400 uppercase tracking-tighter">Alcance</th>
                                                    <th className="text-right px-3 py-2 font-mono text-pink-400 uppercase tracking-tighter">Likes</th>
                                                    <th className="text-right px-3 py-2 font-mono text-slate-400 uppercase tracking-tighter">Coment.</th>
                                                    <th className="text-right px-3 py-2 font-mono text-amber-400 uppercase tracking-tighter">Saves</th>
                                                    <th className="text-right px-3 py-2 font-mono text-emerald-400 uppercase tracking-tighter">Shares</th>
                                                    <th className="text-right px-3 py-2 font-mono text-purple-400 uppercase tracking-tighter">Tx. Eng.</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedPosts.map((post, idx) => {
                                                    // BUG FIX: incluir saves e shares (fórmula consistente)
                                                    const engRate = (post.reach ?? 0) > 0
                                                        ? ((post.likesCount + post.commentsCount + (post.saved ?? 0) + (post.shares ?? 0)) / post.reach!) * 100
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
                                                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap font-mono text-[10px] uppercase">
                                                                {post.timestamp ? format(parseISO(post.timestamp), 'dd/MM/yy', { locale: ptBR }) : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-bold text-blue-400 font-mono">{fmt(post.reach ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-pink-400 font-mono">{fmt(post.likesCount)}</td>
                                                            <td className="px-3 py-2.5 text-right text-muted-foreground font-mono">{fmt(post.commentsCount)}</td>
                                                            <td className="px-3 py-2.5 text-right text-amber-400 font-mono">{fmt(post.saved ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">{fmt(post.shares ?? 0)}</td>
                                                            <td className="px-3 py-2.5 text-right text-purple-400 font-mono">{engRate > 0 ? `${engRate.toFixed(1)}%` : '—'}</td>
                                                            <td className="px-3 py-2.5">
                                                                {post.url && (
                                                                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                                                                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors font-mono text-[10px]">
                                                                        ↗
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
                            <motion.div variants={item} className="rounded-[8px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                                <MetaTimelineChart posts={posts} />
                            </motion.div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <motion.div variants={item} className="rounded-[8px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                                    <MetaContentTypeChart posts={posts} />
                                </motion.div>

                                <motion.div variants={item} className="rounded-[8px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                                    <MetaPostingDayChart posts={posts} />
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <motion.div variants={item} className="rounded-[8px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                                    <MetaBestHourChart posts={posts as any[]} />
                                </motion.div>

                                <motion.div variants={item} className="rounded-[8px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                                    <MetaReelsChart posts={posts as any[]} />
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
                                summary={{ avgReach: summary!.avgReach, avgEngagementRate: summary!.avgEngagementRate }}
                                accountInsights={insightsData?.accountInsights}
                                demographics={insightsData?.demographics}
                            />
                        </motion.div>
                    )}

                    {/* ── TAB: Concorrentes ── */}
                    {activeTab === 'competitors' && (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
                            <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-3">
                                    Análise de Concorrentes — Perfis Públicos
                                </h4>
                                <p className="text-xs text-[var(--v2-text-tertiary)] mb-4">
                                    Busque posts públicos de qualquer conta do Instagram. Funciona para contas pessoais, business e creator.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="@usuario ou usuario"
                                        value={competitorUsername}
                                        onChange={(e) => setCompetitorUsername(e.target.value.replace('@', ''))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && competitorUsername.trim() && !isLoadingCompetitor) {
                                                handleFetchCompetitor();
                                            }
                                        }}
                                        className="flex-1 bg-[var(--v2-bg-surface)] border border-[var(--v2-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--v2-accent)]/50"
                                    />
                                    <Button
                                        onClick={handleFetchCompetitor}
                                        disabled={isLoadingCompetitor || !competitorUsername.trim()}
                                        size="sm"
                                        className="bg-[var(--v2-accent)] hover:bg-[var(--v2-accent-hover)] text-white shrink-0 font-mono uppercase text-xs"
                                    >
                                        {isLoadingCompetitor ? (
                                            <><span className="mr-2 animate-spin text-sm">◷</span> Buscando...</>
                                        ) : (
                                            <><span className="mr-2 text-sm">◎</span> Buscar</>
                                        )}
                                    </Button>
                                </div>
                                {competitorError && (
                                    <p className="mt-2 text-xs text-destructive flex items-center gap-1.5 font-mono uppercase">
                                        <span>!</span> {competitorError}
                                    </p>
                                )}
                            </motion.div>

                            {competitorData && (
                                <motion.div variants={item}>
                                    <MetaDiscoveryCard
                                        profile={competitorData.profile}
                                        posts={competitorData.posts}
                                        fetchedAt={competitorData.fetchedAt}
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── TAB: Publicar ── */}
                    {activeTab === 'publish' && (
                        <motion.div variants={item}>
                            <MetaPublishForm />
                        </motion.div>
                    )}

                    {/* ── TAB: Audiência ── */}
                    {activeTab === 'audience' && (
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                            {isLoadingInsights ? (
                                <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 v2-glass">
                                    <span className="block font-mono text-xl text-[var(--v2-text-tertiary)] mx-auto mb-3 animate-spin">◷</span>
                                    <p className="text-sm text-muted-foreground font-mono uppercase">Buscando métricas demográficas...</p>
                                </div>
                            ) : insightsData ? (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                            <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                                Tendência da Conta (30 dias)
                                            </h4>
                                            <MetaAccountTrends data={insightsData.accountInsights} />
                                        </motion.div>
                                        <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                            <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                                Crescimento
                                            </h4>
                                            <MetaFollowerGrowth data={insightsData.accountInsights} />
                                        </motion.div>
                                    </div>
                                    <motion.div variants={item} className="rounded-xl v2-glass v2-glass-hover p-4">
                                        <h4 className="text-xs font-semibold text-[var(--v2-text-secondary)] uppercase tracking-wider mb-4">
                                            Demografia
                                        </h4>
                                        <MetaAudienceDemographics 
                                            demographics={insightsData.demographics} 
                                            followersCount={accountProfile?.followersCount} 
                                        />
                                    </motion.div>
                                </>
                            ) : (
                                <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 v2-glass">
                                    <span className="block font-mono text-xl text-destructive mx-auto mb-3">!</span>
                                    <p className="text-sm text-muted-foreground font-mono uppercase">Não foi possível carregar os dados de audiência.</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── TAB: Feed Preview ── */}
                    {activeTab === 'feed-preview' && (
                        <FeedPreviewTab
                            posts={posts}
                            account={{
                                username: username ?? '',
                                name: accountProfile?.name,
                                biography: accountProfile?.biography,
                                picture: accountProfile?.picture,
                                followers_count: accountProfile?.followersCount,
                                follows_count: accountProfile?.follows_count,
                                media_count: accountProfile?.mediaCount ?? posts.length,
                                website: accountProfile?.website,
                            }}
                            avgEngagement={summary?.avgEngagementRate ?? 0}
                        />
                    )}
                </>
            )}
        </motion.div>
    );
}
