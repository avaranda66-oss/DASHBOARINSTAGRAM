'use client';

import { create } from 'zustand';
import type {
    AdCampaign, AdSet, Ad, AdAccount, AdInsight,
    AdsKpiSummary, AdsKpiDelta, DailyAdInsight, AdsDatePreset, AdsFilters,
    IntelligenceMetrics, MetaAdAccount,
} from '@/types/ads';
import { cachedFetch, invalidateCache } from '@/lib/utils/request-cache';

interface AdsSlice {
    // Data
    account: AdAccount | null;
    campaigns: AdCampaign[];
    adSets: AdSet[];
    ads: Ad[];
    insights: AdInsight[];
    dailyInsights: DailyAdInsight[];
    kpiSummary: AdsKpiSummary | null;
    kpiDelta: AdsKpiDelta | null;
    dailyFallbackPreset: string | null; // preset usado quando fallback ativado

    // Creatives
    creativeAds: Ad[];
    isLoadingCreatives: boolean;
    creativesError: string | null;

    // Intelligence
    intelligenceMetrics: IntelligenceMetrics | null;
    isLoadingIntelligence: boolean;
    intelligenceError: string | null;
    creativeScores: Record<string, import('@/types/ads').CreativeScore>;

    // State
    isLoading: boolean;
    error: string | null;
    lastFetchedAt: string | null;
    selectedCampaignId: string | null;
    expandedCampaignId: string | null;
    filters: AdsFilters;

    // Cache metadata
    campFromCache: boolean;
    insightFromCache: boolean;

    // Multi-Account — US-61
    availableAccounts: MetaAdAccount[];
    isLoadingAccounts: boolean;
    fetchAdAccounts: (token: string) => Promise<void>;

    // Actions
    fetchAll: (token: string, accountId: string, forceRefresh?: boolean) => Promise<void>;
    fetchInsights: (token: string, accountId: string) => Promise<void>;
    fetchCreatives: (token: string, accountId: string) => Promise<void>;
    fetchIntelligence: (token: string, accountId: string) => Promise<void>;
    setFilters: (filters: Partial<AdsFilters>) => void;
    setSelectedCampaign: (id: string | null) => void;
    setExpandedCampaign: (id: string | null) => void;
    updateCampaignStatus: (token: string, campaignId: string, status: 'ACTIVE' | 'PAUSED') => Promise<boolean>;
    updateCampaignBudget: (token: string, campaignId: string, dailyBudget: number) => Promise<boolean>;
    clearAll: () => void;
}

export const useAdsStore = create<AdsSlice>((set, get) => ({
    account: null,
    campaigns: [],
    adSets: [],
    ads: [],
    insights: [],
    dailyInsights: [],
    kpiSummary: null,
    kpiDelta: null,
    dailyFallbackPreset: null,
    creativeAds: [],
    isLoadingCreatives: false,
    creativesError: null,
    intelligenceMetrics: null,
    isLoadingIntelligence: false,
    intelligenceError: null,
    creativeScores: {},
    campFromCache: false,
    insightFromCache: false,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
    selectedCampaignId: null,
    expandedCampaignId: null,
    filters: {
        datePreset: 'last_30d',
        statusFilter: 'all',
    },

    // Multi-Account — US-61
    availableAccounts: [],
    isLoadingAccounts: false,

    fetchAdAccounts: async (token) => {
        set({ isLoadingAccounts: true });
        try {
            const res = await fetch(`/api/meta/adaccounts?token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (data.success) {
                set({ availableAccounts: data.accounts, isLoadingAccounts: false });
            } else {
                set({ isLoadingAccounts: false });
            }
        } catch {
            set({ isLoadingAccounts: false });
        }
    },

    fetchAll: async (token, accountId, forceRefresh = false) => {
        set({ isLoading: true, error: null });
        try {
            const { filters } = get();

            // Build date params — custom range overrides preset
            const dateParams = filters.customRange
                ? { timeRange: filters.customRange }
                : { datePreset: filters.datePreset };

            const campBody = { token, accountId, ...dateParams, includeSets: true };
            const insightBody = {
                token,
                accountId,
                ...dateParams,
                ...(filters.attributionWindow ? { attributionWindow: filters.attributionWindow } : {}),
            };

            // Buscar campanhas + insights em paralelo com cache/dedup
            const [campResult, insightResult] = await Promise.all([
                cachedFetch<any>('/api/ads-campaigns', campBody, { forceRefresh }),
                cachedFetch<any>('/api/ads-insights', insightBody, { forceRefresh }),
            ]);

            const campRes = campResult.data;
            const insightRes = insightResult.data;

            if (!campRes.success) throw new Error(campRes.error);
            if (!insightRes.success) throw new Error(insightRes.error);

            set({
                account: campRes.account,
                campaigns: campRes.campaigns || [],
                adSets: campRes.adSets || [],
                ads: campRes.ads || [],
                insights: insightRes.insights || [],
                dailyInsights: insightRes.daily || [],
                kpiSummary: insightRes.kpiSummary || null,
                kpiDelta: insightRes.kpiDelta || null,
                dailyFallbackPreset: insightRes.usedPreset || null,
                campFromCache: campResult.fromCache,
                insightFromCache: insightResult.fromCache,
                lastFetchedAt: new Date().toISOString(),
                isLoading: false,
            });
        } catch (e: any) {
            console.error('[AdsStore] fetchAll erro:', e);
            set({ error: e.message || 'Erro ao buscar campanhas.', isLoading: false });
        }
    },

    fetchInsights: async (token, accountId) => {
        try {
            const { filters } = get();
            const dateParams = filters.customRange
                ? { timeRange: filters.customRange }
                : { datePreset: filters.datePreset };
            const res = await fetch('/api/ads-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    accountId,
                    ...dateParams,
                }),
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            });

            if (!res.success) throw new Error(res.error);

            set({
                dailyInsights: res.daily || [],
                insights: res.insights || [],
                kpiSummary: res.kpiSummary || null,
                kpiDelta: res.kpiDelta || null,
            });
        } catch (e: any) {
            console.error('[AdsStore] fetchInsights erro:', e);
        }
    },

    fetchCreatives: async (token, accountId) => {
        set({ isLoadingCreatives: true, creativesError: null });
        try {
            const { filters } = get();
            const dateParams = filters.customRange
                ? { timeRange: filters.customRange }
                : { datePreset: filters.datePreset };

            const res = await fetch('/api/ads-creatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, accountId, ...dateParams }),
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            });

            if (!res.success) throw new Error(res.error);

            set({
                creativeAds: res.ads || [],
                isLoadingCreatives: false,
            });
        } catch (e: unknown) {
            console.error('[AdsStore] fetchCreatives erro:', e);
            const message = e instanceof Error ? e.message : 'Erro ao buscar criativos.';
            set({ creativesError: message, isLoadingCreatives: false });
        }
    },

    fetchIntelligence: async (token, accountId) => {
        set({ isLoadingIntelligence: true, intelligenceError: null });
        try {
            const { filters, kpiSummary } = get();
            const dateParams = filters.customRange
                ? { timeRange: filters.customRange }
                : { datePreset: filters.datePreset };

            const res = await fetch('/api/ads-intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, accountId, ...dateParams, kpiSummary }),
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            });

            if (!res.success) throw new Error(res.error);

            set({
                intelligenceMetrics: res.metrics,
                isLoadingIntelligence: false,
            });
        } catch (e: unknown) {
            console.error('[AdsStore] fetchIntelligence erro:', e);
            const message = e instanceof Error ? e.message : 'Erro ao carregar inteligência.';
            set({ intelligenceError: message, isLoadingIntelligence: false });
        }
    },

    setFilters: (partial) => {
        const { filters } = get();
        set({ filters: { ...filters, ...partial } });
    },

    setSelectedCampaign: (id) => set({ selectedCampaignId: id }),
    setExpandedCampaign: (id) => {
        const current = get().expandedCampaignId;
        set({ expandedCampaignId: current === id ? null : id });
    },

    updateCampaignStatus: async (token, campaignId, status) => {
        try {
            const res = await fetch('/api/ads-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'campaign_status', targetId: campaignId, status }),
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            });

            if (res.success) {
                // Atualizar localmente
                const { campaigns } = get();
                set({
                    campaigns: campaigns.map(c =>
                        c.id === campaignId ? { ...c, status, effective_status: status } : c
                    ),
                });
            }
            return res.success;
        } catch (e) {
            console.error('[AdsStore] updateStatus erro:', e);
            return false;
        }
    },

    updateCampaignBudget: async (token, campaignId, dailyBudget) => {
        try {
            const res = await fetch('/api/ads-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'campaign_budget', targetId: campaignId, dailyBudget }),
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            });

            if (res.success) {
                const { campaigns } = get();
                set({
                    campaigns: campaigns.map(c =>
                        c.id === campaignId
                            ? { ...c, daily_budget: Math.round(dailyBudget * 100).toString() }
                            : c
                    ),
                });
            }
            return res.success;
        } catch (e) {
            console.error('[AdsStore] updateBudget erro:', e);
            return false;
        }
    },

    clearAll: () => set({
        account: null,
        campaigns: [],
        adSets: [],
        ads: [],
        insights: [],
        dailyInsights: [],
        kpiSummary: null,
        kpiDelta: null,
        creativeAds: [],
        isLoadingCreatives: false,
        creativesError: null,
        intelligenceMetrics: null,
        isLoadingIntelligence: false,
        intelligenceError: null,
        creativeScores: {},
        campFromCache: false,
        insightFromCache: false,
        error: null,
        lastFetchedAt: null,
        selectedCampaignId: null,
    }),
}));
