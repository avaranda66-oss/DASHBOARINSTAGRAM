import { NextResponse } from 'next/server';
import { scrapeUrl, scrapeInstagramProfile } from '@/lib/services/firecrawl.service';

/**
 * POST /api/firecrawl
 * 
 * Alternative scraping endpoint using Firecrawl instead of Apify.
 * This route is ADDITIVE — the existing /api/apify routes are untouched.
 * 
 * Body: { url: string, type?: 'scrape' | 'instagram' }
 * Returns: { success: boolean, data?: object, error?: string }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, type = 'scrape' } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL is required' },
                { status: 400 }
            );
        }

        let result;

        if (type === 'instagram') {
            result = await scrapeInstagramProfile(url);
        } else {
            result = await scrapeUrl(url);
        }

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.data,
            source: 'firecrawl',
        });
    } catch (error: any) {
        console.error('[API /firecrawl] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
