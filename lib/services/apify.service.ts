/**
 * Apify Service — server-side integration with Apify REST API.
 *
 * Uses the Instagram Post Scraper actor (apify/instagram-post-scraper)
 * to fetch post metrics from public Instagram profiles.
 */

import type { InstagramPostMetrics, ApifyRunStatus } from '@/types/analytics';

import prisma from '@/lib/db';

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'apify~instagram-post-scraper';
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_MS = 5 * 60 * 1_000; // 5 minutes

async function getApiKey(): Promise<string> {
    // 1. Try DB settings first (saved via Settings UI)
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'global-settings' },
        });
        if (setting?.value) {
            const parsed = JSON.parse(setting.value);
            if (parsed.apifyApiKey && parsed.apifyApiKey.trim() !== '') {
                return parsed.apifyApiKey;
            }
        }
    } catch (e) {
        // DB not available, fall through to env
    }

    // 2. Fall back to environment variable
    const key = process.env.APIFY_API_KEY;
    if (!key) throw new Error('APIFY_API_KEY não configurada. Vá em Settings → Chaves de API.');
    return key;
}

/**
 * Extract an Instagram username from a URL or raw input.
 * Handles: https://instagram.com/user, https://www.instagram.com/user/, @user, user
 */
function extractUsername(input: string): string {
    let cleaned = input.trim().replace(/\/+$/, '');
    // If it's a URL, grab the path segment
    try {
        const url = new URL(cleaned);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) return parts[0];
    } catch {
        // Not a URL — treat as username
    }
    // Strip leading @
    cleaned = cleaned.replace(/^@/, '');
    return cleaned;
}

/** Start the Instagram Post Scraper actor and return the run ID */
export async function startInstagramScraper(
    profileUrls: string[],
    resultsLimit: number = 20,
    periodDays?: number,
): Promise<string> {
    const token = await getApiKey();

    // The actor expects a `username` array of plain usernames (no URLs)
    const usernames = profileUrls.map(extractUsername).filter(Boolean);
    if (usernames.length === 0) {
        throw new Error('Nenhum username válido foi informado');
    }

    const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: usernames,
            resultsLimit,
            ...(periodDays ? { onlyPostsNewerThan: `${periodDays} days` } : {}),
            skipPinnedPosts: true, // Evita confusão com posts antigos fixados no topo
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to start Apify actor: ${res.status} — ${text}`);
    }

    const data = await res.json();
    return data.data.id as string;
}

/** Get the current status of an Apify actor run */
export async function getRunStatus(runId: string): Promise<ApifyRunStatus> {
    const token = await getApiKey();

    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!res.ok) {
        throw new Error(`Failed to get run status: ${res.status}`);
    }

    const data = await res.json();
    return {
        id: data.data.id,
        status: data.data.status,
        datasetId: data.data.defaultDatasetId ?? null,
    };
}

/** Fetch dataset items after a successful actor run */
export async function getDatasetItems(
    datasetId: string,
): Promise<InstagramPostMetrics[]> {
    const token = await getApiKey();

    const res = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json`,
    );
    if (!res.ok) {
        throw new Error(`Failed to get dataset items: ${res.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems: any[] = await res.json();

    return rawItems.map((item) => ({
        id: item.id ?? item.shortCode ?? '',
        shortCode: item.shortCode ?? '',
        url: item.url ?? `https://www.instagram.com/p/${item.shortCode}/`,
        type: item.type ?? 'Image',
        caption: item.caption ?? '',
        hashtags: item.hashtags ?? [],
        likesCount: item.likesCount ?? 0,
        commentsCount: item.commentsCount ?? 0,
        videoViewCount: item.videoViewCount ?? null,
        videoPlayCount: item.videoPlayCount ?? null,
        timestamp: item.timestamp ?? item.takenAtTimestamp ?? '',
        displayUrl: item.displayUrl ?? item.imageUrl ?? '',
        ownerUsername: item.ownerUsername ?? '',
        ownerProfilePicUrl: item.ownerProfilePicUrl ?? item.owner?.profilePicUrl ?? '',
        latestComments: Array.isArray(item.latestComments)
            ? item.latestComments.map((c: any) => ({
                id: c.id ?? '',
                text: c.text ?? '',
                ownerUsername: c.ownerUsername ?? c.owner?.username ?? '',
                timestamp: c.timestamp ?? '',
                likesCount: c.likesCount ?? 0,
            }))
            : [],
    }));
}

/** Helper that waits for the actor run, with polling + timeout */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape posts from the given Instagram profile URLs and wait
 * for the results. Returns the array of post metrics.
 *
 * Throws on timeout (5 min) or actor failure.
 */
export async function scrapeAndWait(
    profileUrls: string[],
    resultsLimit: number = 20,
    periodDays?: number,
): Promise<InstagramPostMetrics[]> {
    const runId = await startInstagramScraper(profileUrls, resultsLimit, periodDays);

    const deadline = Date.now() + MAX_POLL_MS;

    while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const status = await getRunStatus(runId);

        if (status.status === 'SUCCEEDED') {
            if (!status.datasetId) throw new Error('Run succeeded but no dataset ID found');
            return getDatasetItems(status.datasetId);
        }

        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
            throw new Error(`Apify actor run ended with status: ${status.status}`);
        }
    }

    throw new Error('Apify actor run timed out after 5 minutes');
}
