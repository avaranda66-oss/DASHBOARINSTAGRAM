'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdsStore, useAccountStore, useSettingsStore } from '@/stores';
import { CampaignsTable } from '@/features/ads/components/campaigns-table';
import { AdsCharts } from '@/features/ads/components/ads-charts';
import { AdsIntelligencePanelV2 } from '@/features/ads/components/ads-intelligence-panel-v2';
import { CreativesGallery } from '@/features/ads/components/creatives-gallery';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/design-system/atoms/Button';
import { KpiCard } from '@/design-system/molecules/KpiCard';
import { Badge } from '@/design-system/atoms/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { AdsDatePreset } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

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
    const accountStore = useAccountStore();
    const settingsStore = useSettingsStore();
    const adsStore = useAdsStore();

    const {
        campaigns, adSets, kpiSummary, dailyInsights, account,
        isLoading, error, lastFetchedAt, filters, expandedCampaignId,
        creativeAds, isLoadingCreatives, creativesError,
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
        const accts = accountStore.accounts;
        const withAds = accts.find(a => a.adsToken && a.adsAccountId);
        if (withAds) {
            setAdsToken(withAds.adsToken!);
            setAdsAccountId(withAds.adsAccountId!);
            setAccountName(withAds.name || withAds.handle);
        }
    }, [accountStore.accounts]);

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
        if (!customSince || !customUntil) return;
        setIsCustomRangeActive(true);
        setShowCustomRange(false);
        setFilters({ customRange: { since: customSince, until: customUntil } });
        if (adsToken && adsAccountId) {
            setTimeout(() => fetchAll(adsToken, adsAccountId), 50);
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
    }, [activeTab, adsToken, adsAccountId]);

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

    const filteredKpiSummary = useMemo(() => {
        if (!kpiSummary) return kpiSummary;
        if (selectedCampaignFilter === 'all' && filters.statusFilter === 'all') return kpiSummary;
        
        const filtered = filteredCampaigns;
        let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
        let totalConversions = 0, totalConversionValue = 0;
        let weightedCtr = 0;

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
            weightedCtr += (parseFloat(i.ctr || '0') || 0) * impressions;

            if (i.actions) {
                const convTypes = ['offsite_conversion', 'lead', 'purchase'];
                for (const a of i.actions) {
                    if (convTypes.some(t => a.action_type.includes(t))) {
                        totalConversions += parseInt(a.value) || 0;
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
            totalConversions,
            roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
            cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
        };
    }, [filteredCampaigns, kpiSummary, selectedCampaignFilter, filters.statusFilter]);

    const currency = account?.currency || kpiSummary?.currency || 'BRL';

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
    };

    const formatCompact = (val: number, isCurrency = false) => {
        let formatted = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0);
        if (val >= 1000000) formatted = (val / 1000000).toFixed(1) + 'M';
        return isCurrency ? `${currency} ${formatted}` : formatted;
    };

    if (!adsToken || !adsAccountId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <span className="font-mono text-[40px] text-[#2A2A2A] select-none">◆</span>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold uppercase tracking-tight text-[#F5F5F5]">Configuração Requerida</h2>
                    <p className="text-[13px] text-[#4A4A4A] max-w-sm mx-auto">
                        Token Facebook Ads ausente ou inválido. Prossiga para as configurações de conta para estabelecer a conexão 
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard/accounts'} className="font-mono tracking-widest text-[10px]">FIX_CONNECTION ↗</Button>
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
                    </div>
                    <div className="flex items-center gap-4 text-[12px] font-mono text-[#4A4A4A] tracking-tight">
                        <span>ID: {adsAccountId}</span>
                        {lastFetchedAt && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635]" />
                                UPDATED: {new Date(lastFetchedAt).toLocaleTimeString('pt-BR')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleRefresh} isLoading={isLoading} size="sm" variant="subtle" className="font-mono tracking-widest text-[9px]">REFRESH_SYNC</Button>
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

                <div className="col-span-12 lg:col-span-4 p-6 bg-[#0A0A0A] border rounded-[8px]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="font-mono text-[10px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-6">Status da Mídia</span>
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
            </motion.div>

            {/* ─── Hero KPI Band ─── */}
            {filteredKpiSummary && (
                <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KpiCard label="Gasto Total" value={formatCompact(filteredKpiSummary.totalSpend, true)} delta={12} deltaLabel="vs. 7 dias" sparkline={[100, 120, 110, 150, 140, 180, 200]} />
                    <KpiCard label="Resultados" value={filteredKpiSummary.totalConversions.toString()} delta={-5} deltaLabel="vs. 7 dias" sparkline={[50, 45, 48, 42, 40, 38, 35]} />
                    <KpiCard label="Custo/Resu" value={formatCurrency(filteredKpiSummary.cpa)} delta={8} deltaLabel="vs. 7 dias" />
                    <KpiCard label="ROAS" value={`${filteredKpiSummary.roas.toFixed(2)}x`} delta={15} deltaLabel="vs. 7 dias" sparkline={[2.5, 3.1, 2.8, 3.5, 3.2, 3.8, 4.1]} />
                    <KpiCard label="CTR" value={`${filteredKpiSummary.avgCtr.toFixed(2)}%`} delta={2} deltaLabel="vs. 7 dias" />
                    <KpiCard label="CPM" value={formatCurrency(filteredKpiSummary.totalSpend / (filteredKpiSummary.totalImpressions / 1000))} />
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
                            <CampaignsTable
                                campaigns={filteredCampaigns}
                                adSets={filteredAdSets}
                                currency={currency}
                                onToggleStatus={handleToggleCampaignStatus}
                                onExpandCampaign={setExpandedCampaign}
                                expandedCampaignId={expandedCampaignId}
                            />
                        </div>
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
                            daily={dailyInsights}
                            campaigns={filteredCampaigns}
                            currency={currency}
                        />
                    )}

                    {activeTab === 'intelligence' && (
                        <AdsIntelligencePanelV2
                            token={adsToken}
                            accountId={adsAccountId}
                        />
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
