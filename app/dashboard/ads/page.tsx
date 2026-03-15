'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAdsStore, useAccountStore, useSettingsStore } from '@/stores';
import { CampaignsTable } from '@/features/ads/components/campaigns-table';
import { AdsABTestCard } from '@/features/ads/components/ads-ab-test-card';
import { AdsCharts } from '@/features/ads/components/ads-charts';
import { AdsIntelligencePanelV2 } from '@/features/ads/components/ads-intelligence-panel-v2';
import { AdsMMMSection } from '@/features/ads/components/ads-mmm-section';
import { AdsIncrementalitySection } from '@/features/ads/components/ads-incrementality-section';
import { AdsBudgetAllocation } from '@/features/ads/components/ads-budget-allocation';
import { AdsCreativePerformance } from '@/features/ads/components/ads-creative-performance';
import { CreativesGallery } from '@/features/ads/components/creatives-gallery';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/design-system/atoms/Button';
import { KpiCard } from '@/design-system/molecules/KpiCard';
import { Badge } from '@/design-system/atoms/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { AdsDatePreset, AttributionWindow } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { downloadCsv, csvFilename, campaignsToCSV, dailyInsightsToCSV } from '@/lib/utils/export-csv';
import { AdsDemographicsSection } from '@/features/ads/components/ads-demographics-section';
import { AdsAccountSwitcher } from '@/features/ads/components/ads-account-switcher';
import { AdsMultiAccountOverview } from '@/features/ads/components/ads-multi-account-overview';
import { AdsBudgetPacing } from '@/features/ads/components/ads-budget-pacing';
import { AdsRulesEngine } from '@/features/ads/components/ads-rules-engine';
import { AdsCreativeLibrary } from '@/features/ads/components/ads-creative-library';
import { AdsScheduledReports } from '@/features/ads/components/ads-scheduled-reports';
import { AdsProfitDashboard } from '@/features/ads/components/ads-profit-dashboard';
import { AdsExportButton } from '@/features/ads/components/ads-export-button';

type ViewTab = 'overview' | 'charts' | 'intelligence' | 'creatives';

const DATE_PRESETS: { value: AdsDatePreset; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last_7d', label: '7 dias' },
    { value: 'last_14d', label: '14 dias' },
    { value: 'last_30d', label: '30 dias' },
    { value: 'last_90d', label: '90 dias' },
    { value: 'this_month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
];

const STATUS_FILTERS = [
    { value: 'all', label: 'TODAS', tag: '00' },
    { value: 'ACTIVE', label: 'ATIVAS', tag: '01' },
    { value: 'PAUSED', label: 'PAUSADAS', tag: '02' },
    { value: 'ARCHIVED', label: 'ARQUIVADAS', tag: '03' },
] as const;

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any } },
};

export default function AdsDashboardPage() {
    const [activeTab, setActiveTab] = useState<ViewTab>('overview');
    const { data: session } = useSession();
    const accountStore = useAccountStore();
    const settingsStore = useSettingsStore();
    const adsStore = useAdsStore();

    const {
        campaigns, adSets, kpiSummary, kpiDelta, dailyInsights, dailyFallbackPreset, account,
        isLoading, error: adsError, lastFetchedAt, filters, expandedCampaignId,
        campFromCache, insightFromCache,
        creativeAds, isLoadingCreatives, creativesError,
        availableAccounts, fetchAdAccounts,
        fetchAll, fetchCreatives, setFilters, setExpandedCampaign, updateCampaignStatus,
    } = adsStore;

    const [adsToken, setAdsToken] = useState<string | null>(null);
    const [adsAccountId, setAdsAccountId] = useState<string | null>(null);
    const [accountName, setAccountName] = useState<string>('');

    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customSince, setCustomSince] = useState('');
    const [customUntil, setCustomUntil] = useState('');
    const [isCustomRangeActive, setIsCustomRangeActive] = useState(false);
    const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all');

    useEffect(() => {
        if (!accountStore.isLoaded) accountStore.loadAccounts();
        if (!settingsStore.settings) settingsStore.loadSettings();
    }, []);

    useEffect(() => {
        // Priority 1: OAuth session token (Story 2 — Token Migration)
        if (session?.accessToken) {
            setAdsToken(session.accessToken);
            return;
        }
        // Priority 2: Manually configured token (legacy fallback)
        const accts = accountStore.accounts;
        const withAds = accts.find(a => a.adsToken && a.adsAccountId);
        if (withAds) {
            setAdsToken(withAds.adsToken!);
            setAdsAccountId(withAds.adsAccountId!);
            setAccountName(withAds.name || withAds.handle);
        }
    }, [session, accountStore.accounts]);

    // Quando temos token OAuth mas sem accountId: busca contas e auto-seleciona a primeira
    useEffect(() => {
        if (session?.accessToken && !adsAccountId) {
            fetchAdAccounts(session.accessToken);
        }
    }, [session, adsAccountId]);

    useEffect(() => {
        if (session?.accessToken && !adsAccountId && availableAccounts.length > 0) {
            const first = availableAccounts[0];
            setAdsAccountId(first.id);
            setAccountName(first.name);
        }
    }, [session, availableAccounts, adsAccountId]);

    useEffect(() => {
        if (adsToken && adsAccountId && !lastFetchedAt && !isLoading) {
            fetchAll(adsToken, adsAccountId);
        }
    }, [adsToken, adsAccountId]);

    const handleRefresh = useCallback((forceRefresh = true) => {
        if (adsToken && adsAccountId) {
            fetchAll(adsToken, adsAccountId, forceRefresh);
            if (forceRefresh) toast.success('Atualizando dados de campanhas...');
        }
    }, [adsToken, adsAccountId, fetchAll]);

    const { interval: refreshInterval, setInterval: setRefreshInterval, isActive: autoRefreshActive, nextRefreshIn } =
        useAutoRefresh(handleRefresh, { defaultInterval: 0 });


    const handleDateChange = useCallback((preset: AdsDatePreset) => {
        setIsCustomRangeActive(false);
        setShowCustomRange(false);
        setFilters({ datePreset: preset, customRange: undefined });
        // Zustand set é síncrono — get().filters já tem o novo preset imediatamente.
        // fetchAll lê get().filters internamente, então chamada direta é correta.
        if (adsToken && adsAccountId) {
            fetchAll(adsToken, adsAccountId);
        }
    }, [adsToken, adsAccountId, setFilters, fetchAll]);

    const handleCustomRangeApply = useCallback(() => {
        if (!customSince || !customUntil) return;
        setIsCustomRangeActive(true);
        setShowCustomRange(false);
        setFilters({ customRange: { since: customSince, until: customUntil } });
        if (adsToken && adsAccountId) {
            fetchAll(adsToken, adsAccountId);
        }
    }, [customSince, customUntil, adsToken, adsAccountId, setFilters, fetchAll]);

    const handleStatusFilter = useCallback((status: string) => {
        setFilters({ statusFilter: status as any });
    }, [setFilters]);

    const handleFetchCreatives = useCallback(() => {
        if (adsToken && adsAccountId) {
            fetchCreatives(adsToken, adsAccountId);
        }
    }, [adsToken, adsAccountId, fetchCreatives]);

    // Auto-fetch creatives when tab becomes active and data is empty
    useEffect(() => {
        if (activeTab === 'creatives' && creativeAds.length === 0 && !isLoadingCreatives && adsToken && adsAccountId) {
            fetchCreatives(adsToken, adsAccountId);
        }
    }, [activeTab, adsToken, adsAccountId, creativeAds.length, isLoadingCreatives]);

    const handleToggleCampaignStatus = useCallback(async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
        if (!adsToken) return false;
        return updateCampaignStatus(adsToken, campaignId, newStatus);
    }, [adsToken, updateCampaignStatus]);

    const filteredCampaigns = useMemo(() => {
        let result = campaigns;
        if (filters.statusFilter !== 'all') {
            result = result.filter(c => c.effective_status === filters.statusFilter);
        }
        if (selectedCampaignFilter !== 'all') {
            result = result.filter(c => c.id === selectedCampaignFilter);
        }
        return result;
    }, [campaigns, selectedCampaignFilter, filters.statusFilter]);

    const filteredAdSets = useMemo(() => {
        const campaignIds = new Set(filteredCampaigns.map(c => c.id));
        if (filters.statusFilter === 'all' && selectedCampaignFilter === 'all') return adSets;
        return adSets.filter(s => campaignIds.has(s.campaign_id));
    }, [adSets, filteredCampaigns, filters.statusFilter, selectedCampaignFilter]);

    // filteredKpiSummary: recalcula KPIs APENAS quando uma campanha específica é selecionada.
    // O filtro de STATUS afeta só a tabela — KPIs sempre mostram dados da conta completa.
    // Isso segue o padrão de ferramentas como Meta Ads Manager e Google Ads.
    const filteredKpiSummary = useMemo(() => {
        if (!kpiSummary) return kpiSummary;
        // Status filter: não recalcula KPIs (afeta só a tabela)
        if (selectedCampaignFilter === 'all') return kpiSummary;

        // Campanha específica selecionada: recalcula KPIs para aquela campanha
        const filtered = campaigns.filter(c => c.id === selectedCampaignFilter);
        let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
        let totalConversions = 0, totalConversionValue = 0, totalEngagements = 0;
        let weightedCtr = 0, weightedCpm = 0, weightedCpc = 0;

        const exactConvTypes = new Set([
            'offsite_conversion.fb_pixel_purchase',
            'offsite_conversion.fb_pixel_lead',
            'offsite_conversion.fb_pixel_complete_registration',
            'lead',
        ]);

        for (const c of filtered) {
            const i = c.insights;
            if (!i) continue;
            const spend = parseFloat(i.spend) || 0;
            const impressions = parseInt(i.impressions) || 0;
            const clicks = parseInt(i.clicks) || 0;
            const reach = parseInt(i.reach || '0') || 0;
            totalSpend += spend;
            totalImpressions += impressions;
            totalClicks += clicks;
            totalReach += reach;
            const outboundCtr = parseFloat(i.outbound_clicks_ctr?.[0]?.value || '0') || 0;
            const ctrVal = outboundCtr > 0 ? outboundCtr : (parseFloat(i.ctr || '0') || 0);
            weightedCtr += ctrVal * impressions;
            weightedCpm += (parseFloat(i.cpm || '0') || 0) * impressions;
            weightedCpc += (parseFloat(i.cpc || '0') || 0) * clicks;

            if (i.actions) {
                for (const a of i.actions) {
                    if (exactConvTypes.has(a.action_type)) {
                        totalConversions += parseInt(a.value) || 0;
                    }
                    if (a.action_type === 'post_engagement') {
                        totalEngagements += parseInt(a.value) || 0;
                    }
                }
            }
            const roasVal = parseFloat(i.purchase_roas?.[0]?.value || '0') || 0;
            totalConversionValue += roasVal * spend;
        }

        return {
            ...kpiSummary,
            totalSpend,
            totalImpressions,
            totalClicks,
            totalReach,
            avgCtr: totalImpressions > 0 ? weightedCtr / totalImpressions : 0,
            avgCpm: totalImpressions > 0 ? weightedCpm / totalImpressions : 0,
            avgCpc: totalClicks > 0 ? weightedCpc / totalClicks : 0,
            totalConversions,
            roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
            cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
            totalEngagements,
            costPerEngagement: totalEngagements > 0 ? totalSpend / totalEngagements : 0,
        };
    }, [campaigns, kpiSummary, selectedCampaignFilter]);

    // isFiltered: delta suprimido apenas quando campanha específica selecionada
    // (bases incompatíveis: KPI da campanha vs delta da conta completa)
    // Filtro de status NÃO suprime delta — KPIs continuam sendo da conta completa
    const isFiltered = selectedCampaignFilter !== 'all';

    // Modo awareness: conta tem apenas campanhas de alcance/awareness sem conversões por pixel.
    // Quando totalConversions===0 E totalEngagements>0, substituímos o bloco
    // Resultados/CPA/ROAS por métricas relevantes: Engajamentos, Custo/Engaj., Frequência.
    const isAwarenessMode = (filteredKpiSummary?.totalConversions ?? 0) === 0
        && (filteredKpiSummary?.totalEngagements ?? 0) > 0;

    // Dados incompletos: today/yesterday têm latência de 15-72h na Meta (conversões especialmente)
    const isIncompleteData = !filters.customRange && (filters.datePreset === 'today' || filters.datePreset === 'yesterday');

    // Threshold mínimo: apenas bloquear divisão por zero (período literalmente sem atividade)
    const MIN_IMPRESSIONS_FOR_DELTA = 1;
    const hasEnoughSample = (filteredKpiSummary?.totalImpressions ?? 0) >= MIN_IMPRESSIONS_FOR_DELTA;

    // Delta exibido quando: não filtrado + pelo menos 1 impressão no período
    const showDelta = !isFiltered && hasEnoughSample;
    // Para métricas de entrega (impressões, cliques, CTR, CPM, CPC) toleramos today/yesterday
    // Para conversões/ROAS/CPA (dependem de attribution), suprimimos em today/yesterday
    const showConversionDelta = showDelta && !isIncompleteData;

    const currency = account?.currency || kpiSummary?.currency || 'BRL';

    const hasToken = !!(session?.accessToken || settingsStore?.settings?.metaAccessToken);
    const [tokenExpired, setTokenExpired] = useState(false);
    useEffect(() => {
        setTokenExpired(
            session?.error === 'RefreshAccessTokenError' ||
            (session?.expiresAt != null && session.expiresAt * 1000 < Date.now()),
        );
    }, [session?.error, session?.expiresAt]);

    const dataFreshness = useMemo(() => {
        if (!lastFetchedAt) return null;
        // eslint-disable-next-line react-hooks/purity
        const diffMs = Date.now() - new Date(lastFetchedAt).getTime();
        const diffH = diffMs / 3600000;
        const stale = diffH >= 24;
        const label = diffH < 1
            ? `${Math.round(diffMs / 60000)}min atrás`
            : diffH < 24
            ? `${Math.floor(diffH)}h atrás`
            : `${Math.floor(diffH / 24)}d atrás`;
        return { stale, label };
    }, [lastFetchedAt]);

    // Sparklines reais dos últimos dias disponíveis
    const spendSparkline = dailyInsights.slice(-14).map(d => d.spend);
    const conversionsSparkline = dailyInsights.slice(-14).map(d => d.conversions);
    const roasSparkline = dailyInsights.slice(-14).map(d => d.roas);

    // Label do período comparado
    const deltaLabel = filters.customRange
        ? 'vs. período anterior'
        : `vs. ${DATE_PRESETS.find(p => p.value === filters.datePreset)?.label.toLowerCase()} ant.`;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
    };

    const formatCompact = (val: number, isCurrency = false) => {
        let formatted = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0);
        if (val >= 1000000) formatted = (val / 1000000).toFixed(1) + 'M';
        return isCurrency ? `${currency} ${formatted}` : formatted;
    };

    if (hasToken && tokenExpired) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <span className="font-mono text-[40px] text-[#2A2A2A] select-none">◆</span>
                <div className="space-y-2 max-w-sm">
                    <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#FBBF24' }}>
                        [TOKEN_EXPIRADO]
                    </p>
                    <h2 className="text-[15px] font-bold uppercase tracking-tight text-[#F5F5F5]">
                        Token Meta Expirado
                    </h2>
                    <p className="font-mono text-[11px] leading-relaxed" style={{ color: '#4A4A4A' }}>
                        Seu token Meta expirou. Renove para continuar vendo dados de campanhas.
                    </p>
                </div>
                <a
                    href="/connect"
                    className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border transition-colors"
                    style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#FBBF24' }}
                >
                    ⚡ Renovar Token →
                </a>
            </div>
        );
    }

    if (!adsToken || !adsAccountId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <span className="font-mono text-[40px] text-[#2A2A2A] select-none">◆</span>
                <div className="space-y-2 max-w-sm">
                    <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#A3E635' }}>
                        [SETUP_REQUIRED]
                    </p>
                    <h2 className="text-[15px] font-bold uppercase tracking-tight text-[#F5F5F5]">
                        Conecte sua conta Meta
                    </h2>
                    <p className="font-mono text-[11px] leading-relaxed" style={{ color: '#4A4A4A' }}>
                        Conecte sua conta Meta para acessar o Ads Manager.
                    </p>
                </div>
                <a
                    href="/connect"
                    className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border transition-colors"
                    style={{ borderColor: 'rgba(163,230,53,0.4)', color: '#A3E635' }}
                >
                    ⚡ Conectar Meta →
                </a>
            </div>
        );
    }

    if (isLoading && !lastFetchedAt) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-8 w-48 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ))}
                </div>
                <div className="h-64 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-40 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
        );
    }

    if (adsError && !campaigns.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <span className="font-mono text-[40px] select-none" style={{ color: '#EF4444' }}>✕</span>
                <div className="space-y-2 max-w-sm">
                    <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#EF4444' }}>
                        [API_ERROR]
                    </p>
                    <h2 className="text-[15px] font-bold uppercase tracking-tight text-[#F5F5F5]">
                        Falha ao buscar dados
                    </h2>
                    <p className="font-mono text-[11px] leading-relaxed" style={{ color: '#4A4A4A' }}>
                        {adsError.includes('token') || adsError.includes('Token') || adsError.includes('auth')
                            ? 'Token inválido ou expirado. Reconecte sua conta Meta.'
                            : 'Não foi possível conectar à API Meta. Verifique sua conexão e tente novamente.'}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefresh(true)}
                    className="font-mono tracking-widest text-[10px]"
                >
                    ↺ Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
            
            {/* ─── Header & Metadata ─── */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[ADS_ENGINE_V2]</span>
                        <h1 className="text-[2rem] font-bold tracking-tight text-[#F5F5F5]">{accountName}</h1>
                        {adsToken && adsAccountId && (
                            <AdsAccountSwitcher
                                token={adsToken}
                                currentAccountId={adsAccountId}
                                onSwitch={(newId) => {
                                    setAdsAccountId(newId);
                                    fetchAll(adsToken, newId, true);
                                }}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-[12px] font-mono text-[#4A4A4A] tracking-tight">
                        <span>ID: {adsAccountId}</span>
                        {dataFreshness && (
                            <span
                                className="flex items-center gap-1.5"
                                title={dataFreshness.stale ? 'Dados podem estar desatualizados. Clique em REFRESH_SYNC.' : 'Dados recentes'}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${dataFreshness.stale ? 'bg-[#EF4444]' : 'bg-[#A3E635]'}`} />
                                <span className={dataFreshness.stale ? 'text-[#EF4444]' : ''}>
                                    ATUALIZADO: {dataFreshness.label}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Auto-refresh interval selector */}
                    <div className="flex items-center gap-1">
                        {([0, 5, 15, 30] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setRefreshInterval(v)}
                                title={v === 0 ? 'Refresh manual' : `Auto-refresh a cada ${v}min`}
                                className={cn(
                                    "px-2 py-1 rounded font-mono text-[9px] uppercase tracking-widest border transition-all",
                                    refreshInterval === v
                                        ? "bg-[#A3E635] text-black border-[#A3E635]"
                                        : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                )}
                            >
                                {v === 0 ? 'MAN' : `${v}m`}
                            </button>
                        ))}
                    </div>
                    {/* Cache + countdown indicator */}
                    {autoRefreshActive && nextRefreshIn !== null && (
                        <span className="font-mono text-[9px] text-[#4A4A4A] tabular-nums min-w-[4ch]">
                            {nextRefreshIn >= 60
                                ? `${Math.floor(nextRefreshIn / 60)}m${(nextRefreshIn % 60).toString().padStart(2, '0')}s`
                                : `${nextRefreshIn}s`}
                        </span>
                    )}
                    {(campFromCache || insightFromCache) && (
                        <span className="font-mono text-[9px] text-[#FBBF24] tracking-widest" title="Dados servidos do cache local">
                            [CACHE]
                        </span>
                    )}
                    <Button onClick={() => handleRefresh(true)} isLoading={isLoading} size="sm" variant="subtle" className="font-mono tracking-widest text-[9px]">REFRESH_SYNC</Button>
                    <AdsExportButton
                        campaigns={filteredCampaigns}
                        dailyInsights={dailyInsights}
                        period={filters.customRange ? `${filters.customRange.since}_${filters.customRange.until}` : filters.datePreset}
                        kpiSummary={filteredKpiSummary}
                        accountName={accountName}
                        accountId={adsAccountId ?? ''}
                        currency={currency}
                    />
                </div>
            </motion.div>

            {/* ─── Filtering Logic ─── */}
            <motion.div variants={item} className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 p-6 bg-[#0A0A0A] border rounded-[8px]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <span className="font-mono text-[10px] text-[#4A4A4A] tracking-[0.2em] uppercase">Controles de Período</span>
                        {isCustomRangeActive && (
                            <button onClick={handleDateChange.bind(null, 'last_30d')} className="text-[#A3E635] font-mono text-[10px] hover:underline">RESET_RANGE</button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {DATE_PRESETS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => handleDateChange(p.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-widest border transition-all",
                                    !isCustomRangeActive && filters.datePreset === p.value 
                                        ? "bg-[#A3E635] text-black border-[#A3E635]" 
                                        : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button onClick={() => setShowCustomRange(!showCustomRange)} 
                                className={cn("px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-widest border transition-all", showCustomRange ? "border-[#A3E635] text-[#A3E635]" : "border-white/5 text-[#4A4A4A]")}>
                            CUSTOM
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {showCustomRange && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/5">
                                    <input type="date" value={customSince} onChange={e => setCustomSince(e.target.value)} className="bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-[#A3E635]" />
                                    <span className="text-[#4A4A4A] font-mono text-[10px]">━━━━</span>
                                    <input type="date" value={customUntil} onChange={e => setCustomUntil(e.target.value)} className="bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-[#A3E635]" />
                                    <Button onClick={handleCustomRangeApply} size="sm" className="h-7 text-[9px] font-mono">APPLY_RANGE</Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="col-span-12 lg:col-span-4 p-6 bg-[#0A0A0A] border rounded-[8px] space-y-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div>
                        <span className="font-mono text-[10px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-4">Status da Mídia</span>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FILTERS.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => handleStatusFilter(s.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-widest border transition-all",
                                        filters.statusFilter === s.value
                                            ? "bg-[#A3E635] text-black border-[#A3E635]"
                                            : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* US-66 — Attribution Window Selector */}
                    <div className="pt-4 border-t border-white/5">
                        <span className="font-mono text-[10px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-4">Janela de Atribuição</span>
                        <div className="flex flex-wrap gap-1.5">
                            {([
                                { value: undefined, label: 'PADRÃO' },
                                { value: '1d_click', label: '1D CLICK' },
                                { value: '7d_click', label: '7D CLICK' },
                                { value: '28d_click', label: '28D CLICK' },
                                { value: '1d_view', label: '1D VIEW' },
                            ] as const).map(w => (
                                <button
                                    key={w.label}
                                    onClick={() => {
                                        setFilters({ attributionWindow: w.value as AttributionWindow | undefined });
                                        if (adsToken && adsAccountId) fetchAll(adsToken, adsAccountId, true);
                                    }}
                                    className={cn(
                                        "px-2 py-1 rounded font-mono text-[9px] uppercase tracking-widest border transition-all",
                                        filters.attributionWindow === w.value
                                            ? "bg-[#A3E635] text-black border-[#A3E635]"
                                            : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Hero KPI Band ─── */}
            {filteredKpiSummary && (
                <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Gasto: sempre presente */}
                    <KpiCard
                        label="Gasto Total"
                        value={formatCompact(filteredKpiSummary.totalSpend, true)}
                        delta={showDelta ? (kpiDelta?.totalSpend ?? undefined) : undefined}
                        deltaLabel={deltaLabel}
                        sparkline={spendSparkline.length > 1 ? spendSparkline : undefined}
                    />

                    {isAwarenessMode ? (
                        <>
                            {/* Awareness/Alcance: sem conversões por pixel — exibir engajamento */}
                            <KpiCard
                                label="Engajamentos"
                                value={filteredKpiSummary.totalEngagements.toString()}
                                delta={showDelta ? (kpiDelta?.totalEngagements ?? undefined) : undefined}
                                deltaLabel={deltaLabel}
                            />
                            <KpiCard
                                label="Custo/Engaj."
                                value={formatCurrency(filteredKpiSummary.costPerEngagement)}
                                delta={showDelta && kpiDelta?.costPerEngagement != null ? -kpiDelta.costPerEngagement : undefined}
                                deltaLabel={deltaLabel}
                            />
                            <KpiCard
                                label="Frequência"
                                value={filteredKpiSummary.avgFrequency.toFixed(2)}
                                delta={showDelta ? (kpiDelta?.avgFrequency ?? undefined) : undefined}
                                deltaLabel={deltaLabel}
                            />
                        </>
                    ) : (
                        <>
                            {/* Conversão: campanhas com pixel — Resultados/CPA/ROAS */}
                            <KpiCard
                                label="Resultados"
                                value={filteredKpiSummary.totalConversions.toString()}
                                delta={showConversionDelta ? (kpiDelta?.totalConversions ?? undefined) : undefined}
                                deltaLabel={deltaLabel}
                                sparkline={conversionsSparkline.length > 1 ? conversionsSparkline : undefined}
                            />
                            <KpiCard
                                label="Custo/Resu"
                                value={formatCurrency(filteredKpiSummary.cpa)}
                                delta={showConversionDelta && kpiDelta?.cpa != null ? -kpiDelta.cpa : undefined}
                                deltaLabel={deltaLabel}
                            />
                            <KpiCard
                                label="ROAS"
                                value={`${filteredKpiSummary.roas.toFixed(2)}x`}
                                delta={showConversionDelta ? (kpiDelta?.roas ?? undefined) : undefined}
                                deltaLabel={deltaLabel}
                                sparkline={roasSparkline.length > 1 ? roasSparkline : undefined}
                            />
                        </>
                    )}

                    <KpiCard
                        label="CTR"
                        value={`${filteredKpiSummary.avgCtr.toFixed(2)}%`}
                        delta={showDelta ? (kpiDelta?.avgCtr ?? undefined) : undefined}
                        deltaLabel={deltaLabel}
                    />
                    <KpiCard
                        label="CPM"
                        value={formatCurrency(filteredKpiSummary.avgCpm)}
                        delta={showDelta && kpiDelta?.avgCpm != null ? -kpiDelta.avgCpm : undefined}
                        deltaLabel={deltaLabel}
                    />
                </motion.div>
            )}

            {/* Badge: modo awareness — explica substituição dos KPI cards */}
            {isAwarenessMode && filteredKpiSummary && (
                <motion.div variants={item} className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#A3E635]/10 border border-[#A3E635]/20 font-mono text-[10px] text-[#A3E635] tracking-widest">
                    <span>◈</span>
                    <span>
                        <strong>Modo Awareness</strong> — campanhas desta conta focam em alcance e engajamento, sem conversões por pixel.
                        Exibindo <strong>Engajamentos, Custo/Engaj. e Frequência</strong> em vez de Resultados/CPA/ROAS.
                    </span>
                </motion.div>
            )}

            {/* Badge: dados de conversão incompletos em today/yesterday (attribution window) */}
            {isIncompleteData && filteredKpiSummary && (
                <motion.div variants={item} className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-blue-500/10 border border-blue-500/20 font-mono text-[10px] text-blue-400 tracking-widest">
                    <span>ℹ</span>
                    <span>
                        <strong>Resultados, ROAS e CPA</strong> podem estar incompletos — conversões têm latência de até 24h na Meta.
                        Variações suprimidas para estes KPIs.
                    </span>
                </motion.div>
            )}

            {/* Badge: sem atividade no período selecionado */}
            {!hasEnoughSample && filteredKpiSummary && !isLoading && (
                <motion.div variants={item} className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-zinc-500/10 border border-zinc-500/20 font-mono text-[10px] text-zinc-400 tracking-widest">
                    <span>⊘</span>
                    <span>Nenhuma atividade no período &quot;{DATE_PRESETS.find(p => p.value === filters.datePreset)?.label ?? 'selecionado'}&quot;. Tente um período mais amplo (ex: 30 dias).</span>
                </motion.div>
            )}

            {/* Badge: filtro de status ativo — KPIs mostram conta completa */}
            {filters.statusFilter !== 'all' && (
                <motion.div variants={item} className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-blue-500/10 border border-blue-500/20 font-mono text-[10px] text-blue-400 tracking-widest">
                    <span>◈</span>
                    <span>Filtro <strong>{STATUS_FILTERS.find(s => s.value === filters.statusFilter)?.label}</strong> ativo — KPIs e gráficos mostram dados da conta completa. Apenas a tabela é filtrada.</span>
                </motion.div>
            )}

            {/* ─── Layout & Navigation ─── */}
            <motion.div variants={item} className="space-y-8">
                <div className="flex items-center gap-0.5 bg-[#0A0A0A] border rounded-lg p-0.5 w-fit" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {([
                        { id: 'overview', label: 'CAMPANHAS' },
                        { id: 'creatives', label: 'CRIATIVOS' },
                        { id: 'charts', label: 'GRÁFICOS' },
                        { id: 'intelligence', label: 'INSIGHTS' },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative px-6 py-2 transition-colors duration-150",
                                activeTab === tab.id ? "text-[#F5F5F5]" : "text-[#4A4A4A] hover:text-[#8A8A8A]"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div layoutId="ads-tab-bg" className="absolute inset-0 bg-[#141414] rounded-[6px]" />
                            )}
                            <span className="relative z-10 font-bold text-[10px] tracking-[0.15em] uppercase">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'overview' && (
                        <div className="space-y-12">
                            {/* US-58 — Export CSV: Campanhas */}
                            {filteredCampaigns.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => downloadCsv(campaignsToCSV(filteredCampaigns, currency), csvFilename('campanhas'))}
                                        className="px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-widest border border-white/5 text-[#4A4A4A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all"
                                    >
                                        ↓ EXPORT CSV
                                    </button>
                                </div>
                            )}
                            <CampaignsTable
                                campaigns={filteredCampaigns}
                                adSets={filteredAdSets}
                                currency={currency}
                                onToggleStatus={handleToggleCampaignStatus}
                                onExpandCampaign={setExpandedCampaign}
                                expandedCampaignId={expandedCampaignId}
                            />
                            <AdsABTestCard adSets={filteredAdSets} currency={currency} />
                        </div>
                    )}

                    {activeTab === 'creatives' && (
                        <div className="space-y-12">
                            {/* US-67+68: Creative Library + Analysis Panel */}
                            <AdsCreativeLibrary
                                token={adsToken}
                                accountId={adsAccountId}
                            />
                            {/* Legacy gallery + performance ranking */}
                            <CreativesGallery
                                ads={creativeAds}
                                currency={currency}
                                isLoading={isLoadingCreatives}
                                error={creativesError}
                                onFetchCreatives={handleFetchCreatives}
                            />
                            {creativeAds.length >= 2 && (
                                <AdsCreativePerformance ads={creativeAds} currency={currency} />
                            )}
                        </div>
                    )}

                    {activeTab === 'charts' && (
                        <div className="space-y-3">
                            {/* US-58 — Export CSV: Insights diários */}
                            {dailyInsights.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => downloadCsv(dailyInsightsToCSV(dailyInsights, currency), csvFilename('insights-diarios'))}
                                        className="px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-widest border border-white/5 text-[#4A4A4A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all"
                                    >
                                        ↓ EXPORT CSV
                                    </button>
                                </div>
                            )}
                            {dailyFallbackPreset && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#FBBF24]/10 border border-[#FBBF24]/20 font-mono text-[10px] text-[#FBBF24] tracking-widest">
                                    <span>⚠</span>
                                    <span>
                                        Sem dados para &quot;{DATE_PRESETS.find(p => p.value === filters.datePreset)?.label}&quot;.
                                        Exibindo período mais amplo: <strong>{DATE_PRESETS.find(p => p.value === dailyFallbackPreset)?.label ?? dailyFallbackPreset}</strong>.
                                    </span>
                                </div>
                            )}
                            <AdsCharts
                                daily={dailyInsights}
                                campaigns={campaigns}
                                currency={currency}
                                isLoading={isLoading}
                                dateLabel={filters.customRange
                                    ? `${filters.customRange.since} → ${filters.customRange.until}`
                                    : DATE_PRESETS.find(p => p.value === filters.datePreset)?.label}
                            />
                        </div>
                    )}

                    {activeTab === 'intelligence' && (
                        <div className="space-y-16">
                            {filteredKpiSummary && (
                                <AdsProfitDashboard
                                    kpi={filteredKpiSummary}
                                    campaigns={campaigns}
                                />
                            )}
                            <AdsIntelligencePanelV2
                                token={adsToken}
                                accountId={adsAccountId}
                                daily={dailyInsights}
                                campaigns={campaigns}
                            />
                            {dailyInsights.length >= 14 && (
                                <AdsMMMSection daily={dailyInsights} currency={currency} />
                            )}
                            {dailyInsights.length >= 14 && (
                                <AdsIncrementalitySection daily={dailyInsights} currency={currency} />
                            )}
                            {campaigns.length >= 2 && (
                                <AdsBudgetAllocation campaigns={campaigns} currency={currency} />
                            )}
                            {/* US-62: Multi-Account Overview */}
                            {adsToken && (
                                <AdsMultiAccountOverview
                                    token={adsToken}
                                    datePreset={filters.customRange ? undefined : filters.datePreset}
                                    timeRange={filters.customRange}
                                />
                            )}
                            {/* US-69 + US-70: Demographics + Placement */}
                            <AdsDemographicsSection
                                token={adsToken}
                                accountId={adsAccountId}
                                datePreset={filters.customRange ? undefined : filters.datePreset}
                                timeRange={filters.customRange}
                            />
                            {/* US-63: Budget Pacing Alerts */}
                            {campaigns.length > 0 && (
                                <AdsBudgetPacing campaigns={campaigns} currency={currency} />
                            )}
                            {/* US-64: Automated Rules Engine */}
                            <AdsRulesEngine
                                campaigns={campaigns}
                                token={adsToken}
                                accountId={adsAccountId}
                            />
                            {/* US-60: Scheduled Reports */}
                            <AdsScheduledReports
                                token={adsToken}
                                accountId={adsAccountId}
                                accountName={accountName}
                                datePreset={filters.customRange ? undefined : filters.datePreset}
                            />
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
