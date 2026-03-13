'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdsStore, useAccountStore, useSettingsStore } from '@/stores';
import { AdsKpiCards } from '@/features/ads/components/ads-kpi-cards';
import { CampaignsTable } from '@/features/ads/components/campaigns-table';
import { AdsCharts } from '@/features/ads/components/ads-charts';
import { AdsAiPanel } from '@/features/ads/components/ads-ai-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Megaphone, RefreshCw, Loader2, AlertCircle,
    BarChart3, Table, Brain, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdsDatePreset } from '@/types/ads';

type ViewTab = 'overview' | 'charts' | 'intelligence';

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
        fetchAll, setFilters, setExpandedCampaign, updateCampaignStatus,
    } = adsStore;

    // Encontrar conta com ads_token
    const [adsToken, setAdsToken] = useState<string | null>(null);
    const [adsAccountId, setAdsAccountId] = useState<string | null>(null);
    const [accountName, setAccountName] = useState<string>('');

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
        setFilters({ datePreset: preset });
        if (adsToken && adsAccountId) {
            // Pequeno delay para state atualizar
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
        }
    }, [adsToken, adsAccountId, setFilters, fetchAll]);

    const handleStatusFilter = useCallback((status: string) => {
        setFilters({ statusFilter: status as any });
        if (adsToken && adsAccountId) {
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
        }
    }, [adsToken, adsAccountId, setFilters, fetchAll]);

    const handleToggleCampaignStatus = useCallback(async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
        if (!adsToken) return false;
        return updateCampaignStatus(adsToken, campaignId, newStatus);
    }, [adsToken, updateCampaignStatus]);

    const currency = account?.currency || kpiSummary?.currency || 'BRL';

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

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Período:</span>
                {DATE_PRESETS.map(p => (
                    <Button
                        key={p.value}
                        variant={filters.datePreset === p.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleDateChange(p.value)}
                    >
                        {p.label}
                    </Button>
                ))}
                <div className="w-px h-6 bg-border mx-2" />
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
            {kpiSummary && (
                <>
                    {/* KPI Cards */}
                    <AdsKpiCards kpi={kpiSummary} />

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b">
                        {([
                            { id: 'overview', label: 'Campanhas', icon: Table },
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
                            campaigns={campaigns}
                            adSets={adSets}
                            currency={currency}
                            onToggleStatus={handleToggleCampaignStatus}
                            onExpandCampaign={setExpandedCampaign}
                            expandedCampaignId={expandedCampaignId}
                        />
                    )}

                    {activeTab === 'charts' && (
                        <AdsCharts
                            daily={dailyInsights}
                            campaigns={campaigns}
                            currency={currency}
                        />
                    )}

                    {activeTab === 'intelligence' && (
                        <AdsAiPanel
                            kpi={kpiSummary}
                            campaigns={campaigns}
                            daily={dailyInsights}
                            currency={currency}
                        />
                    )}
                </>
            )}
        </div>
    );
}
