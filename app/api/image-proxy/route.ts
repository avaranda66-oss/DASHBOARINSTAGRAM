import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Instagram CDN images to avoid CORS / hotlink blocking.
 * Usage: /api/image-proxy?url=https://...instagram...
 */
export async function GET(req: NextRequest) {
    const imageUrl = req.nextUrl.searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    try {
        const res = await fetch(imageUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://www.instagram.com/',
            },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        const contentType = res.headers.get('content-type') ?? 'image/jpeg';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Image proxy error' }, { status: 500 });
    }
}
