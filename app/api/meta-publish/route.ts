import { NextRequest, NextResponse } from 'next/server';
import { getInstagramUserId, publishImage } from '@/lib/services/instagram-graph.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, imageUrl, caption } = body;

        if (!token || !imageUrl) {
            return NextResponse.json(
                { success: false, error: 'Token Meta e URL da Imagem são obrigatórios.' },
                { status: 400 },
            );
        }

        const userId = await getInstagramUserId(token);
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Não foi possível encontrar a Conta Profissional vinculada.' },
                { status: 500 },
            );
        }

        const res = await publishImage(token, userId, imageUrl, caption || '');
        if (!res.success) {
            return NextResponse.json(
                { success: false, error: res.error },
                { status: 500 },
            );
        }

        return NextResponse.json(res);
    } catch (error: any) {
        console.error('[/api/meta-publish] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro interno de rede.' },
            { status: 500 },
        );
    }
}
