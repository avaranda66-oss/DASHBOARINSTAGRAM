'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdsStore, useAccountStore, useSettingsStore } from '@/stores';
import { AdsKpiCards } from '@/features/ads/components/ads-kpi-cards';
import { CampaignsTable } from '@/features/ads/components/campaigns-table';
import { AdsCharts } from '@/features/ads/components/ads-charts';
import { AdsAiPanel } from '@/features/ads/components/ads-ai-panel';
import { CreativesGallery } from '@/features/ads/components/creatives-gallery';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Megaphone, RefreshCw, Loader2, AlertCircle,
    BarChart3, Table, Brain, Clock, CalendarDays, Filter, X,
    Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdsDatePreset } from '@/types/ads';

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
    { value: 'all', label: 'Todas' },
    { value: 'ACTIVE', label: 'Ativas' },
    { value: 'PAUSED', label: 'Pausadas' },
    { value: 'ARCHIVED', label: 'Arquivadas' },
] as const;

export default function AdsDashboardPage() {
    const [activeTab, setActiveTab] = useState<ViewTab>('overview');
    const accountStore = useAccountStore();
    const settingsStore = useSettingsStore();
    const adsStore = useAdsStore();

    const {
        campaigns, adSets, kpiSummary, dailyInsights, account,
        isLoading, error, lastFetchedAt, filters, expandedCampaignId,
        creativeAds, isLoadingCreatives, creativesError,
        fetchAll, fetchCreatives, setFilters, setExpandedCampaign, updateCampaignStatus,
    } = adsStore;

    // Encontrar conta com ads_token
    const [adsToken, setAdsToken] = useState<string | null>(null);
    const [adsAccountId, setAdsAccountId] = useState<string | null>(null);
    const [accountName, setAccountName] = useState<string>('');

    // Custom date range state
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customSince, setCustomSince] = useState('');
    const [customUntil, setCustomUntil] = useState('');
    const [isCustomRangeActive, setIsCustomRangeActive] = useState(false);

    // Campaign filter state
    const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all');

    useEffect(() => {
        if (!accountStore.isLoaded) accountStore.loadAccounts();
        if (!settingsStore.settings) settingsStore.loadSettings();
    }, []);

    useEffect(() => {
        const accts = accountStore.accounts;
        const withAds = accts.find(a => a.adsToken && a.adsAccountId);
        if (withAds) {
            setAdsToken(withAds.adsToken!);
            setAdsAccountId(withAds.adsAccountId!);
            setAccountName(withAds.name || withAds.handle);
        }
    }, [accountStore.accounts]);

    // Auto-fetch quando token e accountId estão disponíveis
    useEffect(() => {
        if (adsToken && adsAccountId && !lastFetchedAt && !isLoading) {
            fetchAll(adsToken, adsAccountId);
        }
    }, [adsToken, adsAccountId]);

    const handleRefresh = useCallback(() => {
        if (adsToken && adsAccountId) {
            fetchAll(adsToken, adsAccountId);
            toast.success('Atualizando dados de campanhas...');
        }
    }, [adsToken, adsAccountId, fetchAll]);

    const handleDateChange = useCallback((preset: AdsDatePreset) => {
        setIsCustomRangeActive(false);
        setShowCustomRange(false);
        setFilters({ datePreset: preset, customRange: undefined });
        if (adsToken && adsAccountId) {
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
        }
    }, [adsToken, adsAccountId, setFilters, fetchAll]);

    const handleCustomRangeApply = useCallback(() => {
        if (!customSince || !customUntil) {
            toast.error('Selecione as duas datas.');
            return;
        }
        if (customSince > customUntil) {
            toast.error('A data inicial deve ser anterior à data final.');
            return;
        }
        setIsCustomRangeActive(true);
        setShowCustomRange(false);
        setFilters({ customRange: { since: customSince, until: customUntil } });
        if (adsToken && adsAccountId) {
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
        }
    }, [customSince, customUntil, adsToken, adsAccountId, setFilters, fetchAll]);

    const handleClearCustomRange = useCallback(() => {
        setIsCustomRangeActive(false);
        setCustomSince('');
        setCustomUntil('');
        setFilters({ customRange: undefined, datePreset: 'last_30d' });
        if (adsToken && adsAccountId) {
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
        }
    }, [adsToken, adsAccountId, setFilters, fetchAll]);

    const handleStatusFilter = useCallback((status: string) => {
        setFilters({ statusFilter: status as any });
        // Status filter is client-side only — no API refetch needed
    }, [setFilters]);

    const handleFetchCreatives = useCallback(() => {
        if (adsToken && adsAccountId) {
            fetchCreatives(adsToken, adsAccountId);
        }
    }, [adsToken, adsAccountId, fetchCreatives]);

    const handleToggleCampaignStatus = useCallback(async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
        if (!adsToken) return false;
        return updateCampaignStatus(adsToken, campaignId, newStatus);
    }, [adsToken, updateCampaignStatus]);

    // Filter data by selected campaign + status
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

    const filteredKpiSummary = useMemo(() => {
        if (!kpiSummary) return kpiSummary;
        // If both filters are "all", return raw KPIs
        if (selectedCampaignFilter === 'all' && filters.statusFilter === 'all') return kpiSummary;
        // Recompute KPIs from filtered campaign insights
        const filtered = filteredCampaigns;
        let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
        let totalConversions = 0, totalConversionValue = 0;
        let weightedCpc = 0, weightedCtr = 0;

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
            weightedCpc += (parseFloat(i.cpc || '0') || 0) * clicks;
            weightedCtr += (parseFloat(i.ctr || '0') || 0) * impressions;
        }

        return {
            ...kpiSummary,
            totalSpend,
            totalImpressions,
            totalClicks,
            totalReach,
            avgCpc: totalClicks > 0 ? weightedCpc / totalClicks : 0,
            avgCtr: totalImpressions > 0 ? weightedCtr / totalImpressions : 0,
            totalConversions,
            totalConversionValue,
            roas: 0,
            cpa: 0,
            activeCampaigns: filtered.filter(c => c.effective_status === 'ACTIVE').length,
            pausedCampaigns: filtered.filter(c => c.effective_status === 'PAUSED').length,
        };
    }, [filteredCampaigns, kpiSummary, selectedCampaignFilter]);

    const filteredDailyInsights = useMemo(() => {
        // Daily insights are account-level, so we can't filter by campaign client-side perfectly
        // But when a campaign is selected, we show what we have
        return dailyInsights;
    }, [dailyInsights]);

    const currency = account?.currency || kpiSummary?.currency || 'BRL';

    // Custom range display label
    const customRangeLabel = isCustomRangeActive && customSince && customUntil
        ? `${new Date(customSince + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${new Date(customUntil + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
        : null;

    // Estado sem configuração
    if (!adsToken || !adsAccountId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="p-4 rounded-full bg-muted">
                    <Megaphone className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Métricas de Campanhas</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Nenhuma conta com token de Facebook Ads configurado.
                    Vá em <strong>Contas → Editar</strong> e adicione o <strong>Token Facebook Ads</strong> e o <strong>Ad Account ID</strong>.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-blue-500" />
                        <h1 className="text-2xl font-bold">Métricas de Campanhas</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {accountName} — {adsAccountId}
                        {lastFetchedAt && (
                            <span className="ml-2 inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Atualizado {new Date(lastFetchedAt).toLocaleTimeString('pt-BR')}
                            </span>
                        )}
                    </p>
                </div>
                <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Atualizar
                </Button>
            </div>

            {/* Filtros — Período */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Período:</span>
                    {DATE_PRESETS.map(p => (
                        <Button
                            key={p.value}
                            variant={!isCustomRangeActive && filters.datePreset === p.value ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDateChange(p.value)}
                        >
                            {p.label}
                        </Button>
                    ))}

                    {/* Custom range toggle */}
                    {!isCustomRangeActive ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowCustomRange(!showCustomRange)}
                        >
                            <CalendarDays className="h-3 w-3" />
                            Personalizado
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={handleClearCustomRange}
                        >
                            <CalendarDays className="h-3 w-3" />
                            {customRangeLabel}
                            <X className="h-3 w-3 ml-1" />
                        </Button>
                    )}
                </div>

                {/* Custom date range inputs */}
                {showCustomRange && !isCustomRangeActive && (
                    <div className="flex items-center gap-2 pl-[4.5rem]">
                        <input
                            type="date"
                            value={customSince}
                            onChange={e => setCustomSince(e.target.value)}
                            className="h-8 px-2 text-xs border rounded-md bg-background"
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <input
                            type="date"
                            value={customUntil}
                            onChange={e => setCustomUntil(e.target.value)}
                            className="h-8 px-2 text-xs border rounded-md bg-background"
                        />
                        <Button size="sm" className="h-8 text-xs" onClick={handleCustomRangeApply}>
                            Aplicar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowCustomRange(false)}>
                            Cancelar
                        </Button>
                    </div>
                )}

                {/* Filtros — Status + Campanha */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Status:</span>
                    {STATUS_FILTERS.map(s => (
                        <Button
                            key={s.value}
                            variant={filters.statusFilter === s.value ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleStatusFilter(s.value)}
                        >
                            {s.label}
                        </Button>
                    ))}

                    {campaigns.length > 0 && (
                        <>
                            <div className="w-px h-6 bg-border mx-2" />
                            <span className="text-xs text-muted-foreground mr-1">
                                <Filter className="h-3 w-3 inline mr-1" />
                                Campanha:
                            </span>
                            <select
                                value={selectedCampaignFilter}
                                onChange={e => setSelectedCampaignFilter(e.target.value)}
                                className="h-7 px-2 text-xs border rounded-md bg-background text-foreground max-w-[240px]"
                            >
                                <option value="all">Todas as campanhas</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.effective_status === 'ACTIVE' ? 'Ativa' : c.effective_status === 'PAUSED' ? 'Pausada' : c.effective_status})
                                    </option>
                                ))}
                            </select>
                            {selectedCampaignFilter !== 'all' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setSelectedCampaignFilter('all')}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Erro */}
            {error && (
                <Card className="p-4 border-red-500/30 bg-red-500/5 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-500">Erro ao carregar dados</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={handleRefresh}>
                        Tentar novamente
                    </Button>
                </Card>
            )}

            {/* Loading */}
            {isLoading && !kpiSummary && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Carregando campanhas da Meta API...</span>
                </div>
            )}

            {/* Conteúdo principal */}
            {filteredKpiSummary && (
                <>
                    {/* KPI Cards */}
                    <AdsKpiCards kpi={filteredKpiSummary} />

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b">
                        {([
                            { id: 'overview', label: 'Campanhas', icon: Table },
                            { id: 'creatives', label: 'Criativos', icon: ImageIcon },
                            { id: 'charts', label: 'Gráficos', icon: BarChart3 },
                            { id: 'intelligence', label: 'Inteligência', icon: Brain },
                        ] as const).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <CampaignsTable
                            campaigns={filteredCampaigns}
                            adSets={filteredAdSets}
                            currency={currency}
                            onToggleStatus={handleToggleCampaignStatus}
                            onExpandCampaign={setExpandedCampaign}
                            expandedCampaignId={expandedCampaignId}
                        />
                    )}

                    {activeTab === 'creatives' && (
                        <CreativesGallery
                            ads={creativeAds}
                            currency={currency}
                            isLoading={isLoadingCreatives}
                            error={creativesError}
                            onFetchCreatives={handleFetchCreatives}
                        />
                    )}

                    {activeTab === 'charts' && (
                        <AdsCharts
                            daily={filteredDailyInsights}
                            campaigns={filteredCampaigns}
                            currency={currency}
                        />
                    )}

                    {activeTab === 'intelligence' && (
                        <AdsAiPanel
                            kpi={filteredKpiSummary}
                            campaigns={filteredCampaigns}
                            daily={filteredDailyInsights}
                            currency={currency}
                        />
                    )}
                </>
            )}
        </div>
    );
}
