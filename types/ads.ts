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
