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
        const result: any = await (app as any).scrape(url, {
            formats: ['markdown'],
        });

        return {
            success: true,
            data: {
                markdown: (result as any).markdown || '',
                metadata: (result as any).metadata || {},
            },
        };
    } catch (error: unknown) {
        console.error('[Firecrawl] Scrape error:', error instanceof Error ? error.message : String(error));
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error) || 'Unknown Firecrawl error',
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
        const result: any = await (app as any).crawl(url, {
            limit: maxPages,
        });

        return {
            success: true,
            data: {
                markdown: JSON.stringify(result, null, 2),
                metadata: { pagesScraped: maxPages },
            },
        };
    } catch (error: unknown) {
        console.error('[Firecrawl] Crawl error:', error instanceof Error ? error.message : String(error));
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error) || 'Unknown Firecrawl crawl error',
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
    phone?: string;
    category?: string;
    hours?: string;
    website?: string;
    highlights: string[];
} {
    const result: any = { highlights: [] };

    // Extract business name from markdown heading (# Name)
    const nameMatch = markdown.match(/^#\s+(.+)$/m);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
    }

    // Extract rating — Maps format: "4.9" on its own line, or "4.9 stars", or after heading
    // Pattern 1: standalone decimal number (1.0-5.0) on its own line
    const ratingMatch = markdown.match(/\n(\d\.\d)\n/m)
        || markdown.match(/^(\d\.\d)\s*$/m)
        || markdown.match(/(\d[,.]\d)\s*(?:estrelas?|stars?|★)/i)
        || markdown.match(/(?:rating|avaliação|nota)[:\s]*(\d[,.]\d)/i);
    if (ratingMatch) {
        const val = parseFloat(ratingMatch[1].replace(',', '.'));
        if (val >= 1.0 && val <= 5.0) {
            result.rating = val;
        }
    }

    // Extract total reviews — "123 reviews", "1.234 avaliações", "(123)", etc.
    const reviewsMatch = markdown.match(/(\d[\d.,]*)\s*(?:reviews?|avaliações?|comentários?|opiniões?)/i)
        || markdown.match(/\((\d[\d.,]*)\)/);
    if (reviewsMatch) {
        result.totalReviews = parseInt(reviewsMatch[1].replace(/[.,]/g, ''), 10);
    }

    // Extract category (usually right after rating: "Restaurant", "Restaurante", etc.)
    const categoryMatch = markdown.match(/\n\d\.\d\n+(.+)\n/m);
    if (categoryMatch && categoryMatch[1].trim().length < 50) {
        result.category = categoryMatch[1].trim();
    }

    // Extract address — Brazilian format or general
    const addressMatch = markdown.match(/((?:R\.|Rua|Av\.|Tv\.|Travessa|Alameda|Praça).+?(?:Brazil|Brasil|\d{5}-\d{3}))/i);
    if (addressMatch) {
        result.address = addressMatch[1].trim();
    }

    // Extract phone
    const phoneMatch = markdown.match(/(\+?\d{2}\s?\d{2}\s?\d{4,5}[-\s]?\d{4})/);
    if (phoneMatch) {
        result.phone = phoneMatch[1].trim();
    }

    // Extract hours
    const hoursMatch = markdown.match(/((?:Closed|Aberto|Fechado|Opens?|Abre)\s*[·\-–]\s*.+)/i);
    if (hoursMatch) {
        result.hours = hoursMatch[1].trim();
    }

    // Extract website
    const websiteMatch = markdown.match(/\[.*?\]\((https?:\/\/(?!www\.google|accounts\.google|support\.google|lh3\.googleusercontent)[^\s)]+)\)/);
    if (websiteMatch) {
        result.website = websiteMatch[1];
    }

    // Extract meaningful highlights (skip UI junk)
    const junkPatterns = /collapse|drag|zoom|sign in|google apps|map data|layers|transit|traffic|saved|recents|street view|map type|globe view|labels|default|satellite|wildfires|air quality|map tools|measure|travel time|200 ft|show your|learn more|unavailable|get app|see photos/i;
    const lines = markdown.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 8 && !l.startsWith('![') && !l.startsWith('[') && !l.startsWith('|') && !l.startsWith('-') && !l.startsWith('#') && !junkPatterns.test(l));
    result.highlights = lines.slice(0, 10);

    return result;
}
