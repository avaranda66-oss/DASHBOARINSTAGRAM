'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Button } from '@/design-system/atoms/Button';
import { KpiCard } from '@/design-system/molecules/KpiCard';
import { useAccountStore, useSettingsStore, useAnalyticsStore } from '@/stores';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCompetitorsAction, saveCompetitorAction, deleteCompetitorAction } from '@/app/actions/competitor.actions';
import { getAnalyticsAction, getMetaAnalyticsAction, saveMetaAnalyticsAction } from '@/app/actions/analytics.actions';
import type { CompetitorProfile } from '@/types/competitor';
import type { InstagramPostMetrics, PostComment } from '@/types/analytics';
import { MinhaContaView } from '@/features/analytics/components/minha-conta-view';
import { MetaDiscoveryCard } from '@/features/analytics/components/meta-discovery-card';
import { cn } from '@/design-system/utils/cn';
import { semantic } from '@/design-system/tokens/colors';

type ViewMode = 'individual' | 'vs' | 'minha-conta';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any } },
};

// V2 Layout Tokens
const CARD_STYLE = {
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
};

const SECTION_HEADER_STYLE = "font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] select-none flex items-center gap-2 mb-6";

export default function AnalyticsPage() {
    const {
        posts, filteredPosts, summary, isLoading, error, hasData, isEmpty,
        lastFetchedAt, profileUrl, fetchMetrics, fetchAndMerge, clearMetrics, loadFromCache,
        filterPeriod, setFilterPeriod, avatarUrl: currentAvatarUrl,
        customDateRange, setCustomDateRange, selectedAccountHandle,
    } = useAnalytics();

    const { data: session } = useSession();
    const { accounts, isLoaded: accountsLoaded, loadAccounts } = useAccountStore();
    const settingsStore = useSettingsStore();
    const isMetaApiActive = !!(session?.accessToken || settingsStore?.settings?.metaAccessToken);

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
    const [, startTransition] = useTransition();
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

    // Batch initial loads in parallel — accounts already pre-loaded by DashboardShell
    useEffect(() => {
        Promise.all([
            !accountsLoaded ? loadAccounts() : Promise.resolve(),
            settingsStore.loadSettings(),
            getCompetitorsAction().then(setCompetitors),
        ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { setFixedInsights(null); }, [posts]);

    // Token Meta
    const allAccountsWithToken = accounts.filter(a => !!a.oauthToken);
    const currentOwner = posts[0]?.ownerUsername?.toLowerCase();
    const matchingAccount = currentOwner
        ? allAccountsWithToken.find(a => a.handle.replace('@', '').toLowerCase() === currentOwner)
        : null;
    const accountWithToken = matchingAccount || allAccountsWithToken[0] || null;
    const metaTokenResolved = matchingAccount?.oauthToken || settingsStore.settings?.metaAccessToken || accountWithToken?.oauthToken || null;
    const metaUsernameResolved = matchingAccount
        ? matchingAccount.handle.replace('@', '')
        : settingsStore.settings?.metaUsername || (accountWithToken ? accountWithToken.handle.replace('@', '') : null);
    const metaConnected = !!metaTokenResolved;
    const metaUsername = metaUsernameResolved;
    const isViewingOwnAccount = currentOwner
        ? allAccountsWithToken.some(a => a.handle.replace('@', '').toLowerCase() === currentOwner)
        : false;

    useEffect(() => {
        if (!metaUsername) return;
        // Run profile lookup and cache load in parallel
        Promise.all([
            import('@/app/actions/account.actions').then(({ getAccountByUsernameAction }) =>
                getAccountByUsernameAction(metaUsername).then((acc) => {
                    if (acc?.followersCount) {
                        setMetaProfile(prev => prev ?? { followersCount: acc.followersCount, name: acc.name });
                    }
                })
            ),
            getMetaAnalyticsAction(metaUsername).then((cached) => {
                if (cached && cached.posts.length > 0) {
                    analyticsStore.setPostsFromMeta(cached.posts as any[], metaUsername);
                }
            }),
        ]).catch((err) => { console.error('[analytics] Erro ao inicializar perfil Meta:', err); });

        // Cleanup runs deferred (non-blocking, low priority)
        const t = setTimeout(() => {
            import('@/app/actions/analytics.actions').then(({ cleanupMetaContaminationAction }) => {
                cleanupMetaContaminationAction(metaUsername).catch(() => {});
            });
        }, 5000);
        return () => clearTimeout(t);
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
            const metaUser = json.username ?? metaUsername ?? 'meta';
            analyticsStore.setPostsFromMeta(json.data, metaUser);
            saveMetaAnalyticsAction(metaUser, json.data).catch(console.error);

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
                    const currentPosts = useAnalyticsStore.getState().posts;
                    let updated = false;
                    const enrichedPosts = currentPosts.map((p: InstagramPostMetrics) => {
                        const match = commentMap.get(p.shortCode ?? '');
                        if (match && match.comments.length > 0) {
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
            }).catch((err) => { console.error('[analytics] Erro ao buscar comentários Meta:', err); });

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
        let finalHandle = handle.toLowerCase();
        let finalAvatarUrl = undefined;
        try {
            const { refreshCompetitorAvatarAction } = await import('@/app/actions/competitor.actions');
            finalAvatarUrl = await refreshCompetitorAvatarAction(finalHandle) || undefined;
        } catch (e) { console.error(e); }

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

    const handleProfileSelect = useCallback((handle: string) => {
        startTransition(async () => {
            const loaded = await loadFromCache(handle);
            if (!loaded) fetchMetrics(`https://www.instagram.com/${handle}/`, 40);
        });
    }, [loadFromCache, fetchMetrics, startTransition]);

    const handleRefresh = async () => {
        if (!profileUrl) return;
        const handle = posts[0]?.ownerUsername;
        if (handle) {
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

    const toggleVsCompetitor = (handle: string) => {
        setVsCompetitors((prev) =>
            prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle],
        );
    };

    const runComparison = async () => {
        if (!vsClient || vsCompetitors.length === 0) return;
        setIsLoadingVs(true);
        setVsData(null);
        try {
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
            const compDataPromises = vsCompetitors.map(loadProfile);
            const compResults = await Promise.all(compDataPromises);
            const validComps = compResults.filter(Boolean) as ProfileData[];
            if (clientData && validComps.length > 0) {
                setVsData({ client: { ...clientData, isClient: true }, competitors: validComps });
            }
        } catch { /* ignore */ }
        setIsLoadingVs(false);
    };

    const handleDiscovery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!discoveryHandle.trim()) return;
        const metaToken = metaTokenResolved;
        if (!metaToken) return;
        setIsDiscovering(true);
        setDiscoveryError(null);
        setDiscoveryData(null);
        let clean = discoveryHandle.trim().replace(/^@/, '');
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
            setDiscoveryError(e.message || "Erro de rede.");
        } finally {
            setIsDiscovering(false);
        }
    };

    const allHandles = [
        ...accounts.map((a) => ({ handle: a.handle.replace(/^@/, ''), type: 'client' as const })),
        ...competitors.map((c) => ({ handle: c.handle, type: 'competitor' as const })),
    ];

    // V2 Data Formatting
    const formatValue = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    return (
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
            {/* Header & Mode Switcher */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-8" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div>
                    <h2 className="text-[2.5rem] font-bold tracking-tight text-[#F5F5F5] leading-none mb-2">Métricas</h2>
                    <p className="text-[14px] text-[#4A4A4A] tracking-tight">
                        {viewMode === 'individual' ? 'Análise individual de performance e visibilidade.' : 'Comparações técnicas de audiência e engajamento.'}
                    </p>
                </div>

                <div className="flex bg-[#0A0A0A] border rounded-lg p-0.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {([
                        { id: 'individual', label: 'INDIVIDUAL', tag: '01' },
                        { id: 'vs', label: 'COMPARAÇÃO', tag: '02' },
                        { id: 'minha-conta', label: 'METRICS API', tag: '03' }
                    ] as const).map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={cn(
                                "relative px-4 py-2 flex items-center gap-2 transition-colors duration-150",
                                viewMode === mode.id ? "text-[#F5F5F5]" : "text-[#4A4A4A] hover:text-[#8A8A8A]"
                            )}
                        >
                            {viewMode === mode.id && (
                                <motion.div layoutId="mode-bg" className="absolute inset-0 bg-[#141414] rounded-[6px]" />
                            )}
                            <span className="relative z-10 font-mono text-[9px] tracking-widest opacity-40">[{mode.tag}]</span>
                            <span className="relative z-10 font-bold text-[10px] tracking-[0.15em] uppercase">{mode.label}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Data Source Banner */}
            <motion.div variants={item}>
                {isMetaApiActive ? (
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#A3E635]/60 border border-[#A3E635]/10 bg-[#A3E635]/5 px-3 py-2">
                        <span>●</span>
                        <span>FONTE: META API PRIVADA — dados reais de alcance, impressões e saves</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#F59E0B]/60 border border-[#F59E0B]/10 bg-[#F59E0B]/5 px-3 py-2">
                        <span>◌</span>
                        <span>FONTE: APIFY PÚBLICO — apenas likes e comentários visíveis. Conecte Meta para dados completos.</span>
                    </div>
                )}
            </motion.div>

            {/* View Content */}
            <div className="space-y-12">
                
                {/* 1. INDIVIDUAL MODE */}
                {viewMode === 'individual' && (
                    <>
                        {/* Search & Profiles */}
                        <motion.div variants={item} className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <div className="p-8" style={CARD_STYLE}>
                                    <h4 className={SECTION_HEADER_STYLE}>
                                        <span className="text-[#A3E635]">◆</span> Perfil & Ativos
                                        {selectedAccountHandle && (
                                            <span className="ml-auto font-mono text-[#A3E635] tracking-widest">
                                                ▶ @{selectedAccountHandle}
                                            </span>
                                        )}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {accounts.map(acc => {
                                            const handle = acc.handle.replace(/^@/, '');
                                            const isActive = selectedAccountHandle === handle;
                                            return (
                                                <button key={acc.id} onClick={() => handleProfileSelect(handle)}
                                                    className="px-4 py-2 border rounded-full text-[12px] font-medium transition-all"
                                                    style={{
                                                        borderColor: isActive ? '#A3E635' : 'rgba(255,255,255,0.08)',
                                                        backgroundColor: isActive ? 'rgba(163,230,53,0.08)' : 'rgba(255,255,255,0.02)',
                                                        color: isActive ? '#A3E635' : '#8A8A8A',
                                                    }}>
                                                    {isActive && <span className="mr-1">▶</span>}@{handle}
                                                </button>
                                            );
                                        })}
                                        {competitors.map(comp => {
                                            const isActive = selectedAccountHandle === comp.handle;
                                            return (
                                                <button key={comp.id} onClick={() => handleProfileSelect(comp.handle)}
                                                    className="px-4 py-2 border rounded-full text-[12px] font-medium transition-all"
                                                    style={{
                                                        borderColor: isActive ? '#A3E635' : 'rgba(163,230,53,0.15)',
                                                        backgroundColor: isActive ? 'rgba(163,230,53,0.08)' : 'rgba(163,230,53,0.02)',
                                                        color: isActive ? '#A3E635' : '#8A8A8A',
                                                    }}>
                                                    {isActive && <span className="mr-1">▶</span>}@{comp.handle}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <AnalyticsSearch
                                        onSearch={(url, limit, period) => fetchMetrics(url, limit, false, period)}
                                        onMerge={(url, limit, period) => fetchAndMerge(url, limit, period)}
                                        isLoading={isLoading}
                                        hasCachedData={hasData}
                                        initialUrl={profileUrl}
                                    />
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-4">
                                <div className="p-8 h-full" style={CARD_STYLE}>
                                    <h4 className={SECTION_HEADER_STYLE}>
                                        <span className="text-[#A3E635]">◎</span> Preferências
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {([
                                            { value: 'all', label: 'TODO PERÍODO' },
                                            { value: '7d', label: '7 DIAS' },
                                            { value: '30d', label: '30 DIAS' },
                                            { value: '90d', label: '90 DIAS' }
                                        ] as const).map(opt => (
                                            <button key={opt.value} onClick={() => setFilterPeriod(opt.value)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded font-mono text-[10px] tracking-widest border transition-all",
                                                    filterPeriod === opt.value 
                                                        ? "bg-[#A3E635] text-black border-[#A3E635]" 
                                                        : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                                )}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {isLoading && <motion.div variants={item}><AnalyticsSkeleton /></motion.div>}

                        {hasData && !isLoading && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                
                                {/* Hero KPI Band (4-5 Cards) */}
                                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KpiCard
                                        label="Alcance Total"
                                        value={formatValue((summary as any)?.totalReach || 0)}
                                        delta={12.5}
                                        deltaLabel="est."
                                        sparkline={[10, 15, 8, 22, 19, 25, 32]}
                                        footnote={!metaConnected && !((summary as any)?.totalReach) ? '⚠ Meta API não conectada — use ENRIQUECER_DATA para obter alcance real' : undefined}
                                    />
                                    <KpiCard 
                                        label="Impressões"
                                        value={formatValue((summary as any)?.totalImpressions || (summary as any)?.totalViews || 0)}
                                        delta={-4.2}
                                        deltaLabel="est."
                                        sparkline={[30, 28, 35, 32, 28, 25, 22]}
                                    />
                                    <KpiCard 
                                        label="Engajamento Médio"
                                        value={`${summary?.avgEngagementRate?.toFixed(2)}%`}
                                        delta={8.1}
                                        deltaLabel="est."
                                        sparkline={[2, 2.5, 2.2, 2.8, 3.1, 2.9, 3.2]}
                                    />
                                    <KpiCard 
                                        label="Total de Posts"
                                        value={summary?.totalPosts?.toString() || filteredPosts.length.toString()}
                                    />
                                </motion.div>

                                {/* Enrichment Banner */}
                                {metaConnected && isViewingOwnAccount && (
                                    <motion.div variants={item} className="p-6 border rounded-lg flex items-center justify-between bg-[#A3E635]/[0.02]" style={{ borderColor: 'rgba(163,230,53,0.15)' }}>
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono text-[10px] text-[#A3E635] border border-[#A3E635]/30 px-2 py-1 rounded">METADATA</div>
                                            <p className="text-[13px] text-[#8A8A8A]">Dados privados (saves, shares, reach) disponíveis via Meta API.</p>
                                        </div>
                                        <Button 
                                            onClick={handleFetchMeta} 
                                            isLoading={isLoadingMeta}
                                            size="sm"
                                            className="font-mono tracking-widest text-[10px]"
                                        >
                                            ENRIQUECER_DATA ↗
                                        </Button>
                                    </motion.div>
                                )}

                                {/* Main Sections */}
                                <div className="grid grid-cols-12 gap-8">
                                    
                                    {/* Stats & Anomaly */}
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <div className="p-8" style={CARD_STYLE}>
                                            <h4 className={SECTION_HEADER_STYLE}>
                                                <span className="text-[#A3E635]">◷</span> Performance Temporal
                                            </h4>
                                            <ApifyStatsPanel posts={filteredPosts} />
                                        </div>

                                        <div className="p-8" style={CARD_STYLE}>
                                            <h4 className={SECTION_HEADER_STYLE}>
                                                <span className="text-[#EF4444]">▲</span> Alertas de Volatilidade
                                            </h4>
                                            <AlertAnomalyPanel posts={filteredPosts} />
                                        </div>
                                    </div>

                                    {/* Intelligence & Map */}
                                    <div className="col-span-12 lg:col-span-4 space-y-8">
                                        <div className="p-8" style={CARD_STYLE}>
                                            <h4 className={SECTION_HEADER_STYLE}>
                                                <span className="text-[#A3E635]">◎</span> Insights HUD
                                            </h4>
                                            {summary && <InsightsPanel posts={filteredPosts} summary={summary} fixedInsights={fixedInsights} isLoadingFixed={isLoadingFixed} onLoadFixed={loadFixedInsights} />}
                                        </div>
                                        <div className="p-8" style={CARD_STYLE}>
                                            <h4 className={SECTION_HEADER_STYLE}>
                                                <span className="text-[#A3E635]">◆</span> Heatmap de Calor
                                            </h4>
                                            <EngagementHeatmap posts={filteredPosts} />
                                        </div>
                                    </div>

                                    {/* Full Width Panels */}
                                    <div className="col-span-12 space-y-8">
                                        <div className="p-8" style={CARD_STYLE}>
                                            <h4 className={SECTION_HEADER_STYLE}>
                                                <span className="text-[#A3E635]">↗</span> Intelligence Engine
                                            </h4>
                                            <IntelligencePanel posts={filteredPosts} />
                                        </div>

                                        <div className="p-8" style={CARD_STYLE}>
                                            <div className="flex items-center justify-between mb-8">
                                                <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] flex items-center gap-2">
                                                    <span className="text-[#A3E635]">◎</span> Registro de Conteúdo
                                                </h4>
                                                <ExportReport posts={filteredPosts} summary={summary} accountHandle={profileUrl.split('/').filter(Boolean).pop()} />
                                            </div>
                                            <PostCards posts={filteredPosts} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 2. VS MODE (Refactored Minimal) */}
                {viewMode === 'vs' && (
                    <motion.div variants={item} className="space-y-8">
                        <div className="p-8" style={CARD_STYLE}>
                            <h4 className={SECTION_HEADER_STYLE}>
                                <span className="text-[#A3E635]">⚔️</span> Matriz de Comparação
                            </h4>
                            <div className="grid grid-cols-12 gap-8">
                                <div className="col-span-12 lg:col-span-4">
                                    <label className="text-[10px] font-mono text-[#4A4A4A] tracking-widest block mb-4 uppercase">Target Client [01]</label>
                                    <div className="flex flex-wrap gap-2">
                                        {allHandles.map(({ handle }) => (
                                            <button key={`vs-c-${handle}`} onClick={() => setVsClient(vsClient === handle ? null : handle)}
                                                className={cn(
                                                    "px-3 py-1.5 border rounded text-[11px] font-medium transition-all",
                                                    vsClient === handle ? "border-[#A3E635] text-[#A3E635] bg-[#A3E635]/5" : "border-white/5 text-[#4A4A4A]"
                                                )}>
                                                @{handle}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-12 lg:col-span-8">
                                    <label className="text-[10px] font-mono text-[#4A4A4A] tracking-widest block mb-4 uppercase">Concorrentes [N]</label>
                                    <div className="flex flex-wrap gap-2">
                                        {allHandles.filter(h => h.handle !== vsClient).map(({ handle }) => (
                                            <button key={`vs-comp-${handle}`} onClick={() => toggleVsCompetitor(handle)}
                                                className={cn(
                                                    "px-3 py-1.5 border rounded text-[11px] font-medium transition-all",
                                                    vsCompetitors.includes(handle) ? "border-[#A3E635] text-[#A3E635] bg-[#A3E635]/5" : "border-white/5 text-[#4A4A4A]"
                                                )}>
                                                @{handle}
                                            </button>
                                        ))}
                                    </div>
                                    <Button onClick={runComparison} disabled={!vsClient || vsCompetitors.length === 0 || isLoadingVs} className="mt-8 font-mono tracking-widest text-[10px]">
                                        EXECUTAR_COMPARACAO ↗
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {vsData && (
                            <div className="p-8" style={CARD_STYLE}>
                                <ComparisonView client={vsData.client} competitors={vsData.competitors} />
                            </div>
                        )}
                        
                        <div className="p-8" style={CARD_STYLE}>
                             <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◆</span> Business Discovery</h4>
                             <form onSubmit={handleDiscovery} className="flex gap-4">
                                <input
                                    type="text"
                                    value={discoveryHandle}
                                    onChange={(e) => setDiscoveryHandle(e.target.value)}
                                    placeholder="@concorrente"
                                    className="bg-transparent border-b border-white/10 text-[#F5F5F5] font-mono text-sm px-2 py-4 outline-none focus:border-[#A3E635] transition-colors flex-1"
                                />
                                <Button type="submit" isLoading={isDiscovering} disabled={!discoveryHandle.trim()} variant="solid">DISCOVER</Button>
                             </form>
                             {discoveryData && <div className="mt-12"><MetaDiscoveryCard profile={discoveryData.profile} posts={discoveryData.posts} fetchedAt={discoveryData.fetchedAt} /></div>}
                        </div>
                    </motion.div>
                )}

                {/* 3. METRICS API */}
                {viewMode === 'minha-conta' && (
                    <motion.div variants={item} className="p-8" style={CARD_STYLE}>
                        {metaConnected ? (
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
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="font-mono text-[10px] text-[#4A4A4A] tracking-[0.2em]">[SYSTEM_ALERT]</div>
                                <h3 className="text-xl font-bold">Configuração Meta API Requerida</h3>
                                <p className="text-[#4A4A4A] text-sm max-w-sm mx-auto">Vincule seu Token Meta nas configurações para habilitar esta visão avançada.</p>
                                <Button variant="outline" onClick={() => window.location.href = '/dashboard/accounts'}>EDIT_ACCOUNTS</Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
