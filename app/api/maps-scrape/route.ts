import { NextRequest, NextResponse } from 'next/server';
import { scrapeGoogleMapsWithPlaywright } from '@/lib/services/maps-playwright.service';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ success: false, error: 'Query é obrigatório.' }, { status: 400 });
        }

        const result = await scrapeGoogleMapsWithPlaywright(query);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API maps-scrape] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
