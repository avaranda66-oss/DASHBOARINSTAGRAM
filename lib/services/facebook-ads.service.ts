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
const REACH_ESTIMATE_CACHE_TTL = 60 * 60 * 1000; // 1h — audience size rarely changes

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
        // bid_strategy, targeting_automation, is_adset_budget_sharing_enabled: obrigatórios v25
        fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,budget_remaining,billing_event,optimization_goal,bid_amount,bid_strategy,targeting_automation,is_adset_budget_sharing_enabled,created_time,start_time,end_time',
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
    'impressions', 'clicks', 'inline_link_clicks', 'inline_link_click_ctr', 'spend', 'cpc', 'cpm', 'ctr', 'reach', 'frequency',
    'outbound_clicks', 'outbound_clicks_ctr',
    'actions', 'cost_per_action_type', 'purchase_roas',
    // Video metrics — disponíveis para campanhas VIDEO_VIEWS, OUTCOME_AWARENESS, REACH
    // NOTA: video_3_sec e video_15_sec NÃO são campos válidos no endpoint insights.
    // 3s views = actions com action_type=video_view (já incluso em actions acima)
    'video_avg_time_watched_actions',
    'video_p25_watched_actions', 'video_p50_watched_actions',
    'video_p75_watched_actions', 'video_p95_watched_actions',
    'video_p100_watched_actions',    // Completion Rate estrito (100%)
    'video_thruplay_watched_actions',
    'video_play_curve_actions',
    'video_play_retention_0_to_15s_actions',
    'video_play_retention_20_to_60s_actions',
    // Ad Quality Rankings — UNKNOWN | BELOW_AVERAGE_10/20/35 | AVERAGE | ABOVE_AVERAGE
    'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
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
        attributionWindow?: string; // US-66: '1d_click' | '7d_click' | '28d_click' | '1d_view'
    } = {},
): Promise<AdInsight[]> {
    const { level = 'campaign', datePreset, timeRange, timeIncrement, campaignId, attributionWindow } = options;
    const path = campaignId ? `${campaignId}/insights` : `${accountId}/insights`;
    const cacheKey = `insights:${path}:${level}:${datePreset || ''}:${JSON.stringify(timeRange || {})}:${timeIncrement || ''}:${attributionWindow || ''}`;
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
    if (attributionWindow) params.action_attribution_windows = JSON.stringify([attributionWindow]);

    const data = await graphGetAll<AdInsight>(path, token, params);
    setCache(cacheKey, data);
    return data;
}

// Campos reduzidos para requests de breakdown (sem video/quality — desnecessários por segmento)
const BREAKDOWN_FIELDS = [
    'impressions', 'clicks', 'inline_link_clicks', 'spend',
    'actions', 'purchase_roas',
].join(',');

/**
 * US-69 / US-70 — Insights com breakdown demográfico ou de placement.
 * breakdowns: ['age', 'gender'] | ['publisher_platform', 'platform_placement']
 * A Meta API agrega no nível account quando level='account' + breakdowns.
 */
export async function getInsightsWithBreakdown(
    token: string,
    accountId: string,
    breakdowns: string[],
    options: {
        datePreset?: AdsDatePreset;
        timeRange?: { since: string; until: string };
    } = {},
): Promise<Array<AdInsight & Record<string, string>>> {
    const { datePreset, timeRange } = options;
    const cacheKey = `breakdown:${accountId}:${breakdowns.join(',')}:${datePreset || ''}:${JSON.stringify(timeRange || {})}`;
    const cached = getCached<Array<AdInsight & Record<string, string>>>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = {
        fields: BREAKDOWN_FIELDS,
        level: 'account',
        breakdowns: breakdowns.join(','),
        limit: '500',
    };
    if (datePreset && datePreset !== 'lifetime') params.date_preset = datePreset;
    if (timeRange) params.time_range = JSON.stringify(timeRange);

    const data = await graphGetAll<AdInsight & Record<string, string>>(`${accountId}/insights`, token, params);
    setCache(cacheKey, data, INTELLIGENCE_CACHE_TTL);
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
        roas: extractRoas(r.purchase_roas),
    }));
}

// ─── KPI Summary ─────────────────────────────────────────────────────────────

export function computeKpiSummary(
    insights: AdInsight[],
    campaigns: AdCampaign[],
    currency: string = 'BRL',
): AdsKpiSummary {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
    let totalConversions = 0, totalConversionValue = 0, totalEngagements = 0;
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
        totalEngagements += sumActions(r.actions, ['post_engagement']);
        const roasValue = extractRoas(r.purchase_roas);
        totalConversionValue += roasValue * spend; // ROAS * spend = revenue

        // Prefer outbound_clicks_ctr (link clicks only) over generic ctr (all clicks)
        // to match what Facebook Ads Manager displays as "CTR"
        const outboundCtr = extractOutboundCtr(r.outbound_clicks_ctr);
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
        totalEngagements,
        costPerEngagement: totalEngagements > 0 ? totalSpend / totalEngagements : 0,
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

// ─── Audience Size via Reach Estimate ────────────────────────────────────────

async function getAdsetTargeting(token: string, adsetId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = `adset_targeting:${adsetId}`;
    const cached = getCached<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    try {
        const data = await graphGet<{ targeting?: Record<string, unknown> }>(adsetId, token, { fields: 'targeting' });
        const targeting = data.targeting ?? null;
        if (targeting) setCache(cacheKey, targeting, REACH_ESTIMATE_CACHE_TTL);
        return targeting;
    } catch {
        return null;
    }
}

async function getReachEstimate(token: string, accountId: string, targeting: Record<string, unknown>): Promise<number> {
    const targetingJson = JSON.stringify(targeting);
    const cacheKey = `reach_estimate:${accountId}:${Buffer.from(targetingJson).toString('base64').slice(0, 32)}`;
    const cached = getCached<number>(cacheKey);
    if (cached !== null) return cached;

    try {
        // B-07: /reachestimate está deprecated desde v17+ e pode ser removido em v26+.
        // Em v25 o endpoint ainda responde, mas retorna audience_size_lower_bound /
        // audience_size_upper_bound (não mais o campo legado `users`). O fallback para
        // `users` cobre respostas de versões anteriores em cache.
        // Alternativa futura: /delivery_estimate — requer ad_object_id de anúncio ativo,
        // não aceita targeting_spec genérico. Monitorar changelog do Marketing API.
        // NOTA: accountId já tem o formato act_XXXXXXXXX (sem prefixo duplo).
        const data = await graphGet<{
            audience_size_lower_bound?: string | number;
            audience_size_upper_bound?: string | number;
            users?: string | number; // legado — v16 e anteriores
        }>(`${accountId}/reachestimate`, token, {
            targeting_spec: targetingJson,
            optimize_for: 'IMPRESSIONS',
        });

        const lower = parseFloat(String(data.audience_size_lower_bound ?? data.users ?? '0')) || 0;
        const upper = parseFloat(String(data.audience_size_upper_bound ?? data.users ?? '0')) || 0;
        const estimate = upper > 0 ? Math.round((lower + upper) / 2) : lower;

        if (estimate > 0) setCache(cacheKey, estimate, REACH_ESTIMATE_CACHE_TTL);
        return estimate;
    } catch {
        return 0;
    }
}

export async function fetchAdsetAudienceEstimates(
    token: string,
    accountId: string,
    adsetIds: string[],
): Promise<Map<string, number>> {
    if (adsetIds.length === 0) return new Map();

    const results = await Promise.all(
        adsetIds.map(async (adsetId) => {
            const targeting = await getAdsetTargeting(token, adsetId);
            if (!targeting) return [adsetId, 0] as [string, number];
            const estimate = await getReachEstimate(token, accountId, targeting);
            return [adsetId, estimate] as [string, number];
        })
    );

    return new Map(results.filter(([, size]) => size > 0));
}

export function computeAudienceSaturationIndexes(
    adsetInsights: AdInsight[],
    audienceEstimates?: Map<string, number>,
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

            const estimatedAudienceSize = audienceEstimates?.get(r.adset_id!) ?? 0;
            const reachPercent = estimatedAudienceSize > 0
                ? (reach / estimatedAudienceSize) * 100
                : impressions > 0 ? (reach / impressions) * 100 : 0;

            return {
                adsetId: r.adset_id!,
                adsetName: r.adset_name || r.adset_id!,
                frequency,
                optimalFrequency: F_OPT,
                saturationIndex,
                level,
                reachPercent: Math.min(reachPercent, 100), // cap at 100% (estimate may be stale)
                estimatedAudienceSize: estimatedAudienceSize > 0 ? estimatedAudienceSize : undefined,
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
        existing.clicks += parseInt(r.inline_link_clicks || r.clicks) || 0;
        existing.spend += parseFloat(r.spend) || 0;
        // B-06: Lead dual-tracking risk — contas híbridas (pixel + lead form) podem gerar
        // double-count se ambos 'offsite_conversion.fb_pixel_lead' e 'lead' forem disparados
        // para a mesma conversão. Em contas exclusivamente de lead form (sem pixel), usar
        // apenas 'lead'. Em contas exclusivamente de pixel, usar apenas 'offsite_conversion.fb_pixel_lead'.
        // Aqui somamos os dois para maximizar cobertura, mas em contas híbridas isso pode
        // inflar conversões. Monitorar com Event Match Quality no Events Manager.
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
            trending: (() => {
                const faltam = Math.max(0, MIN_SAMPLE - minImpressions);
                const totalConversions = variants.reduce((s, v) => s + (v.conversions ?? 0), 0);
                if (faltam === 0 && totalConversions === 0) {
                    return 'Impressões suficientes, mas sem conversões para calcular vencedor. Ative o pixel de conversão.';
                }
                return `Tendência detectada, mas ainda não significativa. Faltam ~${faltam} impressões por variante.`;
            })(),
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

function buildBenchmarkEntries(kpi: AdsKpiSummary, bench: typeof FOOD_BEV_BENCHMARKS): BenchmarkEntry[] {
    return [
        { metric: 'ctr', label: 'CTR (%)', clientValue: kpi.avgCtr, benchmarkValue: bench.ctr },
        { metric: 'cpc', label: 'CPC (R$)', clientValue: kpi.avgCpc, benchmarkValue: bench.cpc },
        { metric: 'cpm', label: 'CPM (R$)', clientValue: kpi.avgCpm, benchmarkValue: bench.cpm },
        { metric: 'cpa', label: 'CPA (R$)', clientValue: kpi.cpa, benchmarkValue: bench.cpa },
        { metric: 'roas', label: 'ROAS', clientValue: kpi.roas, benchmarkValue: bench.roas },
    ].map(e => {
        const ratio = e.benchmarkValue > 0 ? e.clientValue / e.benchmarkValue : 1;
        const invertedMetrics = ['cpc', 'cpm', 'cpa'];
        const isInverted = invertedMetrics.includes(e.metric);
        const adjustedRatio = isInverted ? (ratio > 0 ? 1 / ratio : 1) : ratio;
        return {
            ...e,
            indexRatio: Math.round(ratio * 100) / 100,
            status: adjustedRatio < 0.85 ? 'below' as const : adjustedRatio > 1.15 ? 'above' as const : 'average' as const,
        };
    });
}

export function computeBenchmarkComparison(
    kpi: AdsKpiSummary,
    historicalKpi?: AdsKpiSummary,
): BenchmarkComparison {
    const entries = buildBenchmarkEntries(kpi, FOOD_BEV_BENCHMARKS);

    const histBench = historicalKpi ? {
        ctr: historicalKpi.avgCtr, cpc: historicalKpi.avgCpc, cpm: historicalKpi.avgCpm,
        cvr: historicalKpi.totalConversions > 0 ? (historicalKpi.totalConversions / historicalKpi.totalClicks) * 100 : 0,
        cpa: historicalKpi.cpa, roas: historicalKpi.roas,
    } : FOOD_BEV_BENCHMARKS;
    const historicalEntries = buildBenchmarkEntries(kpi, histBench);

    return { entries, historicalEntries, industry: 'Food & Beverage', mode: 'sector' };
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

    const awarenessMode = kpi.roas === 0 && roasScore === 0;

    return {
        score: Math.min(100, Math.max(0, score)),
        level,
        awarenessMode,
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
    const daysMap: Record<string, number> = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 };
    const days = daysMap[datePreset] ?? 14;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const sub = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };
    const prevUntil = sub(today, days + 1);
    const prevRange = { since: fmt(sub(prevUntil, days - 1)), until: fmt(prevUntil) };

    // Fetch ad-level daily insights + adset insights + previous period in parallel
    const [adDailyInsights, adsetInsights, adInsights, ads, prevInsights] = await Promise.all([
        getAdLevelDailyInsights(token, accountId, datePreset).catch(() => [] as AdInsight[]),
        getInsights(token, accountId, { level: 'adset', datePreset }).catch(() => [] as AdInsight[]),
        getInsights(token, accountId, { level: 'ad', datePreset }).catch(() => [] as AdInsight[]),
        getAds(token, accountId).catch(() => [] as Ad[]),
        getInsights(token, accountId, { level: 'account', datePreset: undefined, timeRange: prevRange }).catch(() => [] as AdInsight[]),
    ]);

    const historicalKpi = prevInsights.length > 0 ? computeKpiSummary(prevInsights, []) : undefined;

    const fatigueScores = computeCreativeFatigueScores(adDailyInsights, ads);

    // Fetch audience estimates for true reach penetration (best-effort, non-blocking)
    const adsetIds = [...new Set(adsetInsights.map(r => r.adset_id).filter(Boolean) as string[])];
    const audienceEstimates = await fetchAdsetAudienceEstimates(token, accountId, adsetIds).catch(() => new Map<string, number>());
    const saturationIndexes = computeAudienceSaturationIndexes(adsetInsights, audienceEstimates);
    const abTests = detectABTests(adInsights);
    const benchmarkComparison = computeBenchmarkComparison(kpi, historicalKpi);
    const healthScore = computeAccountHealthScore(fatigueScores, saturationIndexes, kpi);

    return {
        healthScore,
        fatigueScores,
        saturationIndexes,
        abTests,
        benchmarkComparison,
        adDailyInsights,
        computedAt: new Date().toISOString(),
    };
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function sumActions(actions: AdActionStat[] | undefined, types: string[]): number {
    if (!actions) return 0;
    // Use exact match to prevent double-counting: Meta API returns both
    // generic ("purchase") and specific ("offsite_conversion.fb_pixel_purchase")
    // for the same event — includes() would count it twice.
    // NOTE: 'lead' (native Lead Ads) e 'offsite_conversion.fb_pixel_lead' (pixel) são
    // tecnicamente distintos, mas podem se sobrepor em contas com dual-tracking.
    // Para contas com apenas um método de tracking, não há duplicação.
    return actions
        .filter(a => types.includes(a.action_type))
        .reduce((sum, a) => sum + (parseInt(a.value) || 0), 0);
}

function sumActionValues(roas: AdActionStat[] | undefined): number {
    if (!roas) return 0;
    return roas.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
}

/**
 * Extrai o valor primário de ROAS de purchase_roas action stats.
 * Prioridade: omni_purchase (todas as plataformas) > website > app > primeiro entry.
 * Evita somar múltiplos entries (omni + website) que resultaria em ROAS inflado.
 */
function extractRoas(roasStats: AdActionStat[] | undefined): number {
    if (!roasStats?.length) return 0;
    const entry = roasStats.find(a => a.action_type === 'omni_purchase')
        ?? roasStats.find(a => a.action_type === 'website')
        ?? roasStats.find(a => a.action_type === 'app')
        ?? roasStats[0];
    return parseFloat(entry?.value || '0') || 0;
}

/**
 * Extrai CTR de outbound_clicks_ctr action stats.
 * Prioriza action_type 'outbound_click' sobre outros entries (ex: app_custom_event).
 */
function extractOutboundCtr(ctrStats: AdActionStat[] | undefined): number {
    if (!ctrStats?.length) return 0;
    const entry = ctrStats.find(a => a.action_type === 'outbound_click') ?? ctrStats[0];
    return parseFloat(entry?.value || '0') || 0;
}
