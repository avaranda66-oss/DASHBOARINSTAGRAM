import type { InstagramPostMetrics, MetaPostMetrics, PostComment } from '@/types/analytics';

const GRAPH_BASE = 'https://graph.instagram.com';
const GRAPH_VERSION = 'v25.0';

type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;

const mediaTypeMap: Record<string, InstagramPostMetrics['type']> = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    CAROUSEL_ALBUM: 'Sidecar',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractShortCode(permalink: string): string {
    // Cobre /p/, /reel/, /reels/, /tv/ — corrige bug de Reels retornando ''
    const match = permalink.match(/\/(?:p|reel|reels|tv)\/([^/?]+)/);
    return match?.[1] ?? '';
}

function extractHashtags(caption: string): string[] {
    const matches = caption.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
    return matches ?? [];
}

/** Headers de autenticação para Meta API — token no header, não na URL */
function metaHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
    return { 'Authorization': `Bearer ${token}`, ...extra };
}

/** Pausa entre chamadas de API para respeitar rate limits */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

const circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    threshold: 5,
    resetTimeout: 60000, // 1 minuto
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
    if (circuitBreaker.failures >= circuitBreaker.threshold) {
        circuitBreaker.isOpen = true;
    }
}

function recordSuccess(): void {
    circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
}

// ─── Cache Layer ─────────────────────────────────────────────────────────────

const apiCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_SHORT = 5 * 60 * 1000; // 5 min para insights de posts
const CACHE_TTL_LONG = 60 * 60 * 1000; // 1h para demographics e online_followers

function getCached<T>(key: string, ttl: number): T | null {
    const entry = apiCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
        apiCache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache(key: string, data: unknown): void {
    apiCache.set(key, { data, timestamp: Date.now() });
    // Evict old entries if cache grows too large
    if (apiCache.size > 200) {
        const oldest = [...apiCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (let i = 0; i < 50; i++) apiCache.delete(oldest[i][0]);
    }
}

/** Fetch com retry, backoff exponencial e circuit breaker */
async function fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries = 2,
): Promise<Response> {
    if (!checkCircuitBreaker()) {
        throw new Error('Circuit breaker aberto — Meta API temporariamente indisponível. Aguarde 1 minuto.');
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, init);
        if (res.status !== 429) {
            recordSuccess();
            return res;
        }
        // Rate limited — esperar com backoff exponencial
        const waitMs = Math.min(1000 * 2 ** attempt, 10000);
        lastError = new Error(`Rate limited após ${maxRetries + 1} tentativas`);
        await sleep(waitMs);
    }
    recordFailure();
    throw lastError!;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawMediaItem {
    id: string;
    caption?: string;
    media_type: MediaType;
    media_product_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
    username?: string;
}

interface InsightValue {
    name: string;
    values?: Array<{ value: number }>;
    value?: number;
}

// ─── Media Insights ──────────────────────────────────────────────────────────

/**
 * Busca os posts e insights privados (reach, saves, shares) via Meta Graph API.
 * Requer token com escopo: instagram_business_basic, instagram_business_manage_insights
 */
export async function fetchInstagramInsights(token: string, limit = 50): Promise<MetaPostMetrics[]> {
    // 1. Buscar lista de posts
    const mediaUrl =
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/media` +
        `?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,username` +
        `&limit=${limit}`;

    const mediaRes = await fetchWithRetry(mediaUrl, { headers: metaHeaders(token) });
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
        throw new Error(`Meta API: ${mediaData.error.message} (código ${mediaData.error.code})`);
    }

    if (!mediaData.data || !Array.isArray(mediaData.data)) {
        throw new Error('Meta API: resposta inesperada ao buscar posts');
    }

    const items: RawMediaItem[] = mediaData.data;
    const posts: MetaPostMetrics[] = [];

    // 2. Para cada post, buscar insights privados
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Determinar tipo de conteúdo
        const productType = item.media_product_type || (item.media_type === 'VIDEO' ? 'REELS' : 'FEED');

        // Métricas base com tipo correto — sem (as any)
        const post: MetaPostMetrics = {
            id: item.id,
            shortCode: extractShortCode(item.permalink),
            url: item.permalink,
            type: mediaTypeMap[item.media_type] ?? 'Image',
            caption: item.caption ?? '',
            hashtags: extractHashtags(item.caption ?? ''),
            likesCount: item.like_count ?? 0,
            commentsCount: item.comments_count ?? 0,
            videoViewCount: null,
            videoPlayCount: null,
            timestamp: item.timestamp,
            displayUrl: (item.media_type === 'VIDEO' ? item.thumbnail_url ?? item.media_url : item.media_url ?? item.thumbnail_url) ?? '',
            ownerUsername: item.username ?? '',
            ownerProfilePicUrl: undefined,
            latestComments: [],
            // Campos MetaPostMetrics — defaults seguros
            reach: 0,
            saved: 0,
            shares: 0,
            totalInteractions: 0,
            source: 'meta',
            media_product_type: productType,
        };

        // 3. Buscar insights avançados (reach, saves, shares, views)
        try {
            // CRÍTICO: se UMA métrica inválida for pedida, a API falha o request INTEIRO
            // plays foi deprecado na v22 — removido para corrigir regressão de 16 posts sem dados
            let metricsParam: string;

            if (productType === 'STORY') {
                metricsParam = 'reach,views,shares,replies,follows,profile_visits';
            } else if (productType === 'REELS') {
                metricsParam = 'reach,saved,shares,views,total_interactions,ig_reels_avg_watch_time';
            } else {
                // FEED (IMAGE / CAROUSEL_ALBUM)
                metricsParam = 'reach,saved,shares,views,total_interactions,follows,profile_visits';
            }

            const insightsUrl =
                `${GRAPH_BASE}/${GRAPH_VERSION}/${item.id}/insights` +
                `?metric=${metricsParam}`;

            const insightsRes = await fetchWithRetry(insightsUrl, { headers: metaHeaders(token) });
            const insightsData = await insightsRes.json();

            if (insightsData.data && Array.isArray(insightsData.data)) {
                const insightMap: Record<string, number> = {};

                insightsData.data.forEach((insight: InsightValue) => {
                    // A API retorna o valor em `values[0].value` ou diretamente em `value`
                    const val = insight.values?.[0]?.value ?? insight.value ?? 0;
                    insightMap[insight.name] = typeof val === 'number' ? val : 0;
                });

                post.reach = insightMap['reach'] ?? 0;
                post.saved = insightMap['saved'] ?? 0;
                post.shares = insightMap['shares'] ?? 0;
                post.totalInteractions = insightMap['total_interactions'] ?? 0;

                // Views para vídeos/reels
                if (insightMap['views'] != null) {
                    post.videoViewCount = insightMap['views'];
                }

                // Watch time de Reels (API retorna em milissegundos)
                if (insightMap['ig_reels_avg_watch_time'] != null) {
                    post.ig_reels_avg_watch_time = insightMap['ig_reels_avg_watch_time'];
                }
            }
        } catch (insightErr) {
            console.warn(`[MetaGraph] Não foi possível buscar insights para ${item.id}:`, insightErr);
            // Continua sem insights avançados — post ainda é incluído
        }

        // Calcular engagement rate incluindo saves e shares (fórmula completa)
        if (post.reach > 0) {
            post.engagementRate =
                ((post.likesCount + post.commentsCount + post.saved + post.shares) / post.reach) * 100;
        }

        posts.push(post);

        // Rate limiting: pausar 100ms entre chamadas de insight para não estourar quota
        if (i < items.length - 1) {
            await sleep(100);
        }
    }

    return posts;
}

// ─── Comments ────────────────────────────────────────────────────────────────

interface RawComment {
    id: string;
    text: string;
    username: string;
    timestamp: string;
    like_count?: number;
}

/**
 * Busca comentários recentes dos posts via Meta Graph API.
 * Usa o parâmetro `since` para buscar apenas comentários NOVOS após o timestamp informado.
 * Retorna comentários ordenados do mais recente para o mais antigo.
 *
 * @param sinceUnix  Timestamp Unix (segundos). Se fornecido, busca apenas comentários após essa data.
 *                   Permite pular os comentários antigos que o Apify já possui.
 */
export async function fetchPostComments(
    token: string,
    shortCodes?: string[],
    sinceUnix?: number,
): Promise<{ shortCode: string; comments: PostComment[] }[]> {
    // 1. Buscar lista de mídia com IDs do Meta (necessários para buscar comentários)
    const mediaItems: { id: string; shortCode: string }[] = [];
    let nextUrl: string | null =
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/media?fields=id,permalink&limit=50`;
    let pages = 0;

    while (nextUrl && pages < 5) {
        const mediaPageRes: Response = await fetch(nextUrl, { headers: metaHeaders(token) });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await mediaPageRes.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message} (código ${data.error.code})`);

        for (const item of data.data ?? []) {
            const sc = extractShortCode(item.permalink);
            if (!shortCodes || shortCodes.includes(sc)) {
                mediaItems.push({ id: item.id, shortCode: sc });
            }
        }
        nextUrl = data.paging?.next ?? null;
        pages++;

        // Para cedo se já temos todos os shortcodes pedidos
        if (shortCodes && mediaItems.length >= shortCodes.length) break;
    }

    // 2. Para cada mídia encontrada, buscar comentários
    const results: { shortCode: string; comments: PostComment[] }[] = [];

    // Parâmetro `since`: Meta API retorna comentários em ordem cronológica (mais antigo primeiro).
    // Usando `since` pulamos diretamente para os comentários mais novos.
    // Se não há `since`, buscamos últimas 48h para garantir comentários recentes.
    const sinceParam = sinceUnix
        ? `&since=${sinceUnix}`
        : `&since=${Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000)}`;

    for (const media of mediaItems) {
        try {
            const allComments: PostComment[] = [];
            let commentNextUrl: string | null =
                `${GRAPH_BASE}/${GRAPH_VERSION}/${media.id}/comments` +
                `?fields=id,text,username,timestamp,like_count&limit=50${sinceParam}`;
            let commentPages = 0;

            while (commentNextUrl && commentPages < 3) {
                const commentRes: Response = await fetch(commentNextUrl, { headers: metaHeaders(token) });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const commentData: any = await commentRes.json();

                if (commentData.error || !Array.isArray(commentData.data)) break;

                const batch: PostComment[] = (commentData.data as RawComment[]).map((c) => ({
                    id: c.id,
                    text: c.text,
                    ownerUsername: c.username,
                    timestamp: c.timestamp,
                    likesCount: c.like_count ?? 0,
                }));

                allComments.push(...batch);
                commentNextUrl = commentData.paging?.next ?? null;
                commentPages++;
            }

            // Ordenar do mais recente para o mais antigo (Meta retorna mais antigos primeiro)
            allComments.sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            results.push({ shortCode: media.shortCode, comments: allComments });
        } catch {
            // Segue para o próximo post se um falhar
        }
    }

    return results;
}

// ─── Token Management ────────────────────────────────────────────────────────

/**
 * Verifica se um token Meta está válido fazendo uma requisição leve.
 */
export async function verifyMetaToken(token: string): Promise<{
    valid: boolean;
    username?: string;
    followersCount?: number;
    name?: string;
    biography?: string;
    profilePictureUrl?: string;
    followsCount?: number;
    mediaCount?: number;
    website?: string;
}> {
    try {
        const res = await fetch(
            `${GRAPH_BASE}/${GRAPH_VERSION}/me?fields=username,followers_count,follows_count,media_count,name,biography,profile_picture_url,website`,
            { headers: metaHeaders(token) }
        );
        const data = await res.json();
        if (data.error) return { valid: false };
        return {
            valid: true,
            username: data.username,
            followersCount: data.followers_count,
            name: data.name,
            biography: data.biography,
            profilePictureUrl: data.profile_picture_url,
            followsCount: data.follows_count,
            mediaCount: data.media_count,
            website: data.website,
        };
    } catch {
        return { valid: false };
    }
}

/**
 * Renova o token de longa duração da Meta API.
 * Deve ser chamado quando o token estiver a menos de 7 dias da expiração.
 * NOTA: OAuth refresh endpoint requer token como query param per spec.
 */
export async function refreshMetaToken(token: string): Promise<{ access_token: string; expires_in: number } | null> {
    try {
        const url = `${GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error || !data.access_token) {
            console.error('[Meta Token Refresh] Falha ao renovar token:', data.error);
            return null;
        }

        return {
            access_token: data.access_token,
            expires_in: data.expires_in
        };
    } catch (err) {
        console.error('[Meta Token Refresh] Erro de rede ao renovar token:', err);
        return null;
    }
}

// ─── Account Insights ────────────────────────────────────────────────────────

export interface AccountDailyMetric {
    date: string;
    reach: number;
    views: number;
    accountsEngaged: number;
    totalInteractions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    followsNet: number;
    profileLinksTaps: number;
}

export interface DemographicEntry {
    label: string;
    count: number;
}

export interface AudienceDemographics {
    followers: {
        age: DemographicEntry[];
        gender: DemographicEntry[];
        city: DemographicEntry[];
        country: DemographicEntry[];
    };
    engaged: {
        age: DemographicEntry[];
        gender: DemographicEntry[];
        city: DemographicEntry[];
        country: DemographicEntry[];
    };
}

export async function fetchAccountInsights(token: string, userId: string, days = 30): Promise<AccountDailyMetric[]> {
    const unixNow = Math.floor(Date.now() / 1000);
    const unixSince = Math.floor((Date.now() - days * 86400000) / 1000);
    const metrics = 'reach,views,accounts_engaged,total_interactions,likes,comments,saves,shares,follows_and_unfollows,profile_links_taps';

    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/insights?metric=${metrics}&period=day&since=${unixSince}&until=${unixNow}`;

    const res = await fetch(url, { headers: metaHeaders(token) });
    const data = await res.json();

    if (data.error) {
        console.error('[Meta API Account Insights] Erro:', data.error);
        return [];
    }

    if (!data.data || !Array.isArray(data.data)) {
        return [];
    }

    const dailyMap: Record<string, AccountDailyMetric> = {};

    data.data.forEach((metricGroup: any) => {
        const metricName = metricGroup.name; // ex: 'reach'
        metricGroup.values?.forEach((val: any) => {
            const dateOnly = val.end_time.substring(0, 10);
            if (!dailyMap[dateOnly]) {
                dailyMap[dateOnly] = {
                    date: dateOnly,
                    reach: 0,
                    views: 0,
                    accountsEngaged: 0,
                    totalInteractions: 0,
                    likes: 0,
                    comments: 0,
                    saves: 0,
                    shares: 0,
                    followsNet: 0,
                    profileLinksTaps: 0,
                };
            }

            const value = val.value ?? 0;

            switch (metricName) {
                case 'reach': dailyMap[dateOnly].reach = value; break;
                case 'views': dailyMap[dateOnly].views = value; break;
                case 'accounts_engaged': dailyMap[dateOnly].accountsEngaged = value; break;
                case 'total_interactions': dailyMap[dateOnly].totalInteractions = value; break;
                case 'likes': dailyMap[dateOnly].likes = value; break;
                case 'comments': dailyMap[dateOnly].comments = value; break;
                case 'saves': dailyMap[dateOnly].saves = value; break;
                case 'shares': dailyMap[dateOnly].shares = value; break;
                case 'follows_and_unfollows': {
                    // Meta API v25+ pode retornar objeto { FOLLOW: N, UNFOLLOW: N } em vez de número
                    if (typeof value === 'object' && value !== null) {
                        dailyMap[dateOnly].followsNet = (value.FOLLOW ?? 0) - (value.UNFOLLOW ?? 0);
                    } else {
                        dailyMap[dateOnly].followsNet = value;
                    }
                    break;
                }
                case 'profile_links_taps': dailyMap[dateOnly].profileLinksTaps = value; break;
            }
        });
    });

    const result = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    return result;
}

// ─── Demographics ────────────────────────────────────────────────────────────

async function fetchDemographicBreakdown(token: string, userId: string, metric: string, breakdown: string): Promise<DemographicEntry[]> {
    // BUG FIX: metric_type=total_value é obrigatório na v25+ para demográficos com breakdown
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/insights?metric=${metric}&period=lifetime&timeframe=last_30_days&breakdown=${breakdown}&metric_type=total_value`;

    try {
        const res = await fetch(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error || !data.data || data.data.length === 0) {
            return [];
        }

        const metricData = data.data[0];
        const breakdowns = metricData.total_value?.breakdowns;
        if (!breakdowns || breakdowns.length === 0) return [];

        const results = breakdowns[0].results;
        if (!results || !Array.isArray(results)) return [];

        return results.map((r: any) => ({
            label: r.dimension_values?.join(', ') ?? 'Desconhecido',
            count: r.value ?? 0
        })).sort((a: any, b: any) => b.count - a.count);
    } catch {
        return [];
    }
}

export async function fetchAudienceDemographics(token: string, userId: string): Promise<AudienceDemographics> {
    const empty: AudienceDemographics = {
        followers: { age: [], gender: [], city: [], country: [] },
        engaged: { age: [], gender: [], city: [], country: [] }
    };

    try {
        // Demographics operations are independent
        const [
            fAge, fGender, fCity, fCountry,
            eAge, eGender, eCity, eCountry
        ] = await Promise.all([
            fetchDemographicBreakdown(token, userId, 'follower_demographics', 'age'),
            fetchDemographicBreakdown(token, userId, 'follower_demographics', 'gender'),
            fetchDemographicBreakdown(token, userId, 'follower_demographics', 'city'),
            fetchDemographicBreakdown(token, userId, 'follower_demographics', 'country'),
            fetchDemographicBreakdown(token, userId, 'engaged_audience_demographics', 'age'),
            fetchDemographicBreakdown(token, userId, 'engaged_audience_demographics', 'gender'),
            fetchDemographicBreakdown(token, userId, 'engaged_audience_demographics', 'city'),
            fetchDemographicBreakdown(token, userId, 'engaged_audience_demographics', 'country'),
        ]);

        return {
            followers: { age: fAge, gender: fGender, city: fCity, country: fCountry },
            engaged: { age: eAge, gender: eGender, city: eCity, country: eCountry }
        };
    } catch (err) {
        console.warn('[Meta API Demographics] Erro ao buscar dados demográficos:', err);
        return empty; // não lançar erro para não quebrar requests parciais
    }
}

// ─── Business Discovery ──────────────────────────────────────────────────────

export interface BusinessDiscoveryResult {
    username: string;
    name?: string;
    biography?: string;
    followersCount: number;
    followsCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
    posts: any[];
}

export async function fetchBusinessDiscovery(token: string, userId: string, targetUsername: string): Promise<BusinessDiscoveryResult | null> {
    const fields = 'username,name,biography,followers_count,follows_count,media_count,profile_picture_url,media.limit(25){id,caption,media_type,like_count,comments_count,timestamp,permalink,media_url}';
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}?fields=business_discovery.username(${targetUsername}){${fields}}`;

    try {
        const res = await fetch(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error) {
            const errMsg = data.error.message ?? JSON.stringify(data.error);
            console.error('[Meta API Business Discovery] Erro:', data.error);
            throw new Error(errMsg);
        }

        const bd = data.business_discovery;
        if (!bd) return null;

        return {
            username: bd.username,
            name: bd.name,
            biography: bd.biography,
            followersCount: bd.followers_count || 0,
            followsCount: bd.follows_count || 0,
            mediaCount: bd.media_count || 0,
            profilePictureUrl: bd.profile_picture_url,
            posts: bd.media?.data || []
        };
    } catch (err: any) {
        console.error('[Meta API Business Discovery] Erro:', err);
        throw err; // propaga para o route handler mostrar o erro real
    }
}

// ─── Comment Management ──────────────────────────────────────────────────────

export async function replyToComment(token: string, commentId: string, message: string): Promise<{ success: boolean; id?: string; error?: string }> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}/replies`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: metaHeaders(token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        if (data.error) {
            console.error('[Meta API] Erro ao responder comentário:', data.error);
            return { success: false, error: data.error.message };
        }

        return { success: true, id: data.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function hideComment(token: string, commentId: string): Promise<{ success: boolean; error?: string }> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}?hide=true`;
    try {
        const res = await fetch(url, { method: 'POST', headers: metaHeaders(token) });
        const data = await res.json();
        if (data.error) return { success: false, error: data.error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteComment(token: string, commentId: string): Promise<{ success: boolean; error?: string }> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}`;
    try {
        const res = await fetch(url, { method: 'DELETE', headers: metaHeaders(token) });
        const data = await res.json();
        if (data.error) return { success: false, error: data.error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export async function getInstagramUserId(token: string): Promise<string | null> {
    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/me?fields=id`;
        const res = await fetch(url, { headers: metaHeaders(token) });
        const data = await res.json();
        return data.id || null;
    } catch {
        return null;
    }
}

// ─── Content Publishing ──────────────────────────────────────────────────────

export async function publishImage(token: string, userId: string, imageUrl: string, caption: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const createUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}`;
        const createRes = await fetch(createUrl, { method: 'POST', headers: metaHeaders(token) });
        const createData = await createRes.json();

        if (createData.error) {
            console.error('[Meta API Publish Create]', createData.error);
            return { success: false, error: createData.error.message };
        }

        const containerId = createData.id;
        if (!containerId) return { success: false, error: 'Container não criado.' };

        // 2. Aguardar processamento (Status Check)
        console.log(`[Meta API Publish] Aguardando processamento do container ${containerId}...`);
        let ready = false;
        let attempts = 0;
        while (!ready && attempts < 10) {
            attempts++;
            await sleep(3000); 
            const statusRes = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${containerId}?fields=status_code`, { headers: metaHeaders(token) });
            const statusData = await statusRes.json();
            
            if (statusData.status_code === 'FINISHED') {
                ready = true;
            } else if (statusData.status_code === 'ERROR') {
                return { success: false, error: 'Erro no processamento da imagem pela Meta.' };
            }
        }

        const pubUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media_publish?creation_id=${containerId}`;
        const pubRes = await fetch(pubUrl, { method: 'POST', headers: metaHeaders(token) });
        const pubData = await pubRes.json();

        if (pubData.error) {
            console.error('[Meta API Publish Error]', pubData.error);
            return { success: false, error: pubData.error.message };
        }

        return { success: true, id: pubData.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Publica um Vídeo/Reel via Meta API.
 */
export async function publishVideo(
    token: string, 
    userId: string, 
    videoUrl: string, 
    caption: string,
    isReel: boolean = false
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const mediaType = isReel ? 'REELS' : 'VIDEO';
        console.log(`[Meta API Video] Criando container para ${mediaType}: ${videoUrl}...`);
        
        const createUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?video_url=${encodeURIComponent(videoUrl)}&media_type=${mediaType}&caption=${encodeURIComponent(caption)}`;
        const createRes = await fetch(createUrl, { method: 'POST', headers: metaHeaders(token) });
        const createData = await createRes.json();

        if (createData.error) {
            console.error('[Meta API Video Create]', createData.error);
            return { success: false, error: createData.error.message };
        }

        const containerId = createData.id;
        if (!containerId) return { success: false, error: 'Container não criado.' };

        // 2. Aguardar processamento (Polling obrigatório para vídeos - costumam demorar)
        console.log(`[Meta API Video] Aguardando processamento do vídeo ${containerId}...`);
        let ready = false;
        let attempts = 0;
        const maxAttempts = 20; // Vídeos demoram mais (até 1 minuto aqui)
        
        while (!ready && attempts < maxAttempts) {
            attempts++;
            await sleep(15000); // 15 segundos entre checagens — evita rate limit da Meta API

            const statusRes = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${containerId}?fields=status_code,error_message`, { headers: metaHeaders(token) });
            const statusData = await statusRes.json();

            console.log(`[Meta API Video] Status tentativa ${attempts}: ${statusData.status_code}`);

            if (statusData.status_code === 'FINISHED') {
                ready = true;
            } else if (statusData.status_code === 'ERROR') {
                const errorMsg = statusData.error_message || 'Erro de processamento desconhecido.';
                console.error(`[Meta API Video] Erro detectado: ${errorMsg}`);
                return { success: false, error: `Erro no processamento do vídeo: ${errorMsg}` };
            } else if (statusData.error?.code === 4) {
                // Rate limit da Meta API — aguardar 30s antes de tentar novamente
                console.warn(`[Meta API Video] Rate limit atingido na tentativa ${attempts}. Aguardando 30s...`);
                await sleep(30000);
            } else if (!statusData.status_code) {
                console.warn(`[Meta API Video] Resposta inesperada da Meta:`, statusData);
            }
        }

        if (!ready) {
            return { success: false, error: 'Tempo limite esgotado no processamento do vídeo.' };
        }

        // 3. Publicar
        const pubUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media_publish?creation_id=${containerId}`;
        const pubRes = await fetch(pubUrl, { method: 'POST', headers: metaHeaders(token) });
        const pubData = await pubRes.json();

        if (pubData.error) {
            console.error('[Meta API Video Publish Error]', pubData.error);
            return { success: false, error: pubData.error.message };
        }

        return { success: true, id: pubData.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/** Atalho para Reels */
export async function publishReel(token: string, userId: string, videoUrl: string, caption: string) {
    return publishVideo(token, userId, videoUrl, caption, true);
}

/**
 * Publica um Story via Meta API.
 * Stories não aceitam legenda (caption) via API de publicação direta da mesma forma que posts.
 */
export async function publishStory(
    token: string, 
    userId: string, 
    mediaUrl: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        console.log(`[Meta API Story] Criando container para STORY: ${mediaUrl}...`);
        
        const isVideo = mediaUrl.toLowerCase().match(/\.(mp4|mov|avi|wmv|m4v)$/i);
        const createParam = isVideo ? `video_url=${encodeURIComponent(mediaUrl)}` : `image_url=${encodeURIComponent(mediaUrl)}`;
        
        const createUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?media_type=STORIES&${createParam}`;
        const createRes = await fetch(createUrl, { method: 'POST', headers: metaHeaders(token) });
        const createData = await createRes.json();

        if (createData.error) {
            console.error('[Meta API Story Create]', createData.error);
            return { success: false, error: createData.error.message };
        }

        const containerId = createData.id;
        if (!containerId) return { success: false, error: 'Container não criado.' };

        // 2. Aguardar processamento (Stories podem ser vídeo ou imagem)
        console.log(`[Meta API Story] Aguardando processamento do container ${containerId}...`);
        let ready = false;
        let attempts = 0;
        const maxAttempts = isVideo ? 20 : 10;
        
        while (!ready && attempts < maxAttempts) {
            attempts++;
            await sleep(isVideo ? 15000 : 8000); // 15s vídeo / 8s imagem — evita rate limit

            const statusRes = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${containerId}?fields=status_code,error_message`, { headers: metaHeaders(token) });
            const statusData = await statusRes.json();

            console.log(`[Meta API Story] Status tentativa ${attempts}: ${statusData.status_code}`);

            if (statusData.status_code === 'FINISHED') {
                ready = true;
            } else if (statusData.status_code === 'ERROR') {
                const errorMsg = statusData.error_message || 'Erro de processamento desconhecido.';
                console.error(`[Meta API Story] ❌ Erro no processamento (tentativa ${attempts}): ${errorMsg}`);
                return { success: false, error: `Erro no story: ${errorMsg}` };
            } else if (statusData.error?.code === 4) {
                console.warn(`[Meta API Story] Rate limit atingido na tentativa ${attempts}. Aguardando 30s...`);
                await sleep(30000);
            } else if (!statusData.status_code) {
                console.warn(`[Meta API Story] Resposta inesperada da Meta:`, statusData);
            }
        }

        if (!ready) return { success: false, error: 'Tempo limite esgotado no processamento do story.' };

        // 3. Publicar
        const pubUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media_publish?creation_id=${containerId}`;
        const pubRes = await fetch(pubUrl, { method: 'POST', headers: metaHeaders(token) });
        const pubData = await pubRes.json();

        if (pubData.error) {
            console.error('[Meta API Story Publish Error]', pubData.error);
            return { success: false, error: pubData.error.message };
        }

        return { success: true, id: pubData.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Publica um Carousel (Sidecar) via Meta API.
 * Requer URLs públicas para as imagens.
 */
export async function publishCarousel(
    token: string,
    userId: string,
    imageUrls: string[],
    caption: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        console.log(`[Meta API Carousel] Iniciando criação de container para ${imageUrls.length} imagens...`);
        
        // 1. Criar containers individuais para cada item do carousel
        const itemIds: string[] = [];
        for (const url of imageUrls) {
            const isVideoItem = url.toLowerCase().match(/\.(mp4|mov|avi|wmv|m4v)$/i);
            const itemMediaParam = isVideoItem
                ? `video_url=${encodeURIComponent(url)}&media_type=VIDEO`
                : `image_url=${encodeURIComponent(url)}&media_type=IMAGE`;
            const createItemUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?${itemMediaParam}&is_carousel_item=true`;
            const res = await fetch(createItemUrl, { method: 'POST', headers: metaHeaders(token) });
            const data = await res.json();
            
            if (data.error) {
                return { success: false, error: `Erro no item ${url}: ${data.error.message}` };
            }
            itemIds.push(data.id);
        }

        // 2. Aguardar (polling opcional, mas recomendado para vídeos; para imagens costuma ser rápido)
        // Por simplicidade e cautela, aguardamos um breve momento
        await sleep(3000);

        // 3. Criar o container pai do Carousel
        const childrenParam = itemIds.join(',');
        const createCarouselUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?media_type=CAROUSEL&children=${childrenParam}&caption=${encodeURIComponent(caption)}`;
        
        const carouselRes = await fetch(createCarouselUrl, { method: 'POST', headers: metaHeaders(token) });
        const carouselData = await carouselRes.json();

        if (carouselData.error) {
            console.error('[Meta API Carousel Create]', carouselData.error);
            return { success: false, error: `Container Pai: ${carouselData.error.message}` };
        }

        const creationId = carouselData.id;

        // 4. Aguardar processamento do carrossel (Status Check)
        console.log(`[Meta API Carousel] Aguardando processamento do container pai ${creationId}...`);
        let ready = false;
        let attempts = 0;
        while (!ready && attempts < 10) {
            attempts++;
            await sleep(3000);
            const statusRes = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${creationId}?fields=status_code,error_message`, { headers: metaHeaders(token) });
            const statusData = await statusRes.json();
            
            if (statusData.status_code === 'FINISHED') {
                ready = true;
                console.log(`[Meta API Carousel] Container pronto após ${attempts} tentativa(s).`);
            } else if (statusData.status_code === 'ERROR') {
                const errorMsg = statusData.error_message || 'Erro de processamento desconhecido no carrossel.';
                return { success: false, error: `Erro no carrossel: ${errorMsg}` };
            }
        }

        // 5. Publicar o carousel
        const pubUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media_publish?creation_id=${creationId}`;
        const pubRes = await fetch(pubUrl, { method: 'POST', headers: metaHeaders(token) });
        const pubData = await pubRes.json();

        if (pubData.error) {
            console.error('[Meta API Carousel Publish]', pubData.error);
            return { success: false, error: `Publicação: ${pubData.error.message}` };
        }

        return { success: true, id: pubData.id };
    } catch (err: any) {
        console.error('[Meta API Carousel Catch]', err);
        return { success: false, error: err.message };
    }
}

// ─── Carousel Children ──────────────────────────────────────────────────────

export interface CarouselChild {
    id: string;
    media_type: string;
    media_url?: string;
    timestamp?: string;
}

/**
 * Busca os itens individuais de um carousel (children).
 * Permite analisar performance per-slide.
 */
export async function fetchCarouselChildren(
    token: string,
    mediaId: string
): Promise<CarouselChild[]> {
    const cacheKey = `children:${mediaId}`;
    const cached = getCached<CarouselChild[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${mediaId}/children?fields=id,media_type,media_url,timestamp`;
        const res = await fetchWithRetry(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error || !data.data) return [];

        const children: CarouselChild[] = data.data;
        setCache(cacheKey, children);
        return children;
    } catch {
        return [];
    }
}

// ─── Online Followers ────────────────────────────────────────────────────────

export interface OnlineFollowersData {
    hourlyBreakdown: { hour: number; count: number }[];
    peakHour: number;
    peakCount: number;
}

/**
 * Busca os horarios em que os seguidores estao mais ativos.
 * Disponivel apenas para contas business/creator com 100+ seguidores.
 */
export async function fetchOnlineFollowers(
    token: string,
    userId: string
): Promise<OnlineFollowersData | null> {
    const cacheKey = `online_followers:${userId}`;
    const cached = getCached<OnlineFollowersData>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/insights?metric=online_followers&period=lifetime`;
        const res = await fetchWithRetry(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error || !data.data || data.data.length === 0) return null;

        const values = data.data[0]?.values?.[0]?.value;
        if (!values || typeof values !== 'object') return null;

        const hourlyBreakdown: { hour: number; count: number }[] = [];
        let peakHour = 0;
        let peakCount = 0;

        for (const [hourStr, count] of Object.entries(values)) {
            const hour = parseInt(hourStr);
            const c = typeof count === 'number' ? count : 0;
            hourlyBreakdown.push({ hour, count: c });
            if (c > peakCount) {
                peakCount = c;
                peakHour = hour;
            }
        }

        hourlyBreakdown.sort((a, b) => a.hour - b.hour);

        const result: OnlineFollowersData = { hourlyBreakdown, peakHour, peakCount };
        setCache(cacheKey, result);
        return result;
    } catch {
        return null;
    }
}

// ─── Tagged Media (UGC) ─────────────────────────────────────────────────────

export interface TaggedMedia {
    id: string;
    caption?: string;
    media_type: string;
    permalink: string;
    timestamp: string;
    username?: string;
}

/**
 * Busca posts onde a conta foi taggeada (User Generated Content).
 */
export async function fetchTaggedMedia(
    token: string,
    userId: string,
    limit = 25
): Promise<TaggedMedia[]> {
    const cacheKey = `tagged:${userId}`;
    const cached = getCached<TaggedMedia[]>(cacheKey, CACHE_TTL_SHORT);
    if (cached) return cached;

    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/tags?fields=id,caption,media_type,permalink,timestamp,username&limit=${limit}`;
        const res = await fetchWithRetry(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error || !data.data) return [];

        const result: TaggedMedia[] = data.data;
        setCache(cacheKey, result);
        return result;
    } catch {
        return [];
    }
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export interface StoryMedia {
    id: string;
    media_type: string;
    media_url?: string;
    timestamp: string;
    permalink?: string;
}

/**
 * Busca stories ativas (apenas as das ultimas 24h).
 */
export async function fetchActiveStories(
    token: string,
    userId: string
): Promise<StoryMedia[]> {
    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/stories?fields=id,media_type,media_url,timestamp,permalink`;
        const res = await fetchWithRetry(url, { headers: metaHeaders(token) });
        const data = await res.json();

        if (data.error || !data.data) return [];
        return data.data;
    } catch {
        return [];
    }
}

// ─── Cache Management ────────────────────────────────────────────────────────

/** Limpa todo o cache da API */
export function clearApiCache(): void {
    apiCache.clear();
}

/** Retorna estatisticas do cache */
export function getApiCacheStats(): { size: number; entries: string[] } {
    return {
        size: apiCache.size,
        entries: [...apiCache.keys()],
    };
}
