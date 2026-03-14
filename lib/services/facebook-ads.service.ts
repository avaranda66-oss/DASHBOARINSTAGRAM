import type {
    AdCampaign, AdSet, Ad, AdAccount, AdInsight,
    AdActionStat, DailyAdInsight, AdsKpiSummary, AdsDatePreset,
} from '@/types/ads';
import type {
    CreativeFatigueScore, AudienceSaturationIndex, AccountHealthScore,
    ABTestResult, BenchmarkComparison, BenchmarkEntry,
    FatigueLevel, SaturationLevel, HealthLevel, IntelligenceMetrics,
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

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    threshold: number;
    resetTimeout: number;
}

function createCircuitBreaker(threshold = 5, resetTimeout = 60_000): CircuitBreakerState {
    return { failures: 0, lastFailure: 0, isOpen: false, threshold, resetTimeout };
}

// Separate breakers: core features (campaigns, KPIs) vs intelligence (fatigue, saturation)
const coreCircuitBreaker = createCircuitBreaker(5, 60_000);
export const intelligenceCircuitBreaker = createCircuitBreaker(5, 60_000);

function checkCircuitBreaker(breaker: CircuitBreakerState = coreCircuitBreaker): boolean {
    if (!breaker.isOpen) return true;
    if (Date.now() - breaker.lastFailure > breaker.resetTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        return true;
    }
    return false;
}

function recordFailure(breaker: CircuitBreakerState = coreCircuitBreaker): void {
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= breaker.threshold) breaker.isOpen = true;
}

function recordSuccess(breaker: CircuitBreakerState = coreCircuitBreaker): void {
    breaker.failures = Math.max(0, breaker.failures - 1);
}

// ─── Cache Layer ─────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min para insights (mudam frequentemente)
const ADSETS_CACHE_TTL = 30 * 60 * 1000; // 30 min para adsets (estrutura muda raramente)
const INTELLIGENCE_CACHE_TTL = 15 * 60 * 1000; // 15 min for intelligence data

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
    return entry.data as T;
}

function setCache(key: string, data: unknown, ttl: number = CACHE_TTL): void {
    // Don't cache empty insight arrays — Meta API may return empty for recent periods
    // and we don't want to serve stale empty results for 5 minutes
    if (Array.isArray(data) && data.length === 0) return;
    cache.set(key, { data, ts: Date.now(), ttl });
}

const FETCH_TIMEOUT = 8_000; // 8 seconds max per request

export function clearAdsCache(): void {
    cache.clear();
}

// ─── Generic Fetch ───────────────────────────────────────────────────────────

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
    if (!checkCircuitBreaker()) throw new Error('Circuit breaker aberto — muitas falhas na Meta API. Aguarde 1 minuto.');

    const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        const res = await fetch(url.toString(), { headers: metaHeaders(token), signal: controller.signal, next: { revalidate: 0 } });

        if (!res.ok) {
            recordFailure();
            const errBody = await res.json().catch(() => ({}));
            const msg = (errBody as any)?.error?.message || `HTTP ${res.status}`;
            throw new Error(`Meta Ads API: ${msg}`);
        }

        recordSuccess();
        return res.json() as Promise<T>;
    } finally {
        clearTimeout(timeoutId);
    }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        try {
            const res = await fetch(url, { headers: metaHeaders(token), signal: controller.signal, next: { revalidate: 0 } });
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
        } finally {
            clearTimeout(timeoutId);
        }
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
    setCache(cacheKey, data, ADSETS_CACHE_TTL); // 30min — estrutura de adsets muda raramente
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
    'outbound_clicks', 'outbound_clicks_ctr',
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
        conversions: sumActions(r.actions, [
            'offsite_conversion.fb_pixel_purchase',
            'offsite_conversion.fb_pixel_lead',
            'offsite_conversion.fb_pixel_complete_registration',
            'lead',
        ]),
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
        totalConversions += sumActions(r.actions, [
            'offsite_conversion.fb_pixel_purchase',
            'offsite_conversion.fb_pixel_lead',
            'offsite_conversion.fb_pixel_complete_registration',
            'lead',
        ]);
        const roasValue = parseFloat(r.purchase_roas?.[0]?.value || '0') || 0;
        totalConversionValue += roasValue * spend; // ROAS * spend = revenue

        // Prefer outbound_clicks_ctr (link clicks only) over generic ctr (all clicks)
        // to match what Facebook Ads Manager displays as "CTR"
        const outboundCtr = parseFloat(r.outbound_clicks_ctr?.[0]?.value || '0') || 0;
        const effectiveCtr = outboundCtr > 0 ? outboundCtr : (parseFloat(r.ctr || '0') || 0);

        weightedCpc += (parseFloat(r.cpc || '0') || 0) * clicks;
        weightedCpm += (parseFloat(r.cpm || '0') || 0) * impressions;
        weightedCtr += effectiveCtr * impressions;
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

// ─── Intelligence Engine ────────────────────────────────────────────────────

const FOOD_BEV_BENCHMARKS = {
    ctr: 1.85, cpc: 0.57, cpm: 9.56, cvr: 2.91, cpa: 29.31, roas: 1.56,
};

export async function getAdLevelDailyInsights(
    token: string,
    accountId: string,
    datePreset: AdsDatePreset = 'last_14d',
): Promise<AdInsight[]> {
    const cacheKey = `intel:ad-daily:${accountId}:${datePreset}`;
    const cached = getCached<AdInsight[]>(cacheKey);
    if (cached) return cached;

    if (!checkCircuitBreaker(intelligenceCircuitBreaker)) {
        throw new Error('Intelligence circuit breaker aberto.');
    }

    try {
        const data = await graphGetAll<AdInsight>(`${accountId}/insights`, token, {
            fields: INSIGHTS_FIELDS,
            level: 'ad',
            time_increment: '1',
            date_preset: datePreset,
            limit: '500',
        });
        recordSuccess(intelligenceCircuitBreaker);
        setCache(cacheKey, data, INTELLIGENCE_CACHE_TTL);
        return data;
    } catch (e) {
        recordFailure(intelligenceCircuitBreaker);
        throw e;
    }
}

export function computeCreativeFatigueScores(
    adDailyInsights: AdInsight[],
    ads: Ad[],
): CreativeFatigueScore[] {
    // Group insights by ad_id
    const byAd = new Map<string, AdInsight[]>();
    for (const row of adDailyInsights) {
        if (!row.ad_id) continue;
        const arr = byAd.get(row.ad_id) || [];
        arr.push(row);
        byAd.set(row.ad_id, arr);
    }

    const scores: CreativeFatigueScore[] = [];
    const adMap = new Map(ads.map(a => [a.id, a]));

    for (const [adId, rows] of byAd) {
        // Sort by date
        const sorted = rows.sort((a, b) => a.date_start.localeCompare(b.date_start));
        const totalImp = sorted.reduce((s, r) => s + (parseInt(r.impressions) || 0), 0);

        // Skip ads with <500 impressions or <5 days of data (learning phase)
        if (totalImp < 500 || sorted.length < 5) continue;

        // Baseline: first 3-5 days
        const baselineCount = Math.min(5, Math.ceil(sorted.length * 0.3));
        const baseline = sorted.slice(0, baselineCount);
        const recent = sorted.slice(-Math.min(5, Math.ceil(sorted.length * 0.3)));

        const avgMetric = (rows: AdInsight[], field: 'ctr' | 'cpm' | 'cpc') => {
            const vals = rows.map(r => parseFloat((r as any)[field] || '0') || 0).filter(v => v > 0);
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };

        const avgConvRate = (rows: AdInsight[]) => {
            const totalClicks = rows.reduce((s, r) => s + (parseInt(r.clicks) || 0), 0);
            const totalConv = rows.reduce((s, r) => s + sumActions(r.actions, ['offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'lead']), 0);
            return totalClicks > 0 ? totalConv / totalClicks : 0;
        };

        const baseCtr = avgMetric(baseline, 'ctr');
        const recentCtr = avgMetric(recent, 'ctr');
        const baseCpm = avgMetric(baseline, 'cpm');
        const recentCpm = avgMetric(recent, 'cpm');
        const baseCpc = avgMetric(baseline, 'cpc');
        const recentCpc = avgMetric(recent, 'cpc');
        const baseCr = avgConvRate(baseline);
        const recentCr = avgConvRate(recent);

        // Decay ratios (1 = stable, <1 = decaying)
        const ctrRatio = baseCtr > 0 ? recentCtr / baseCtr : null;
        const cpmRatio = baseCpm > 0 ? baseCpm / recentCpm : null; // Inverted: higher CPM = worse
        const crRatio = baseCr > 0 ? recentCr / baseCr : null;
        const cpaRatio = baseCpc > 0 ? baseCpc / recentCpc : null; // Inverted: higher CPC = worse

        // Weighted score (null values get weight 0)
        let totalWeight = 0;
        let weightedSum = 0;
        if (ctrRatio !== null) { weightedSum += Math.min(ctrRatio, 1.5) * 0.30; totalWeight += 0.30; }
        if (cpmRatio !== null) { weightedSum += Math.min(cpmRatio, 1.5) * 0.20; totalWeight += 0.20; }
        if (crRatio !== null) { weightedSum += Math.min(crRatio, 1.5) * 0.30; totalWeight += 0.30; }
        if (cpaRatio !== null) { weightedSum += Math.min(cpaRatio, 1.5) * 0.20; totalWeight += 0.20; }

        const score = totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0.5;

        const level: FatigueLevel = score > 0.85 ? 'healthy' : score > 0.70 ? 'early' : score > 0.55 ? 'moderate' : 'severe';

        const recommendations: Record<FatigueLevel, string> = {
            healthy: 'Manter — criativo saudável',
            early: 'Monitorar — preparar substituto',
            moderate: 'Substituir em breve',
            severe: 'Pausar agora — fadiga severa',
        };

        const ad = adMap.get(adId);
        const trendCtr = sorted.map(r => parseFloat(r.ctr || '0') || 0);

        scores.push({
            adId,
            adName: ad?.name || rows[0]?.ad_name || adId,
            score,
            level,
            daysActive: sorted.length,
            totalImpressions: totalImp,
            decayRatios: { ctr: ctrRatio, cpm: cpmRatio, cr: crRatio, cpa: cpaRatio },
            trend: trendCtr.slice(-14), // Last 14 days for sparkline
            recommendation: recommendations[level],
            thumbnailUrl: ad?.creative?.thumbnail_url,
        });
    }

    return scores.sort((a, b) => a.score - b.score); // Worst first
}

export function computeAudienceSaturationIndexes(
    adsetInsights: AdInsight[],
): AudienceSaturationIndex[] {
    const F_OPT = 3.0; // Food & Beverage optimal frequency

    return adsetInsights
        .filter(r => r.adset_id && parseFloat(r.reach || '0') > 0)
        .map(r => {
            const frequency = parseFloat(r.frequency || '0') || 0;
            const reach = parseInt(r.reach || '0') || 0;
            const impressions = parseInt(r.impressions) || 0;
            const saturationIndex = frequency / F_OPT;

            const level: SaturationLevel = saturationIndex < 0.8 ? 'underexplored'
                : saturationIndex <= 1.2 ? 'optimal' : 'saturated';

            const recommendations: Record<SaturationLevel, string> = {
                underexplored: 'Expandir — público sub-explorado',
                optimal: 'Manter — frequência ideal',
                saturated: 'Reduzir frequência ou expandir público',
            };

            return {
                adsetId: r.adset_id!,
                adsetName: r.adset_name || r.adset_id!,
                frequency,
                optimalFrequency: F_OPT,
                saturationIndex,
                level,
                reachPercent: impressions > 0 ? (reach / impressions) * 100 : 0,
                recommendation: recommendations[level],
            };
        });
}

export function detectABTests(
    adInsights: AdInsight[],
): ABTestResult[] {
    // Group ads by adset
    const byAdset = new Map<string, { adsetName: string; ads: Map<string, { impressions: number; clicks: number; spend: number; conversions: number; adName: string }> }>();

    for (const r of adInsights) {
        if (!r.adset_id || !r.ad_id) continue;
        if (!byAdset.has(r.adset_id)) {
            byAdset.set(r.adset_id, { adsetName: r.adset_name || r.adset_id, ads: new Map() });
        }
        const group = byAdset.get(r.adset_id)!;
        const existing = group.ads.get(r.ad_id) || { impressions: 0, clicks: 0, spend: 0, conversions: 0, adName: r.ad_name || r.ad_id };
        existing.impressions += parseInt(r.impressions) || 0;
        existing.clicks += parseInt(r.clicks) || 0;
        existing.spend += parseFloat(r.spend) || 0;
        existing.conversions += sumActions(r.actions, ['offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'lead']);
        group.ads.set(r.ad_id, existing);
    }

    const results: ABTestResult[] = [];

    for (const [adsetId, group] of byAdset) {
        if (group.ads.size < 2) continue; // Need 2+ ads for A/B test

        const variants = Array.from(group.ads.entries()).map(([adId, data]) => ({
            adId,
            adName: data.adName,
            impressions: data.impressions,
            clicks: data.clicks,
            ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
            spend: data.spend,
            conversions: data.conversions,
        }));

        // Z-test between top 2 variants by impressions
        const sorted = [...variants].sort((a, b) => b.impressions - a.impressions);
        const v1 = sorted[0], v2 = sorted[1];

        let status: 'inconclusive' | 'trending' | 'significant' = 'inconclusive';
        let confidence = 0;
        let leadingVariantId: string | null = null;
        const MIN_SAMPLE = 3000;

        if (v1.impressions > 0 && v2.impressions > 0) {
            const p1 = v1.clicks / v1.impressions;
            const p2 = v2.clicks / v2.impressions;
            const se = Math.sqrt((p1 * (1 - p1) / v1.impressions) + (p2 * (1 - p2) / v2.impressions));

            if (se > 0) {
                const z = Math.abs(p1 - p2) / se;
                // Approximate p-value from Z-score
                confidence = Math.min(99.9, (1 - Math.exp(-0.717 * z - 0.416 * z * z)) * 100);

                if (Math.min(v1.impressions, v2.impressions) < 300) {
                    status = 'inconclusive';
                } else if (Math.min(v1.impressions, v2.impressions) < MIN_SAMPLE || confidence < 95) {
                    status = 'trending';
                } else {
                    status = 'significant';
                }

                leadingVariantId = p1 >= p2 ? v1.adId : v2.adId;
            }
        }

        const minImpressions = Math.min(v1.impressions, v2.impressions);
        const sampleProgress = Math.min(100, (minImpressions / MIN_SAMPLE) * 100);

        const disclaimers: Record<string, string> = {
            inconclusive: 'Dados insuficientes. Aguarde mais impressões antes de tomar decisão.',
            trending: `Tendência detectada, mas ainda não significativa. Faltam ~${Math.max(0, MIN_SAMPLE - minImpressions)} impressões por variante.`,
            significant: 'Resultado estatisticamente significativo com 95%+ de confiança.',
        };

        results.push({
            adsetId,
            adsetName: group.adsetName,
            variants,
            status,
            confidence: Math.round(confidence * 10) / 10,
            leadingVariantId: status !== 'inconclusive' ? leadingVariantId : null,
            sampleProgress: Math.round(sampleProgress),
            minSampleNeeded: MIN_SAMPLE,
            disclaimer: disclaimers[status],
        });
    }

    return results;
}

export function computeBenchmarkComparison(
    kpi: AdsKpiSummary,
    mode: 'sector' | 'historical' = 'sector',
    historicalKpi?: AdsKpiSummary,
): BenchmarkComparison {
    const bench = mode === 'historical' && historicalKpi ? {
        ctr: historicalKpi.avgCtr, cpc: historicalKpi.avgCpc, cpm: historicalKpi.avgCpm,
        cvr: historicalKpi.totalConversions > 0 ? (historicalKpi.totalConversions / historicalKpi.totalClicks) * 100 : 0,
        cpa: historicalKpi.cpa, roas: historicalKpi.roas,
    } : FOOD_BEV_BENCHMARKS;

    const entries: BenchmarkEntry[] = [
        { metric: 'ctr', label: 'CTR (%)', clientValue: kpi.avgCtr, benchmarkValue: bench.ctr },
        { metric: 'cpc', label: 'CPC (R$)', clientValue: kpi.avgCpc, benchmarkValue: bench.cpc },
        { metric: 'cpm', label: 'CPM (R$)', clientValue: kpi.avgCpm, benchmarkValue: bench.cpm },
        { metric: 'cpa', label: 'CPA (R$)', clientValue: kpi.cpa, benchmarkValue: bench.cpa },
        { metric: 'roas', label: 'ROAS', clientValue: kpi.roas, benchmarkValue: bench.roas },
    ].map(e => {
        const ratio = e.benchmarkValue > 0 ? e.clientValue / e.benchmarkValue : 1;
        // For CPC, CPA, CPM: lower is better (invert comparison)
        const invertedMetrics = ['cpc', 'cpm', 'cpa'];
        const isInverted = invertedMetrics.includes(e.metric);
        const adjustedRatio = isInverted ? (ratio > 0 ? 1 / ratio : 1) : ratio;

        return {
            ...e,
            indexRatio: Math.round(ratio * 100) / 100,
            status: adjustedRatio < 0.85 ? 'below' as const : adjustedRatio > 1.15 ? 'above' as const : 'average' as const,
        };
    });

    return { entries, industry: 'Food & Beverage', mode };
}

export function computeAccountHealthScore(
    fatigueScores: CreativeFatigueScore[],
    saturationIndexes: AudienceSaturationIndex[],
    kpi: AdsKpiSummary,
): AccountHealthScore | null {
    if (fatigueScores.length === 0 && saturationIndexes.length === 0) return null;

    // Fatigue mean (0-1, higher = healthier) -> convert to 0-100
    const fatigueMean = fatigueScores.length > 0
        ? fatigueScores.reduce((s, f) => s + f.score, 0) / fatigueScores.length * 100
        : 50;

    // ROAS score: benchmark is 1.56 for Food & Bev
    const roasScore = Math.min(100, (kpi.roas / 1.56) * 50);

    // Saturation mean: optimal is 0.8-1.2, penalize outside
    const satMean = saturationIndexes.length > 0
        ? saturationIndexes.reduce((s, si) => {
            const dist = Math.abs(si.saturationIndex - 1.0);
            return s + Math.max(0, 100 - dist * 100);
        }, 0) / saturationIndexes.length
        : 50;

    // Budget utilization: active campaigns / total campaigns
    const budgetUtil = (kpi.activeCampaigns + kpi.pausedCampaigns) > 0
        ? (kpi.activeCampaigns / (kpi.activeCampaigns + kpi.pausedCampaigns)) * 100
        : 0;

    const score = Math.round(
        fatigueMean * 0.30 + roasScore * 0.25 + satMean * 0.25 + budgetUtil * 0.20
    );

    const level: HealthLevel = score > 80 ? 'excellent' : score > 60 ? 'good' : score > 40 ? 'attention' : 'critical';

    return {
        score: Math.min(100, Math.max(0, score)),
        level,
        subScores: {
            fatigueMean: Math.round(fatigueMean),
            roasScore: Math.round(roasScore),
            saturationMean: Math.round(satMean),
            budgetUtilization: Math.round(budgetUtil),
        },
    };
}

export async function computeIntelligenceMetrics(
    token: string,
    accountId: string,
    kpi: AdsKpiSummary,
    datePreset: AdsDatePreset = 'last_14d',
): Promise<IntelligenceMetrics> {
    // Fetch ad-level daily insights + adset insights in parallel
    const [adDailyInsights, adsetInsights, adInsights, ads] = await Promise.all([
        getAdLevelDailyInsights(token, accountId, datePreset).catch(() => [] as AdInsight[]),
        getInsights(token, accountId, { level: 'adset', datePreset }).catch(() => [] as AdInsight[]),
        getInsights(token, accountId, { level: 'ad', datePreset }).catch(() => [] as AdInsight[]),
        getAds(token, accountId).catch(() => [] as Ad[]),
    ]);

    const fatigueScores = computeCreativeFatigueScores(adDailyInsights, ads);
    const saturationIndexes = computeAudienceSaturationIndexes(adsetInsights);
    const abTests = detectABTests(adInsights);
    const benchmarkComparison = computeBenchmarkComparison(kpi);
    const healthScore = computeAccountHealthScore(fatigueScores, saturationIndexes, kpi);

    return {
        healthScore,
        fatigueScores,
        saturationIndexes,
        abTests,
        benchmarkComparison,
        computedAt: new Date().toISOString(),
    };
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function sumActions(actions: AdActionStat[] | undefined, types: string[]): number {
    if (!actions) return 0;
    // Use exact match to prevent double-counting: Meta API returns both
    // generic ("purchase") and specific ("offsite_conversion.fb_pixel_purchase")
    // for the same event — includes() would count it twice.
    return actions
        .filter(a => types.includes(a.action_type))
        .reduce((sum, a) => sum + (parseInt(a.value) || 0), 0);
}

function sumActionValues(roas: AdActionStat[] | undefined): number {
    if (!roas) return 0;
    return roas.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
}
