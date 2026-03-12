import { NextResponse } from 'next/server';
import { fetchCarouselChildren } from '@/lib/services/instagram-graph.service';

export async function POST(req: Request) {
    try {
        const { token, mediaId } = await req.json();
        if (!token || !mediaId) {
            return NextResponse.json({ success: false, error: 'Token e mediaId são obrigatórios' }, { status: 400 });
        }

        const children = await fetchCarouselChildren(token, mediaId);
        return NextResponse.json({ success: true, data: children });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
