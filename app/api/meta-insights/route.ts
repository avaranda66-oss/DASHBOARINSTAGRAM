import { NextRequest, NextResponse } from 'next/server';
import { fetchInstagramInsights, verifyMetaToken } from '@/lib/services/instagram-graph.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const token: string | undefined = body.token;
        const limit: number = body.limit ?? 50;

        if (!token || token.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Token de acesso Meta não fornecido.' },
                { status: 400 }
            );
        }

        // Verificar token antes de fazer as requisições pesadas
        const verification = await verifyMetaToken(token);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: 'Token Meta inválido ou expirado. Reconecte sua conta em Configurações.' },
                { status: 401 }
            );
        }

        const posts = await fetchInstagramInsights(token, limit);

        return NextResponse.json({
            success: true,
            data: posts,
            username: verification.username,
            source: 'meta',
            fetchedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[/api/meta-insights] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro ao buscar insights da Meta API.' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.json(
            { success: false, error: 'Parâmetro token ausente.' },
            { status: 400 }
        );
    }

    const result = await verifyMetaToken(token);
    return NextResponse.json({ success: result.valid, username: result.username });
}
