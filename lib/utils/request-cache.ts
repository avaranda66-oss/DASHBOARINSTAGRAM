/**
 * US-57 — Request Deduplication + Cache com TTL
 * Cache em memória para evitar requests duplicados e reutilizar respostas recentes.
 */

interface CacheEntry<T> {
    data: T;
    cachedAt: number;
    ttl: number; // ms
}

// TTL padrão por endpoint (ms)
const DEFAULT_TTL: Record<string, number> = {
    '/api/ads-campaigns': 5 * 60 * 1000,   // 5 min
    '/api/ads-insights': 15 * 60 * 1000,   // 15 min
    '/api/ads-creatives': 10 * 60 * 1000,  // 10 min
    '/api/ads-intelligence': 15 * 60 * 1000,
};

const FALLBACK_TTL = 5 * 60 * 1000; // 5 min

// Cache de respostas
const cache = new Map<string, CacheEntry<unknown>>();
// Deduplication: promises in-flight
const inFlight = new Map<string, Promise<unknown>>();

function cacheKey(endpoint: string, body: unknown): string {
    return `${endpoint}::${JSON.stringify(body)}`;
}

/** Verifica se entrada está válida (dentro do TTL) */
export function isCacheValid(endpoint: string, body: unknown): boolean {
    const key = cacheKey(endpoint, body);
    const entry = cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.cachedAt < entry.ttl;
}

/** Retorna dados do cache se válidos, null caso contrário */
export function getCached<T>(endpoint: string, body: unknown): T | null {
    const key = cacheKey(endpoint, body);
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.cachedAt >= entry.ttl) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/** Retorna há quantos ms o cache foi atualizado (null se não existe) */
export function getCacheAge(endpoint: string, body: unknown): number | null {
    const key = cacheKey(endpoint, body);
    const entry = cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.cachedAt;
}

/** Armazena resposta no cache */
export function setCache<T>(endpoint: string, body: unknown, data: T, ttlOverride?: number): void {
    const key = cacheKey(endpoint, body);
    const ttl = ttlOverride ?? DEFAULT_TTL[endpoint] ?? FALLBACK_TTL;
    cache.set(key, { data, cachedAt: Date.now(), ttl });
}

/** Invalida cache de um endpoint específico */
export function invalidateCache(endpoint: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(`${endpoint}::`)) {
            cache.delete(key);
        }
    }
}

/** Invalida todo o cache */
export function clearAllCache(): void {
    cache.clear();
}

/**
 * Fetch com deduplication + cache.
 * - Se existe cache válido, retorna sem fazer request.
 * - Se já existe um request in-flight para a mesma chave, aguarda o mesmo.
 * - Caso contrário, faz o request e armazena no cache.
 */
export async function cachedFetch<T>(
    endpoint: string,
    body: unknown,
    options?: { forceRefresh?: boolean; ttl?: number }
): Promise<{ data: T; fromCache: boolean }> {
    const key = cacheKey(endpoint, body);

    // Cache hit
    if (!options?.forceRefresh) {
        const cached = getCached<T>(endpoint, body);
        if (cached !== null) {
            return { data: cached, fromCache: true };
        }
    }

    // In-flight dedup
    if (inFlight.has(key)) {
        const data = await (inFlight.get(key) as Promise<T>);
        return { data, fromCache: false };
    }

    // Novo request
    const promise = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json() as T;
        setCache(endpoint, body, data, options?.ttl);
        return data;
    }).finally(() => {
        inFlight.delete(key);
    });

    inFlight.set(key, promise as Promise<unknown>);

    const data = await promise;
    return { data, fromCache: false };
}
