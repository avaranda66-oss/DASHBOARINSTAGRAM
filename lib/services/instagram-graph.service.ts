import type { InstagramPostMetrics, PostComment } from '@/types/analytics';

const GRAPH_BASE = 'https://graph.instagram.com';
const GRAPH_VERSION = 'v25.0';

type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;

const mediaTypeMap: Record<string, InstagramPostMetrics['type']> = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    CAROUSEL_ALBUM: 'Sidecar',
};

function extractShortCode(permalink: string): string {
    // "https://www.instagram.com/p/CxYZ123abc/" → "CxYZ123abc"
    const match = permalink.match(/\/p\/([^/]+)/);
    return match?.[1] ?? '';
}

function extractHashtags(caption: string): string[] {
    const matches = caption.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
    return matches ?? [];
}

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

/**
 * Busca os posts e insights privados (reach, saves, shares) via Meta Graph API.
 * Requer token com escopo: instagram_business_basic, instagram_business_manage_insights
 */
export async function fetchInstagramInsights(token: string, limit = 50): Promise<InstagramPostMetrics[]> {
    // 1. Buscar lista de posts
    const mediaUrl =
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/media` +
        `?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,username` +
        `&limit=${limit}` +
        `&access_token=${token}`;

    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
        throw new Error(`Meta API: ${mediaData.error.message} (código ${mediaData.error.code})`);
    }

    if (!mediaData.data || !Array.isArray(mediaData.data)) {
        throw new Error('Meta API: resposta inesperada ao buscar posts');
    }

    const items: RawMediaItem[] = mediaData.data;
    const posts: InstagramPostMetrics[] = [];

    // 2. Para cada post, buscar insights privados
    for (const item of items) {
        // Métricas base (sempre disponíveis)
        const basePost: InstagramPostMetrics = {
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
            displayUrl: item.media_url ?? item.thumbnail_url ?? '',
            ownerUsername: item.username ?? '',
            ownerProfilePicUrl: undefined,
            latestComments: [],
        };

        // 3. Buscar insights avançados (reach, saves, shares, views)
        try {
            // CRÍTICO: se UMA métrica inválida for pedida, a API falha o request INTEIRO
            // plays foi deprecado na v22 — removido para corrigir regressão de 16 posts sem dados
            const productType = item.media_product_type || (item.media_type === 'VIDEO' ? 'REELS' : 'FEED');
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
                `?metric=${metricsParam}` +
                `&access_token=${token}`;

            const insightsRes = await fetch(insightsUrl);
            const insightsData = await insightsRes.json();

            if (insightsData.data && Array.isArray(insightsData.data)) {
                const insightMap: Record<string, number> = {};

                insightsData.data.forEach((insight: InsightValue) => {
                    // A API retorna o valor em `values[0].value` ou diretamente em `value`
                    const val = insight.values?.[0]?.value ?? insight.value ?? 0;
                    insightMap[insight.name] = typeof val === 'number' ? val : 0;
                });

                // Adicionar campos privados como propriedades extras
                (basePost as any).reach = insightMap['reach'] ?? 0;
                (basePost as any).saved = insightMap['saved'] ?? 0;
                (basePost as any).shares = insightMap['shares'] ?? 0;
                (basePost as any).totalInteractions = insightMap['total_interactions'] ?? 0;
                (basePost as any).source = 'meta';

                // Views para vídeos/reels
                if (insightMap['views'] != null) {
                    basePost.videoViewCount = insightMap['views'];
                }
            }
        } catch (insightErr) {
            console.warn(`[MetaGraph] Não foi possível buscar insights para ${item.id}:`, insightErr);
            // Continua sem insights avançados — post ainda é incluído
        }

        // Calcular engagement rate (likes + comments) / reach * 100
        const reach = (basePost as any).reach ?? 0;
        if (reach > 0) {
            basePost.engagementRate =
                ((basePost.likesCount + basePost.commentsCount) / reach) * 100;
        }

        posts.push(basePost);
    }

    return posts;
}

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
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/media?fields=id,permalink&limit=50&access_token=${token}`;
    let pages = 0;

    while (nextUrl && pages < 5) {
        const mediaPageRes: Response = await fetch(nextUrl);
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
            // Usando `since` o Meta API já filtra apenas comentários após aquele momento.
            // Paginar até 3 páginas (150 comentários recentes) é suficiente com esse filtro.
            const allComments: PostComment[] = [];
            let commentNextUrl: string | null =
                `${GRAPH_BASE}/${GRAPH_VERSION}/${media.id}/comments` +
                `?fields=id,text,username,timestamp,like_count&limit=50${sinceParam}&access_token=${token}`;
            let commentPages = 0;

            while (commentNextUrl && commentPages < 3) {
                const commentRes: Response = await fetch(commentNextUrl);
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

/**
 * Verifica se um token Meta está válido fazendo uma requisição leve.
 */
export async function verifyMetaToken(token: string): Promise<{ valid: boolean; username?: string }> {
    try {
        const res = await fetch(
            `${GRAPH_BASE}/${GRAPH_VERSION}/me?fields=username&access_token=${token}`
        );
        const data = await res.json();
        if (data.error) return { valid: false };
        return { valid: true, username: data.username };
    } catch {
        return { valid: false };
    }
}

/**
 * Renova o token de longa duração da Meta API.
 * Deve ser chamado quando o token estiver a menos de 7 dias da expiração.
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

    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/insights?metric=${metrics}&period=day&since=${unixSince}&until=${unixNow}&access_token=${token}`;

    const res = await fetch(url);
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
            // val.end_time é formato ISO, ex: 2026-03-01T08:00:00+0000
            // Usaremos a porsão da data para agrupar (YYYY-MM-DD)
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
                case 'follows_and_unfollows': dailyMap[dateOnly].followsNet = value; break; // pode ter breakdown no futuro, se não, usamos value
                case 'profile_links_taps': dailyMap[dateOnly].profileLinksTaps = value; break;
            }
        });
    });

    const result = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    return result;
}

async function fetchDemographicBreakdown(token: string, userId: string, metric: string, breakdown: string): Promise<DemographicEntry[]> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/insights?metric=${metric}&period=lifetime&timeframe=last_30_days&breakdown=${breakdown}&access_token=${token}`;
    
    try {
        const res = await fetch(url);
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
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}?fields=business_discovery.username(${targetUsername}){${fields}}&access_token=${token}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            console.error('[Meta API Business Discovery] Erro:', data.error);
            return null;
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
    } catch (err) {
        console.error('[Meta API Business Discovery] Erro de rede:', err);
        return null;
    }
}

export async function replyToComment(token: string, commentId: string, message: string): Promise<{ success: boolean; id?: string; error?: string }> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}/replies?access_token=${token}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}?hide=true&access_token=${token}`;
    try {
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        if (data.error) return { success: false, error: data.error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteComment(token: string, commentId: string): Promise<{ success: boolean; error?: string }> {
    const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${commentId}?access_token=${token}`;
    try {
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) return { success: false, error: data.error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getInstagramUserId(token: string): Promise<string | null> {
    try {
        const url = `${GRAPH_BASE}/${GRAPH_VERSION}/me?fields=id&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.id || null;
    } catch {
        return null;
    }
}

export async function publishImage(token: string, userId: string, imageUrl: string, caption: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const createUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`;
        const createRes = await fetch(createUrl, { method: 'POST' });
        const createData = await createRes.json();
        
        if (createData.error) {
            console.error('[Meta API Publish Create]', createData.error);
            return { success: false, error: createData.error.message };
        }
        
        const containerId = createData.id;
        if (!containerId) return { success: false, error: 'Container não criado.' };

        const pubUrl = `${GRAPH_BASE}/${GRAPH_VERSION}/${userId}/media_publish?creation_id=${containerId}&access_token=${token}`;
        const pubRes = await fetch(pubUrl, { method: 'POST' });
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
