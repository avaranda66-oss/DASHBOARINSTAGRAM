'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, AlertCircle, RefreshCw, TrendingUp,
    Users, Swords, Plus, X, GitCompare, Filter, Zap, ShieldCheck,
} from 'lucide-react';

import { nanoid } from 'nanoid';
import { useAnalytics } from '@/features/analytics/hooks/use-analytics';
import { AnalyticsSearch } from '@/features/analytics/components/analytics-search';
import { MetaKpiCards } from '@/features/analytics/components/kpi-cards';
import { ApifyStatsPanel } from '@/features/analytics/components/apify-stats-panel';
import { PostCards } from '@/features/analytics/components/post-cards';
import { AnalyticsSkeleton } from '@/features/analytics/components/analytics-skeleton';
import { InsightsPanel } from '@/features/analytics/components/insights-panel';
import { TopEngagers } from '@/features/analytics/components/top-engagers';
import { ComparisonView, computeSummary } from '@/features/analytics/components/comparison-view';
import type { ProfileData } from '@/features/analytics/components/comparison-view';
import { CommentsAnalysis } from '@/features/analytics/components/comments-analysis';
import { EngagementHeatmap } from '@/features/analytics/components/engagement-heatmap';
import { AlertAnomalyPanel } from '@/features/analytics/components/alert-anomaly-panel';
import { ContentCalendar } from '@/features/analytics/components/content-calendar';
import { BuyingIntentFeed } from '@/features/analytics/components/buying-intent-feed';
import { IntelligencePanel } from '@/features/analytics/components/intelligence-panel';
import { FunnelChart } from '@/features/analytics/components/funnel-chart';
import { CarouselSlideAnalysis } from '@/features/analytics/components/carousel-slide-analysis';
import { ExportReport } from '@/features/analytics/components/export-report';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { useAccountStore, useSettingsStore, useAnalyticsStore } from '@/stores';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCompetitorsAction, saveCompetitorAction, deleteCompetitorAction } from '@/app/actions/competitor.actions';
import { getAnalyticsAction, getMetaAnalyticsAction, saveMetaAnalyticsAction } from '@/app/actions/analytics.actions';
import type { CompetitorProfile } from '@/types/competitor';
import type { InstagramPostMetrics, PostComment } from '@/types/analytics';
import { MinhaContaView } from '@/features/analytics/components/minha-conta-view';
import { MetaDiscoveryCard } from '@/features/analytics/components/meta-discovery-card';

type ViewMode = 'individual' | 'vs' | 'minha-conta';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AnalyticsPage() {
    const {
        posts, filteredPosts, summary, isLoading, error, hasData, isEmpty,
        lastFetchedAt, profileUrl, fetchMetrics, fetchAndMerge, clearMetrics, loadFromCache,
        filterPeriod, setFilterPeriod, avatarUrl: currentAvatarUrl,
        customDateRange, setCustomDateRange
    } = useAnalytics();

    const { accounts, isLoaded: accountsLoaded, loadAccounts } = useAccountStore();
    const settingsStore = useSettingsStore();

    const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
    const [showAddCompetitor, setShowAddCompetitor] = useState(false);
    const [newCompetitorHandle, setNewCompetitorHandle] = useState('');
    const [fixedInsights, setFixedInsights] = useState<string | null>(null);
    const [isLoadingFixed, setIsLoadingFixed] = useState(false);

    // Meta API state
    const [isLoadingMeta, setIsLoadingMeta] = useState(false);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [metaProfile, setMetaProfile] = useState<{ followersCount?: number; name?: string } | null>(null);
    const analyticsStore = useAnalyticsStore();

    // VS Mode state
    const [viewMode, setViewMode] = useState<ViewMode>('individual');
    const [vsClient, setVsClient] = useState<string | null>(null);
    const [vsCompetitors, setVsCompetitors] = useState<string[]>([]);
    const [vsData, setVsData] = useState<{ client: ProfileData; competitors: ProfileData[] } | null>(null);
    const [isLoadingVs, setIsLoadingVs] = useState(false);

    // Business Discovery state
    const [discoveryHandle, setDiscoveryHandle] = useState('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryData, setDiscoveryData] = useState<{profile: any, posts: any[], fetchedAt: string} | null>(null);
    const [discoveryError, setDiscoveryError] = useState<string | null>(null);

    // Derive current competitor for avatar fallback
    const currentHandleForAvatar = profileUrl.trim().replace(/\/+$/, '').split('/').filter(Boolean).pop()?.replace(/^@/, '').toLowerCase();
    const currentComp = competitors.find(c => c.handle.toLowerCase() === currentHandleForAvatar);

    useEffect(() => { if (!accountsLoaded) loadAccounts(); }, [accountsLoaded, loadAccounts]);
    useEffect(() => { settingsStore.loadSettings(); }, []);
    useEffect(() => { getCompetitorsAction().then(setCompetitors); }, []);
    useEffect(() => { setFixedInsights(null); }, [posts]);

    // Token Meta: resolve dinamicamente baseado no perfil visualizado
    const allAccountsWithToken = accounts.filter(a => !!a.oauthToken);
    const currentOwner = posts[0]?.ownerUsername?.toLowerCase();
    // Tenta encontrar a conta com token que corresponde ao perfil atualmente visualizado
    const matchingAccount = currentOwner
        ? allAccountsWithToken.find(a => a.handle.replace('@', '').toLowerCase() === currentOwner)
        : null;
    // Fallback: primeira conta com token ou settings global
    const accountWithToken = matchingAccount || allAccountsWithToken[0] || null;
    const metaTokenResolved = matchingAccount?.oauthToken || settingsStore.settings?.metaAccessToken || accountWithToken?.oauthToken || null;
    const metaUsernameResolved = matchingAccount
        ? matchingAccount.handle.replace('@', '')
        : settingsStore.settings?.metaUsername || (accountWithToken ? accountWithToken.handle.replace('@', '') : null);
    const metaConnected = !!metaTokenResolved;
    const metaUsername = metaUsernameResolved;
    // Verifica se o perfil visualizado é uma das contas com token (para mostrar botão Enriquecer)
    const isViewingOwnAccount = currentOwner
        ? allAccountsWithToken.some(a => a.handle.replace('@', '').toLowerCase() === currentOwner)
        : false;

    // Carrega dados Meta do DB para não resetar no F5
    // + Limpa dados contaminados que foram salvos erroneamente com type='account'
    useEffect(() => {
        if (!metaUsername) return;
        // Carregar perfil (followers/nome)
        import('@/app/actions/account.actions').then(({ getAccountByUsernameAction }) => {
            getAccountByUsernameAction(metaUsername).then((acc) => {
                if (acc?.followersCount) {
                    setMetaProfile(prev => prev ?? { followersCount: acc.followersCount, name: acc.name });
                }
            }).catch(() => {});
        });
        // Carregar posts Meta do cache (type='meta') para o store — sobrevive ao F5
        getMetaAnalyticsAction(metaUsername).then((cached) => {
            if (cached && cached.posts.length > 0) {
                analyticsStore.setPostsFromMeta(cached.posts as any[], metaUsername);
            }
        }).catch(() => {});
        // Limpar dados contaminados
        import('@/app/actions/analytics.actions').then(({ cleanupMetaContaminationAction }) => {
            cleanupMetaContaminationAction(metaUsername).catch(() => {});
        });
    }, [metaUsername]);

    const handleFetchMeta = async () => {
        const token = metaTokenResolved;
        if (!token) {
            setMetaError('Configure o Token Meta na conta (Gerenciar Contas → Editar) ou em Configurações.');
            return;
        }
        setIsLoadingMeta(true);
        setMetaError(null);
        try {
            const res = await fetch('/api/meta-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, limit: 50 }),
            });
            const json = await res.json();
            if (!json.success) {
                setMetaError(json.error ?? 'Erro ao buscar dados Meta API.');
                return;
            }
            // Exibir dados Meta no Individual mode (in-memory, sem contaminar cache Apify)
            const metaUser = json.username ?? metaUsername ?? 'meta';
            analyticsStore.setPostsFromMeta(json.data, metaUser);
            // Persistir no cache Meta separado (type='meta'), sem tocar no cache Apify (type='account')
            saveMetaAnalyticsAction(metaUser, json.data).catch(console.error);

            // Buscar comentários via Meta API em background (não bloqueia o loading)
            // Enriquece os posts já exibidos com comentários frescos
            fetch('/api/meta-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })
                .then((r) => r.json())
                .then((commentsJson) => {
                    if (commentsJson.success && Array.isArray(commentsJson.data)) {
                        const commentMap = new Map<string, typeof commentsJson.data[0]>();
                        for (const entry of commentsJson.data) {
                            commentMap.set(entry.shortCode, entry);
                        }
                        // Atualizar posts no store com os comentários buscados
                        const currentPosts = useAnalyticsStore.getState().posts;
                        let updated = false;
                        const enrichedPosts = currentPosts.map((p: InstagramPostMetrics) => {
                            const match = commentMap.get(p.shortCode ?? '');
                            if (match && match.comments.length > 0) {
                                // Merge: manter comentários existentes + adicionar novos (dedup por id)
                                const existingIds = new Set((p.latestComments ?? []).map((c: PostComment) => c.id));
                                const newComments = match.comments.filter((c: PostComment) => !existingIds.has(c.id));
                                if (newComments.length > 0 || (p.latestComments ?? []).length === 0) {
                                    updated = true;
                                    return { ...p, latestComments: [...(p.latestComments ?? []), ...newComments] };
                                }
                            }
                            return p;
                        });
                        if (updated) {
                            analyticsStore.setPostsFromMeta(enrichedPosts, metaUser);
                            saveMetaAnalyticsAction(metaUser, enrichedPosts).catch(console.error);
                        }
                    }
                })
                .catch(() => {}); // Falha silenciosa — comentários do Apify já foram preservados pelo merge

            // Salvar followers/nome/bio/foto no perfil da conta
            if (json.followersCount != null || json.name || json.biography) {
                setMetaProfile({ followersCount: json.followersCount, name: json.name });
                if (metaUser) {
                    import('@/app/actions/account.actions').then(({ updateAccountMetaProfileAction }) => {
                        updateAccountMetaProfileAction(metaUser, {
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
        } catch (err: any) {
            setMetaError(err.message ?? 'Erro de rede ao chamar Meta API.');
        } finally {
            setIsLoadingMeta(false);
        }
    };

    const addCompetitor = useCallback(async () => {
        const handle = newCompetitorHandle.trim().replace(/^@/, '').replace(/\/+$/, '');
        if (!handle) return;
        let finalHandle = handle;
        try {
            const url = new URL(handle.startsWith('http') ? handle : `https://instagram.com/${handle}`);
            finalHandle = (url.pathname.split('/').filter(Boolean)[0] ?? handle).toLowerCase();
        } catch {
            finalHandle = handle.replace(/^@/, '').toLowerCase();
        }
        let finalAvatarUrl = undefined;
        try {
            const { refreshCompetitorAvatarAction } = await import('@/app/actions/competitor.actions');
            finalAvatarUrl = await refreshCompetitorAvatarAction(finalHandle) || undefined;
        } catch (e) { console.error("Erro ao auto-buscar foto do concorrente", e); }

        const profile: CompetitorProfile = {
            id: nanoid(12),
            handle: finalHandle,
            addedAt: new Date().toISOString(),
            avatarUrl: finalAvatarUrl
        };
        await saveCompetitorAction(profile);
        setCompetitors((prev) => [...prev, profile]);
        setNewCompetitorHandle('');
        setShowAddCompetitor(false);
    }, [newCompetitorHandle]);

    const removeCompetitor = useCallback(async (id: string) => {
        await deleteCompetitorAction(id);
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
    }, []);

    const handleProfileSelect = async (handle: string) => {
        const loaded = await loadFromCache(handle);
        if (!loaded) fetchMetrics(`https://www.instagram.com/${handle}/`, 40);
    };

    const handleSearch = async (url: string) => {
        let handle = url.trim().replace(/\/+$/, '');
        try {
            const parsed = new URL(handle.startsWith('http') ? handle : `https://instagram.com/${handle}`);
            handle = parsed.pathname.split('/').filter(Boolean)[0] ?? handle;
        } catch {
            handle = handle.replace(/^@/, '');
        }

        const hasCached = await loadFromCache(handle);
        if (hasCached) {
            console.log(`[Analytics] Cache encontrado para @${handle}. Atualizando apenas últimos 10 posts.`);
            await fetchAndMerge(`https://www.instagram.com/${handle}/`, 10);
        } else {
            console.log(`[Analytics] Nenhum cache para @${handle}. Buscando histórico (40 posts).`);
            await fetchMetrics(`https://www.instagram.com/${handle}/`, 40);
        }
    };

    const handleRefresh = async () => {
        if (!profileUrl) return;
        const handle = posts[0]?.ownerUsername;
        if (handle) {
            console.log(`[Analytics] Refresh manual para @${handle}. Buscando últimos 10.`);
            await fetchAndMerge(`https://www.instagram.com/${handle}/`, 10);
        } else {
            await fetchMetrics(profileUrl, 40);
        }
    };

    const loadFixedInsights = async () => {
        if (!posts.length || !summary) return;
        setIsLoadingFixed(true);
        try {
            const res = await fetch('/api/apify/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    posts: posts.slice(0, 30).map((p) => ({
                        type: p.type, caption: p.caption?.slice(0, 200),
                        hashtags: p.hashtags?.slice(0, 10), likesCount: p.likesCount,
                        commentsCount: p.commentsCount, videoViewCount: p.videoViewCount,
                        timestamp: p.timestamp,
                    })),
                    summary,
                }),
            });
            const json = await res.json();
            if (json.success) setFixedInsights(json.data);
        } catch { /* ignore */ }
        setIsLoadingFixed(false);
    };

    // VS Mode: toggle competitor selection
    const toggleVsCompetitor = (handle: string) => {
        setVsCompetitors((prev) =>
            prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle],
        );
    };

    // VS Mode: run comparison
    const runComparison = async () => {
        if (!vsClient || vsCompetitors.length === 0) return;
        setIsLoadingVs(true);
        setVsData(null);

        try {
            // Load data for each profile from cache
            const loadProfile = async (handle: string): Promise<ProfileData | null> => {
                const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();
                let cached = await getAnalyticsAction(cleanHandle, 'account');
                if (!cached) cached = await getAnalyticsAction(cleanHandle, 'competitor');

                if (cached && cached.posts.length > 0) {
                    return {
                        handle,
                        posts: cached.posts,
                        summary: computeSummary(cached.posts),
                        avatarUrl: cached.avatarUrl
                    };
                }
                return null;
            };

            const clientData = await loadProfile(vsClient);
            if (!clientData) {
                // Need to fetch first
                setIsLoadingVs(false);
                alert(`Dados de @${vsClient} não estão em cache. Busque os dados primeiro clicando no perfil.`);
                return;
            }

            const compDataPromises = vsCompetitors.map(loadProfile);
            const compResults = await Promise.all(compDataPromises);
            const validComps = compResults.filter(Boolean) as ProfileData[];

            if (validComps.length === 0) {
                setIsLoadingVs(false);
                alert('Nenhum concorrente tem dados em cache. Busque os dados primeiro clicando nos perfis.');
                return;
            }

            setVsData({
                client: { ...clientData, isClient: true },
                competitors: validComps
            });
        } catch {
            alert('Erro ao carregar dados para comparação.');
        }
        setIsLoadingVs(false);
    };

    const handleDiscovery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!discoveryHandle.trim()) return;
        const metaToken = metaTokenResolved;
        if (!metaToken) {
            setDiscoveryError("Token Meta não encontrado. Configure na conta (Gerenciar Contas → Editar) ou em Configurações.");
            return;
        }

        setIsDiscovering(true);
        setDiscoveryError(null);
        setDiscoveryData(null);

        let clean = discoveryHandle.trim().replace(/^@/, '');
        try {
            const parsed = new URL(clean.startsWith('http') ? clean : `https://instagram.com/${clean}`);
            clean = parsed.pathname.split('/').filter(Boolean)[0] ?? clean;
        } catch { /* ignore */ }

        try {
            const res = await fetch('/api/meta-discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: metaToken, targetUsername: clean })
            });
            const data = await res.json();
            if (!data.success) {
                setDiscoveryError(data.error);
            } else {
                setDiscoveryData(data);
                setDiscoveryHandle('');
            }
        } catch (e: any) {
            setDiscoveryError(e.message || "Erro de rede na busca.");
        } finally {
            setIsDiscovering(false);
        }
    };

    // All available handles for VS selection
    const allHandles = [
        ...accounts.map((a) => ({ handle: a.handle.replace(/^@/, ''), type: 'client' as const })),
        ...competitors.map((c) => ({ handle: c.handle, type: 'competitor' as const })),
    ];

    return (
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Header */}
            <motion.div variants={item}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg instagram-gradient">
                            <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Métricas</h2>
                            <p className="text-sm text-muted-foreground">
                                {viewMode === 'individual'
                                    ? 'Analise posts de clientes e concorrentes'
                                    : 'Compare seu cliente com concorrentes'}
                            </p>
                        </div>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('individual')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'individual'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Individual
                        </button>
                        <button
                            onClick={() => setViewMode('vs')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'vs'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <GitCompare className="h-3 w-3" /> VS
                        </button>
                        <button
                            onClick={() => setViewMode('minha-conta')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === 'minha-conta'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                            title="Dados privados exclusivos via Meta API"
                        >
                            <Zap className="h-3 w-3" /> Minha Conta
                            {metaConnected && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ===== MINHA CONTA (Meta API) ===== */}
            {viewMode === 'minha-conta' && (
                <motion.div variants={item}>
                    {!metaConnected ? (
                        <div className="rounded-xl border border-dashed border-border p-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                                <Zap className="h-7 w-7 text-blue-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">Token Meta não encontrado</h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                                Configure o token Meta na sua conta (Gerenciar Contas → Editar → Token Meta) para acessar dados privados como alcance real, saves e compartilhamentos.
                            </p>
                            <div className="flex gap-2 justify-center mt-4">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.location.href = '/dashboard/accounts'}
                                >
                                    Gerenciar Contas →
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.location.href = '/dashboard/settings'}
                                >
                                    Configurações
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <MinhaContaView
                            token={metaTokenResolved!}
                            username={metaUsername ?? undefined}
                            allAccounts={accounts.filter(a => !!a.oauthToken).map(a => ({
                                id: a.id,
                                username: a.handle.replace('@', ''),
                                name: a.name,
                                picture: a.avatarUrl,
                                oauthToken: a.oauthToken!,
                            }))}
                        />
                    )}
                </motion.div>
            )}

            {/* ===== VS MODE ===== */}
            {viewMode === 'vs' && (
                <>
                    {/* VS Selection */}
                    <motion.div variants={item} className="rounded-xl border border-border bg-card p-4 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <GitCompare className="h-4 w-4 text-purple-400" />
                            Configurar Comparação
                        </h3>

                        {allHandles.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Adicione clientes e concorrentes primeiro na aba Individual.
                            </p>
                        )}

                        {allHandles.length > 0 && (
                            <div className="space-y-3">
                                {/* Select client */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                                        ⭐ Seu Cliente (base da comparação)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {allHandles.map(({ handle }) => (
                                            <button
                                                key={`client-${handle}`}
                                                onClick={() => setVsClient(vsClient === handle ? null : handle)}
                                                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${vsClient === handle
                                                    ? 'bg-blue-500 text-white border border-blue-500'
                                                    : 'border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50'
                                                    }`}
                                            >
                                                @{handle}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Select competitors */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                                        ⚔️ Concorrentes para comparar
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {allHandles
                                            .filter(({ handle }) => handle !== vsClient)
                                            .map(({ handle }) => (
                                                <button
                                                    key={`comp-${handle}`}
                                                    onClick={() => toggleVsCompetitor(handle)}
                                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${vsCompetitors.includes(handle)
                                                        ? 'bg-orange-500 text-white border border-orange-500'
                                                        : 'border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/50'
                                                        }`}
                                                >
                                                    @{handle}
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Run button */}
                                <Button
                                    onClick={runComparison}
                                    disabled={!vsClient || vsCompetitors.length === 0 || isLoadingVs}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                    size="sm"
                                >
                                    {isLoadingVs ? (
                                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Comparando...</>
                                    ) : (
                                        <><GitCompare className="mr-2 h-4 w-4" /> Comparar {vsClient ? `@${vsClient}` : 'Cliente'} VS {vsCompetitors.length} concorrente{vsCompetitors.length !== 1 ? 's' : ''}</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </motion.div>

                    {/* VS Results */}
                    {vsData && (
                        <motion.div variants={item}>
                            <ComparisonView client={vsData.client} competitors={vsData.competitors} />
                        </motion.div>
                    )}

                    {/* Meta Business Discovery */}
                    <motion.div variants={item} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    Business Discovery
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                                    Busque dados públicos em tempo real de qualquer concorrente (apenas contas Business/Creator) direto do Meta. Útil caso você não tenha créditos no Apify.
                                </p>
                            </div>
                            <form onSubmit={handleDiscovery} className="flex items-center gap-2 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={discoveryHandle}
                                    onChange={(e) => setDiscoveryHandle(e.target.value)}
                                    placeholder="@concorrente"
                                    className="h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-48"
                                />
                                <Button
                                    type="submit"
                                    disabled={!discoveryHandle.trim() || isDiscovering}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-9"
                                >
                                    {isDiscovering ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Descobrir'}
                                </Button>
                            </form>
                        </div>
                        
                        {discoveryError && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>{discoveryError}</p>
                            </div>
                        )}

                        {discoveryData && (
                            <div className="mt-4">
                                <MetaDiscoveryCard 
                                    profile={discoveryData.profile} 
                                    posts={discoveryData.posts} 
                                    fetchedAt={discoveryData.fetchedAt} 
                                />
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            {/* ===== INDIVIDUAL MODE ===== */}
            {viewMode === 'individual' && (
                <>
                    {/* Accounts & Competitors pills */}
                    <motion.div variants={item} className="space-y-2">
                        {accounts.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                                    <Users className="h-3.5 w-3.5" /><span>Clientes:</span>
                                </div>
                                {accounts.map((acc) => (
                                    <button key={acc.id} onClick={() => handleProfileSelect(acc.handle.replace(/^@/, ''))}
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                                        @{acc.handle.replace(/^@/, '')}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                                <Swords className="h-3.5 w-3.5" /><span>Concorrentes:</span>
                            </div>
                            {competitors.map((comp) => (
                                <div key={comp.id}
                                    className="group inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 pl-3 pr-1 py-1 text-xs font-medium text-orange-400">
                                    <button onClick={() => handleProfileSelect(comp.handle)} disabled={isLoading} className="hover:underline disabled:opacity-50">
                                        @{comp.handle}
                                    </button>
                                    <button onClick={() => removeCompetitor(comp.id)}
                                        className="flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-orange-500/30 transition-all"
                                        title="Remover"><X className="h-2.5 w-2.5" /></button>
                                </div>
                            ))}
                            {showAddCompetitor ? (
                                <form onSubmit={(e) => { e.preventDefault(); addCompetitor(); }} className="inline-flex items-center gap-1">
                                    <input type="text" value={newCompetitorHandle} onChange={(e) => setNewCompetitorHandle(e.target.value)}
                                        placeholder="@usuario" autoFocus
                                        className="h-6 w-28 rounded-full border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                                        onBlur={() => { if (!newCompetitorHandle.trim()) setShowAddCompetitor(false); }} />
                                    <button type="submit" className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors">
                                        <Plus className="h-3 w-3" /></button>
                                </form>
                            ) : (
                                <button onClick={() => setShowAddCompetitor(true)}
                                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-orange-500/30 transition-colors">
                                    <Plus className="h-3 w-3" /> Concorrente
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Search */}
                    <motion.div variants={item}>
                        <AnalyticsSearch
                            onSearch={(url, limit, period) => fetchMetrics(url, limit, false, period)}
                            onMerge={(url, limit, period) => fetchAndMerge(url, limit, period)}
                            isLoading={isLoading}
                            hasCachedData={hasData}
                            initialUrl={profileUrl}
                        />
                    </motion.div>

                    {isLoading && <motion.div variants={item}><AnalyticsSkeleton /></motion.div>}

                    {error && !isLoading && (
                        <motion.div variants={item} className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                            <p className="mt-3 font-medium text-destructive">Erro ao analisar perfil</p>
                            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => { if (profileUrl) fetchMetrics(profileUrl); }}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
                            </Button>
                        </motion.div>
                    )}

                    {isEmpty && !error && (
                        <motion.div variants={item} className="rounded-xl border border-dashed border-border p-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/50">
                                <TrendingUp className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">Nenhuma análise realizada</h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                                Selecione um perfil acima ou insira uma URL para começar.
                            </p>
                        </motion.div>
                    )}

                    {hasData && !isLoading && (
                        <>
                            <motion.div variants={item} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border border-border overflow-hidden bg-muted flex-shrink-0">
                                        {(currentAvatarUrl || currentComp?.avatarUrl) ? (
                                            // BUG FIX: usar image-proxy para evitar CORS do CDN do Instagram
                                            <img src={`/api/image-proxy?url=${encodeURIComponent(currentAvatarUrl || currentComp?.avatarUrl!)}`} alt="Perfil" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center instagram-gradient opacity-20" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">{summary?.totalPosts ?? posts.length}</span> posts de{' '}
                                            <span className="font-medium text-foreground">@{posts[0]?.ownerUsername || 'perfil'}</span>
                                        </p>
                                        {lastFetchedAt && (
                                            <p className="text-xs text-muted-foreground/70">
                                                Atualizado em {format(parseISO(lastFetchedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={isLoading}
                                        onClick={handleRefresh}>
                                        <RefreshCw className={`mr-1.5 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={clearMetrics}>Limpar</Button>
                                </div>
                            </motion.div>

                            {/* Filtro de Período Global para Métricas Individuais */}
                            <motion.div variants={item} className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1 whitespace-nowrap">
                                    <Filter className="h-3.5 w-3.5" />
                                    <span>Analisar:</span>
                                </div>
                                {([
                                    { value: 'all', label: 'Todo período' },
                                    { value: '7d', label: '7 dias' },
                                    { value: '30d', label: '30 dias' },
                                    { value: '60d', label: '60 dias' },
                                    { value: '90d', label: '90 dias' },
                                    { value: 'custom', label: 'Personalizado' }
                                ] as const).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFilterPeriod(opt.value)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap ${filterPeriod === opt.value
                                            ? 'bg-purple-500 text-white border border-purple-500'
                                            : 'border border-border text-muted-foreground hover:text-foreground hover:border-purple-500/50'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </motion.div>

                            {filterPeriod === 'custom' && (
                                <motion.div variants={item} className="flex items-center gap-2 pb-2">
                                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
                                        <input
                                            type="date"
                                            className="text-xs bg-transparent outline-none flex-1 text-foreground"
                                            value={customDateRange?.start || ''}
                                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value, end: customDateRange?.end || '' })}
                                        />
                                        <span className="text-muted-foreground text-xs font-medium">até</span>
                                        <input
                                            type="date"
                                            className="text-xs bg-transparent outline-none flex-1 text-foreground"
                                            value={customDateRange?.end || ''}
                                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: customDateRange?.start || '', end: e.target.value })}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">Selecione o intervalo de datas (o início e o fim são incluídos)</span>
                                </motion.div>
                            )}

                            {/* Botão Meta API — APENAS para a própria conta do usuário, nunca para concorrentes */}
                            {metaConnected && summary && isViewingOwnAccount && (
                                <motion.div variants={item} className="flex items-center gap-3 rounded-xl border border-[var(--v2-accent)]/20 bg-[var(--v2-accent)]/5 px-4 py-3">
                                    <Zap className="h-4 w-4 text-[var(--v2-accent)] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[var(--v2-text-primary)]">Métricas Privadas (Meta API)</p>
                                        <p className="text-[10px] text-muted-foreground">Alcance real, saves e shares — dados exclusivos da Meta</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={isLoadingMeta}
                                        onClick={handleFetchMeta}
                                        className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent-hover)] text-white text-xs"
                                    >
                                        {isLoadingMeta ? <><RefreshCw className="mr-1.5 h-3 w-3 animate-spin" /> Buscando...</> : <><Zap className="mr-1.5 h-3 w-3" /> Enriquecer</>}
                                    </Button>
                                </motion.div>
                            )}
                            {metaError && <p className="text-xs text-destructive px-1">{metaError}</p>}

                            {summary && (
                                <>
                                    {/* KPI Cards: Meta-exclusivos quando enriquecido, Apify quando não */}
                                    <motion.div variants={item}>
                                        {filteredPosts.length > 0 && filteredPosts[0]?.source === 'meta' ? (
                                            <MetaKpiCards
                                                posts={filteredPosts as any[]}
                                                accountProfile={
                                                    metaProfile && isViewingOwnAccount
                                                        ? metaProfile
                                                        : undefined
                                                }
                                            />
                                        ) : (
                                            <ApifyStatsPanel posts={filteredPosts} />
                                        )}
                                    </motion.div>
                                    {/* Painéis analíticos (Viral, Melhor Dia, Evolução, Sentimento, Hook, Score, Hashtags) */}
                                    {/* Sempre visíveis — quando Meta, aparece ABAIXO dos KPIs exclusivos */}
                                    {filteredPosts.length > 0 && filteredPosts[0]?.source === 'meta' && (
                                        <motion.div variants={item} className="mt-4">
                                            <ApifyStatsPanel posts={filteredPosts} isMeta />
                                        </motion.div>
                                    )}
                                </>
                            )}

                            {/* Alertas & Anomalias */}
                            {filteredPosts.length >= 5 && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <AlertAnomalyPanel posts={filteredPosts} />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            {/* Painel de Inteligência (Hormozi, Cialdini, Lindstrom) */}
                            {filteredPosts.length >= 3 && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <IntelligencePanel
                                            posts={filteredPosts}
                                            isMeta={filteredPosts.length > 0 && filteredPosts[0]?.source === 'meta'}
                                        />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            {/* Funil de Engajamento (Meta only) */}
                            {filteredPosts.length > 0 && filteredPosts[0]?.source === 'meta' && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <FunnelChart posts={filteredPosts as any[]} />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            {/* Heatmap de Engajamento */}
                            {filteredPosts.length >= 5 && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <EngagementHeatmap posts={filteredPosts} />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            {
                                summary && (
                                    <motion.div variants={item}>
                                        <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Insights & Análise</h3>
                                        <ErrorBoundary>
                                            <InsightsPanel posts={filteredPosts} summary={summary}
                                                fixedInsights={fixedInsights} isLoadingFixed={isLoadingFixed}
                                                onLoadFixed={loadFixedInsights} />
                                        </ErrorBoundary>
                                    </motion.div>
                                )
                            }

                            {/* Intenção de Compra */}
                            {filteredPosts.length > 0 && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <BuyingIntentFeed posts={filteredPosts} />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            <motion.div variants={item}>
                                <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Engajadores</h3>
                                <ErrorBoundary>
                                    <TopEngagers posts={filteredPosts} />
                                </ErrorBoundary>
                            </motion.div>

                            <motion.div variants={item}>
                                <ErrorBoundary>
                                    <CommentsAnalysis posts={filteredPosts} metaToken={metaTokenResolved ?? undefined} />
                                </ErrorBoundary>
                            </motion.div>

                            {/* Análise de Carrosséis (Meta only) */}
                            {filteredPosts.some(p => p.type === 'Sidecar') && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <CarouselSlideAnalysis
                                            posts={filteredPosts}
                                            metaToken={metaTokenResolved ?? undefined}
                                        />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            {/* Calendário de Conteúdo */}
                            {filteredPosts.length >= 5 && (
                                <motion.div variants={item}>
                                    <ErrorBoundary>
                                        <ContentCalendar posts={filteredPosts} />
                                    </ErrorBoundary>
                                </motion.div>
                            )}

                            <motion.div variants={item}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Análise por Post</h3>
                                    <div className="flex items-center gap-3">
                                        <ExportReport
                                            posts={filteredPosts}
                                            summary={summary}
                                            accountHandle={profileUrl.split('/').filter(Boolean).pop()}
                                        />
                                        <span className="text-[10px] text-muted-foreground/50">ⓘ Visualizações disponíveis apenas para Reels/Vídeos</span>
                                    </div>
                                </div>
                                <ErrorBoundary>
                                    <PostCards posts={filteredPosts} />
                                </ErrorBoundary>
                            </motion.div>
                        </>
                    )}
                </>
            )}
        </motion.div>
    );
}
