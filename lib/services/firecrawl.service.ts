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

/**
 * Get the Firecrawl API key from environment or database settings
 */
function getFirecrawlApiKey(): string {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) throw new Error('FIRECRAWL_API_KEY is not set. Configure it in Settings → Integrações Locais.');
    return key;
}

/**
 * Scrape a single URL and return its content as markdown
 */
export async function scrapeUrl(url: string): Promise<FirecrawlScrapeResult> {
    const apiKey = getFirecrawlApiKey();
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
    const apiKey = getFirecrawlApiKey();
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
