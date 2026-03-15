import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramHighlights, getCachedHighlights } from '@/lib/services/instagram-highlights-playwright.service';

/**
 * GET /api/instagram-highlights?username=varanda_dr&refresh=true
 * Retorna highlights, gridOrder e pinnedShortcodes.
 * - Sem refresh: retorna cache se disponível (< 1h), senão faz scrape
 * - Com refresh=true: força novo scrape via Playwright
 */
export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get('username');
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

    if (!username) {
        return NextResponse.json(
            { success: false, error: 'username é obrigatório' },
            { status: 400 },
        );
    }

    // Tentar cache primeiro (instantâneo, sem abrir navegador)
    if (!forceRefresh) {
        const cached = getCachedHighlights(username);
        if (cached && cached.success) {
            return NextResponse.json({ ...cached, fromCache: true });
        }
    }

    // Sem cache ou refresh forçado → scrape via Playwright
    try {
        const result = await scrapeInstagramHighlights(username);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API/instagram-highlights] Error:', error);
        // Se falhou mas tem cache antigo, retorna ele
        const staleCache = getCachedHighlights(username);
        if (staleCache) {
            return NextResponse.json({ ...staleCache, fromCache: true, stale: true });
        }
        return NextResponse.json(
            { success: false, highlights: [], pinnedShortcodes: [], gridOrder: [], error: error.message },
            { status: 500 },
        );
    }
}
