import { NextRequest, NextResponse } from 'next/server';
import { fetchPostComments } from '@/lib/services/instagram-graph.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, shortCodes, sinceUnix } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token Meta obrigatório.' },
                { status: 400 },
            );
        }

        const data = await fetchPostComments(token, shortCodes, sinceUnix);

        return NextResponse.json({ success: true, data, total: data.length });
    } catch (error: any) {
        console.error('[/api/meta-comments] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro ao buscar comentários.' },
            { status: 500 },
        );
    }
}
