// ─── Facebook Ads Types ─────────────────────────────────────────────────────

/** Status de uma campanha/adset/ad */
export type AdStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
export type AdEffectiveStatus =
    | 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
    | 'IN_PROCESS' | 'WITH_ISSUES' | 'CAMPAIGN_PAUSED'
    | 'ADSET_PAUSED' | 'DISAPPROVED' | 'PENDING_REVIEW'
    | 'PREAPPROVED' | 'PENDING_BILLING_INFO';

/** Objetivo de campanha */
export type CampaignObjective =
    | 'OUTCOME_AWARENESS' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_LEADS'
    | 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' | 'OUTCOME_APP_PROMOTION'
    | 'LINK_CLICKS' | 'POST_ENGAGEMENT' | 'REACH' | 'CONVERSIONS'
    | 'MESSAGES' | 'VIDEO_VIEWS' | 'BRAND_AWARENESS' | string;

/** Ação retornada pela API de insights */
export interface AdActionStat {
    action_type: string;
    value: string;
}

/** Insights de performance */
export interface AdInsight {
    campaign_id?: string;
    campaign_name?: string;
    adset_id?: string;
    adset_name?: string;
    ad_id?: string;
    ad_name?: string;
    impressions: string;
    clicks: string;
    spend: string;
    cpc?: string;
    cpm?: string;
    ctr?: string;
    outbound_clicks?: AdActionStat[];
    outbound_clicks_ctr?: AdActionStat[];
    reach?: string;
    frequency?: string;
    actions?: AdActionStat[];
    cost_per_action_type?: AdActionStat[];
    purchase_roas?: AdActionStat[];
    date_start: string;
    date_stop: string;
    objective?: string;
    account_currency?: string;
}

/** Campanha do Facebook Ads */
export interface AdCampaign {
    id: string;
    name: string;
    status: AdStatus;
    effective_status: AdEffectiveStatus;
    objective: CampaignObjective;
    daily_budget?: string;
    lifetime_budget?: string;
    budget_remaining?: string;
    created_time: string;
    updated_time?: string;
    start_time?: string;
    stop_time?: string;
    // Insights agregados (preenchidos separadamente)
    insights?: AdInsight;
}

/** Conjunto de anúncios */
export interface AdSet {
    id: string;
    name: string;
    campaign_id: string;
    status: AdStatus;
    effective_status: AdEffectiveStatus;
    daily_budget?: string;
    lifetime_budget?: string;
    budget_remaining?: string;
    billing_event?: string;
    optimization_goal?: string;
    bid_amount?: string;
    targeting?: Record<string, unknown>;
    created_time: string;
    start_time?: string;
    end_time?: string;
    insights?: AdInsight;
}

/** Anúncio individual */
export interface Ad {
    id: string;
    name: string;
    adset_id: string;
    campaign_id?: string;
    status: AdStatus;
    effective_status: AdEffectiveStatus;
    creative?: {
        id: string;
        thumbnail_url?: string;
        image_url?: string;
        body?: string;
        title?: string;
        link_url?: string;
    };
    created_time: string;
    insights?: AdInsight;
}

/** Conta de anúncios */
export interface AdAccount {
    id: string;
    account_id: string;
    name: string;
    currency: string;
    timezone_name?: string;
    account_status: number;
    amount_spent: string;
    balance?: string;
    spend_cap?: string;
}

/** KPIs agregados para exibição */
export interface AdsKpiSummary {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalReach: number;
    avgCpc: number;
    avgCpm: number;
    avgCtr: number;
    avgFrequency: number;
    totalConversions: number;
    totalConversionValue: number;
    roas: number;
    cpa: number;
    activeCampaigns: number;
    pausedCampaigns: number;
    currency: string;
}

/** Delta % vs período anterior para cada KPI (null = sem dados anteriores) */
export interface AdsKpiDelta {
    totalSpend: number | null;
    totalImpressions: number | null;
    totalClicks: number | null;
    totalReach: number | null;
    avgCtr: number | null;
    avgCpc: number | null;
    avgCpm: number | null;
    totalConversions: number | null;
    roas: number | null;
    cpa: number | null;
}

/** Insights por dia para gráficos temporais */
export interface DailyAdInsight {
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    cpc: number;
    cpm: number;
    ctr: number;
    conversions: number;
    conversionValue: number;
    roas: number;
}

/** Período de filtro */
export type AdsDatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month' | 'lifetime';

/** Filtros do painel de ads */
export interface AdsFilters {
    datePreset: AdsDatePreset;
    customRange?: { since: string; until: string };
    statusFilter: 'all' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
    accountId?: string;
}

// ─── Intelligence Metrics Types ─────────────────────────────────────────────

export type FatigueLevel = 'healthy' | 'early' | 'moderate' | 'severe';
export type SaturationLevel = 'underexplored' | 'optimal' | 'saturated';
export type HealthLevel = 'excellent' | 'good' | 'attention' | 'critical';

export interface CreativeFatigueScore {
    adId: string;
    adName: string;
    score: number; // 0-1, higher = healthier
    level: FatigueLevel;
    daysActive: number;
    totalImpressions: number;
    decayRatios: {
        ctr: number | null;
        cpm: number | null;
        cr: number | null;
        cpa: number | null;
    };
    trend: number[]; // daily CTR values for sparkline
    recommendation: string;
    thumbnailUrl?: string;
}

export interface AudienceSaturationIndex {
    adsetId: string;
    adsetName: string;
    frequency: number;
    optimalFrequency: number;
    saturationIndex: number; // frequency / optimalFrequency
    level: SaturationLevel;
    reachPercent: number;
    recommendation: string;
}

export interface ABTestResult {
    adsetId: string;
    adsetName: string;
    variants: {
        adId: string;
        adName: string;
        impressions: number;
        clicks: number;
        ctr: number;
        spend: number;
        conversions: number;
    }[];
    status: 'inconclusive' | 'trending' | 'significant';
    confidence: number; // 0-100
    leadingVariantId: string | null;
    sampleProgress: number; // 0-100, percent toward significance
    minSampleNeeded: number;
    disclaimer: string;
}

export interface AccountHealthScore {
    score: number; // 0-100
    level: HealthLevel;
    subScores: {
        fatigueMean: number;
        roasScore: number;
        saturationMean: number;
        budgetUtilization: number;
    };
}

export interface IntelligenceMetrics {
    healthScore: AccountHealthScore | null;
    fatigueScores: CreativeFatigueScore[];
    saturationIndexes: AudienceSaturationIndex[];
    abTests: ABTestResult[];
    benchmarkComparison: BenchmarkComparison | null;
    computedAt: string;
}

export interface BenchmarkEntry {
    metric: string;
    label: string;
    clientValue: number;
    benchmarkValue: number;
    indexRatio: number; // clientValue / benchmarkValue
    status: 'below' | 'average' | 'above';
}

export interface BenchmarkComparison {
    entries: BenchmarkEntry[];
    industry: string;
    mode: 'sector' | 'historical';
}

export interface CreativeScore {
    creativeId: string;
    total: number; // 0-100
    composition: number; // 0-25
    contrast: number; // 0-25
    textRatio: number; // 0-25
    hierarchy: number; // 0-25
    label: string;
    suggestions: string[];
    analyzedAt: string;
}
