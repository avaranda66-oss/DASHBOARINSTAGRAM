import type {
    AdCampaign, AdSet, Ad, AdAccount, AdInsight,
    AdActionStat, DailyAdInsight, AdsKpiSummary, AdsDatePreset,
} from '@/types/ads';

const GRAPH_BASE = 'https://graph.facebook.com';
const GRAPH_VERSION = 'v25.0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function metaHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

const circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    threshold: 5,
    resetTimeout: 60_000,
};

function checkCircuitBreaker(): boolean {
    if (!circuitBreaker.isOpen) return true;
    if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failures = 0;
        return true;
    }
    return false;
}

function recordFailure(): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    if (circuitBreaker.failures >= circuitBreaker.threshold) circuitBreaker.isOpen = true;
}

function recordSuccess(): void {
    circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
}

// ─── Cache Layer ─────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
    return entry.data as T;
}

function setCache(key: string, data: unknown): void {
    cache.set(key, { data, ts: Date.now() });
}

export function clearAdsCache(): void {
    cache.clear();
}

// ─── Generic Fetch ───────────────────────────────────────────────────────────

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
    if (!checkCircuitBreaker()) throw new Error('Circuit breaker aberto — muitas falhas na Meta API. Aguarde 1 minuto.');

    const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { headers: metaHeaders(token), next: { revalidate: 0 } });

    if (!res.ok) {
        recordFailure();
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as any)?.error?.message || `HTTP ${res.status}`;
        throw new Error(`Meta Ads API: ${msg}`);
    }

    recordSuccess();
    return res.json() as Promise<T>;
}

async function graphPost(path: string, token: string, body: Record<string, unknown> = {}): Promise<any> {
    if (!checkCircuitBreaker()) throw new Error('Circuit breaker aberto.');

    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${path}`;
    const formData = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => formData.set(k, typeof v === 'string' ? v : JSON.stringify(v)));

    const res = await fetch(url, {
        method: 'POST',
        headers: { ...metaHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });

    if (!res.ok) {
        recordFailure();
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Meta Ads API POST: ${(errBody as any)?.error?.message || `HTTP ${res.status}`}`);
    }

    recordSuccess();
    return res.json();
}

// ─── Paginated Fetch ─────────────────────────────────────────────────────────

async function graphGetAll<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T[]> {
    let allData: T[] = [];
    let url: string | null = (() => {
        const u = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${path}`);
        Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
        return u.toString();
    })();

    while (url) {
        const res = await fetch(url, { headers: metaHeaders(token), next: { revalidate: 0 } });
        if (!res.ok) {
            recordFailure();
            const errBody = await res.json().catch(() => ({}));
            throw new Error(`Meta Ads API: ${(errBody as any)?.error?.message || `HTTP ${res.status}`}`);
        }
        recordSuccess();
        const json = await res.json() as { data: T[]; paging?: { next?: string } };
        allData = allData.concat(json.data || []);
        url = json.paging?.next || null;
        if (url) await sleep(200); // rate limit
    }
    return allData;
}

// ─── Ad Account ──────────────────────────────────────────────────────────────

export async function getAdAccount(token: string, accountId: string): Promise<AdAccount> {
    const cacheKey = `adaccount:${accountId}`;
    const cached = getCached<AdAccount>(cacheKey);
    if (cached) return cached;

    const data = await graphGet<AdAccount>(
        accountId,
        token,
        { fields: 'id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap' }
    );
    setCache(cacheKey, data);
    return data;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function getCampaigns(
    token: string,
    accountId: string,
    statusFilter?: string[],
): Promise<AdCampaign[]> {
    const cacheKey = `campaigns:${accountId}:${statusFilter?.join(',') || 'all'}`;
    const cached = getCached<AdCampaign[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time,start_time,stop_time',
        limit: '100',
    };
    if (statusFilter?.length) {
        params.effective_status = JSON.stringify(statusFilter);
    }

    const data = await graphGetAll<AdCampaign>(`${accountId}/campaigns`, token, params);
    setCache(cacheKey, data);
    return data;
}

// ─── Ad Sets ─────────────────────────────────────────────────────────────────

export async function getAdSets(
    token: string,
    accountId: string,
    campaignId?: string,
): Promise<AdSet[]> {
    const path = campaignId ? `${campaignId}/adsets` : `${accountId}/adsets`;
    const cacheKey = `adsets:${path}`;
    const cached = getCached<AdSet[]>(cacheKey);
    if (cached) return cached;

    const data = await graphGetAll<AdSet>(path, token, {
        fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,budget_remaining,billing_event,optimization_goal,bid_amount,created_time,start_time,end_time',
        limit: '100',
    });
    setCache(cacheKey, data);
    return data;
}

// ─── Ads ─────────────────────────────────────────────────────────────────────

export async function getAds(
    token: string,
    accountId: string,
    adsetId?: string,
): Promise<Ad[]> {
    const path = adsetId ? `${adsetId}/ads` : `${accountId}/ads`;
    const cacheKey = `ads:${path}`;
    const cached = getCached<Ad[]>(cacheKey);
    if (cached) return cached;

    const data = await graphGetAll<Ad>(path, token, {
        fields: 'id,name,adset_id,campaign_id,status,effective_status,creative{id,thumbnail_url,image_url,body,title,link_url},created_time',
        limit: '100',
    });
    setCache(cacheKey, data);
    return data;
}

// ─── Insights ────────────────────────────────────────────────────────────────

const INSIGHTS_FIELDS = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
    'impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'reach', 'frequency',
    'actions', 'cost_per_action_type', 'purchase_roas',
    'date_start', 'date_stop', 'objective', 'account_currency',
].join(',');

export async function getInsights(
    token: string,
    accountId: string,
    options: {
        level?: 'account' | 'campaign' | 'adset' | 'ad';
        datePreset?: AdsDatePreset;
        timeRange?: { since: string; until: string };
        timeIncrement?: string; // '1' para diário, 'monthly', 'all_days'
        campaignId?: string;
    } = {},
): Promise<AdInsight[]> {
    const { level = 'campaign', datePreset, timeRange, timeIncrement, campaignId } = options;
    const path = campaignId ? `${campaignId}/insights` : `${accountId}/insights`;
    const cacheKey = `insights:${path}:${level}:${datePreset || ''}:${JSON.stringify(timeRange || {})}:${timeIncrement || ''}`;
    const cached = getCached<AdInsight[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = {
        fields: INSIGHTS_FIELDS,
        level,
        limit: '500',
    };
    if (datePreset && datePreset !== 'lifetime') params.date_preset = datePreset;
    if (timeRange) params.time_range = JSON.stringify(timeRange);
    if (timeIncrement) params.time_increment = timeIncrement;

    const data = await graphGetAll<AdInsight>(path, token, params);
    setCache(cacheKey, data);
    return data;
}

/** Insights diários para gráficos de linha */
export async function getDailyInsights(
    token: string,
    accountId: string,
    datePreset?: AdsDatePreset | null,
    timeRange?: { since: string; until: string },
): Promise<DailyAdInsight[]> {
    const raw = await getInsights(token, accountId, {
        level: 'account',
        datePreset: datePreset || undefined,
        timeRange,
        timeIncrement: '1',
    });

    return raw.map(r => ({
        date: r.date_start,
        spend: parseFloat(r.spend) || 0,
        impressions: parseInt(r.impressions) || 0,
        clicks: parseInt(r.clicks) || 0,
        reach: parseInt(r.reach || '0') || 0,
        cpc: parseFloat(r.cpc || '0') || 0,
        cpm: parseFloat(r.cpm || '0') || 0,
        ctr: parseFloat(r.ctr || '0') || 0,
        conversions: sumActions(r.actions, ['offsite_conversion', 'lead', 'purchase', 'complete_registration']),
        conversionValue: sumActionValues(r.purchase_roas),
        roas: parseFloat(r.purchase_roas?.[0]?.value || '0') || 0,
    }));
}

// ─── KPI Summary ─────────────────────────────────────────────────────────────

export function computeKpiSummary(
    insights: AdInsight[],
    campaigns: AdCampaign[],
    currency: string = 'BRL',
): AdsKpiSummary {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
    let totalConversions = 0, totalConversionValue = 0;
    let weightedCpc = 0, weightedCpm = 0, weightedCtr = 0, weightedFreq = 0;

    for (const r of insights) {
        const spend = parseFloat(r.spend) || 0;
        const impressions = parseInt(r.impressions) || 0;
        const clicks = parseInt(r.clicks) || 0;
        const reach = parseInt(r.reach || '0') || 0;

        totalSpend += spend;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalReach += reach;
        totalConversions += sumActions(r.actions, ['offsite_conversion', 'lead', 'purchase', 'complete_registration']);
        totalConversionValue += sumActionValues(r.purchase_roas) * spend; // ROAS * spend = revenue

        weightedCpc += (parseFloat(r.cpc || '0') || 0) * clicks;
        weightedCpm += (parseFloat(r.cpm || '0') || 0) * impressions;
        weightedCtr += (parseFloat(r.ctr || '0') || 0) * impressions;
        weightedFreq += (parseFloat(r.frequency || '0') || 0) * reach;
    }

    const activeCampaigns = campaigns.filter(c => c.effective_status === 'ACTIVE').length;
    const pausedCampaigns = campaigns.filter(c => c.effective_status === 'PAUSED').length;

    return {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalReach,
        avgCpc: totalClicks > 0 ? weightedCpc / totalClicks : 0,
        avgCpm: totalImpressions > 0 ? (weightedCpm / totalImpressions) : 0,
        avgCtr: totalImpressions > 0 ? (weightedCtr / totalImpressions) : 0,
        avgFrequency: totalReach > 0 ? weightedFreq / totalReach : 0,
        totalConversions,
        totalConversionValue,
        roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
        cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
        activeCampaigns,
        pausedCampaigns,
        currency,
    };
}

// ─── Campaign Actions ────────────────────────────────────────────────────────

export async function updateCampaignStatus(
    token: string,
    campaignId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<boolean> {
    const result = await graphPost(campaignId, token, { status });
    clearAdsCache();
    return result?.success === true;
}

export async function updateCampaignBudget(
    token: string,
    campaignId: string,
    dailyBudget?: number,
    lifetimeBudget?: number,
): Promise<boolean> {
    const body: Record<string, unknown> = {};
    // Budgets are in cents for Meta API
    if (dailyBudget != null) body.daily_budget = Math.round(dailyBudget * 100).toString();
    if (lifetimeBudget != null) body.lifetime_budget = Math.round(lifetimeBudget * 100).toString();
    const result = await graphPost(campaignId, token, body);
    clearAdsCache();
    return result?.success === true;
}

export async function updateAdSetStatus(
    token: string,
    adsetId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
): Promise<boolean> {
    const result = await graphPost(adsetId, token, { status });
    clearAdsCache();
    return result?.success === true;
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function sumActions(actions: AdActionStat[] | undefined, types: string[]): number {
    if (!actions) return 0;
    return actions
        .filter(a => types.some(t => a.action_type.includes(t)))
        .reduce((sum, a) => sum + (parseInt(a.value) || 0), 0);
}

function sumActionValues(roas: AdActionStat[] | undefined): number {
    if (!roas) return 0;
    return roas.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
}
