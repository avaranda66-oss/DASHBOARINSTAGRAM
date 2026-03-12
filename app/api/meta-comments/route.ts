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

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, commentId, message } = body;
        if (!token || !commentId || !message) {
            return NextResponse.json({ success: false, error: 'Faltam parâmetros.' }, { status: 400 });
        }
        
        const { replyToComment } = await import('@/lib/services/instagram-graph.service');
        const res = await replyToComment(token, commentId, message);
        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, commentId } = body;
        if (!token || !commentId) {
            return NextResponse.json({ success: false, error: 'Faltam parâmetros.' }, { status: 400 });
        }
        
        const { hideComment } = await import('@/lib/services/instagram-graph.service');
        const res = await hideComment(token, commentId);
        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, commentId } = body;
        if (!token || !commentId) {
            return NextResponse.json({ success: false, error: 'Faltam parâmetros.' }, { status: 400 });
        }
        
        const { deleteComment } = await import('@/lib/services/instagram-graph.service');
        const res = await deleteComment(token, commentId);
        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
