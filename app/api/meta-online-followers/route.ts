import { NextResponse } from 'next/server';
import { fetchOnlineFollowers, getInstagramUserId } from '@/lib/services/instagram-graph.service';

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
        }

        const userId = await getInstagramUserId(token);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Não foi possível obter o ID do usuário' }, { status: 401 });
        }

        const data = await fetchOnlineFollowers(token, userId);
        if (!data) {
            return NextResponse.json({ success: false, error: 'Dados de seguidores online não disponíveis (requer conta business com 100+ seguidores)' });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
