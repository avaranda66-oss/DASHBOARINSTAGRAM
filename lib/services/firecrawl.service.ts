import FirecrawlApp from '@mendable/firecrawl-js';

/**
 * Firecrawl Service — Alternative to Apify for web scraping
 * This is an ADDITIVE service. Apify service is NOT modified or replaced.
 * 
 * Firecrawl converts any web page to LLM-friendly markdown or structured JSON.
 * Free tier: 500 credits/month (1 credit = 1 page scrape)
 * 
 * @see https://firecrawl.dev
 */

interface FirecrawlScrapeResult {
    success: boolean;
    data?: {
        markdown?: string;
        metadata?: Record<string, unknown>;
        html?: string;
    };
    error?: string;
}

import prisma from '@/lib/db';

/**
 * Get the Firecrawl API key from database settings or environment
 */
async function getFirecrawlApiKey(): Promise<string> {
    // 1. Try DB settings first (saved via Settings UI)
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'global-settings' },
        });
        if (setting?.value) {
            const parsed = JSON.parse(setting.value);
            if (parsed.firecrawlApiKey && parsed.firecrawlApiKey.trim() !== '') {
                return parsed.firecrawlApiKey;
            }
        }
    } catch (e) {
        // DB not available, fall through to env
    }

    // 2. Fall back to environment variable
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) throw new Error('FIRECRAWL_API_KEY não configurada. Vá em Settings → Chaves de API.');
    return key;
}

/**
 * Scrape a single URL and return its content as markdown
 */
export async function scrapeUrl(url: string): Promise<FirecrawlScrapeResult> {
    const apiKey = await getFirecrawlApiKey();
    const app = new FirecrawlApp({ apiKey });

    try {
        const result: any = await (app as any).scrapeUrl(url, {
            formats: ['markdown'],
        });

        return {
            success: true,
            data: {
                markdown: (result as any).markdown || '',
                metadata: (result as any).metadata || {},
            },
        };
    } catch (error: any) {
        console.error('[Firecrawl] Scrape error:', error.message);
        return {
            success: false,
            error: error.message || 'Unknown Firecrawl error',
        };
    }
}

/**
 * Scrape an Instagram profile page and extract structured data
 */
export async function scrapeInstagramProfile(profileUrl: string): Promise<FirecrawlScrapeResult> {
    // Normalize URL
    let url = profileUrl.trim();
    if (!url.startsWith('http')) {
        // Handle bare handles like "username" or "@username"
        const handle = url.replace(/^@/, '').replace(/\/+$/, '');
        url = `https://www.instagram.com/${handle}/`;
    }

    return scrapeUrl(url);
}

/**
 * Crawl multiple pages starting from a URL (useful for deep scraping)
 */
export async function crawlUrl(url: string, maxPages: number = 5): Promise<FirecrawlScrapeResult> {
    const apiKey = await getFirecrawlApiKey();
    const app = new FirecrawlApp({ apiKey });

    try {
        const result: any = await (app as any).crawlUrl(url, {
            limit: maxPages,
        });

        return {
            success: true,
            data: {
                markdown: JSON.stringify(result, null, 2),
                metadata: { pagesScraped: maxPages },
            },
        };
    } catch (error: any) {
        console.error('[Firecrawl] Crawl error:', error.message);
        return {
            success: false,
            error: error.message || 'Unknown Firecrawl crawl error',
        };
    }
}

/**
 * Scrape a Google Maps business page and extract ratings/reviews
 */
export async function scrapeGoogleMaps(query: string): Promise<FirecrawlScrapeResult> {
    // Build a Google Maps search URL
    let url = query.trim();
    if (!url.startsWith('http')) {
        url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    }

    return scrapeUrl(url);
}

/**
 * Parse Google Maps markdown data to extract structured info
 */
export function parseGoogleMapsData(markdown: string): {
    name?: string;
    rating?: number;
    totalReviews?: number;
    address?: string;
    category?: string;
    highlights: string[];
} {
    const result: any = { highlights: [] };

    // Try to extract rating (e.g., "4.5" or "4,5")
    const ratingMatch = markdown.match(/(\d[,.]\d)\s*(?:estrelas?|stars?|★)/i)
        || markdown.match(/(?:rating|avaliação|nota)[:\s]*(\d[,.]\d)/i);
    if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
    }

    // Try to extract total reviews
    const reviewsMatch = markdown.match(/(\d[\d.,]*)\s*(?:reviews?|avaliações?|comentários?)/i);
    if (reviewsMatch) {
        result.totalReviews = parseInt(reviewsMatch[1].replace(/[.,]/g, ''), 10);
    }

    // Extract first few lines as highlights
    const lines = markdown.split('\n').filter(l => l.trim().length > 10).slice(0, 8);
    result.highlights = lines;

    return result;
}
