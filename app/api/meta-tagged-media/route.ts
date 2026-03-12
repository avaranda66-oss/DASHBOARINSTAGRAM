import { NextResponse } from 'next/server';
import { fetchTaggedMedia, getInstagramUserId } from '@/lib/services/instagram-graph.service';

export async function POST(req: Request) {
    try {
        const { token, limit } = await req.json();
        if (!token) {
            return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
        }

        const userId = await getInstagramUserId(token);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Não foi possível obter o ID do usuário' }, { status: 401 });
        }

        const data = await fetchTaggedMedia(token, userId, limit);
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
