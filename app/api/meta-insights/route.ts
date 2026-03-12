import { NextRequest, NextResponse } from 'next/server';
import { fetchInstagramInsights, verifyMetaToken, refreshMetaToken } from '@/lib/services/instagram-graph.service';
import prisma from '@/lib/db';

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

        let currentToken = token;
        
        try {
            // 1. Verificar se precisamos renovar o token (se falta < 7 dias)
            const account = await prisma.account.findFirst({
                where: { access_token: token }
            });

            if (account && account.expires_at) {
                const now = Math.floor(Date.now() / 1000);
                const sevenDaysInSeconds = 7 * 24 * 60 * 60;
                
                if (account.expires_at - now < sevenDaysInSeconds) {
                    const refreshed = await refreshMetaToken(currentToken);
                    if (refreshed) {
                        currentToken = refreshed.access_token;
                        await prisma.account.update({
                            where: { id: account.id },
                            data: {
                                access_token: currentToken,
                                expires_at: now + refreshed.expires_in
                            }
                        });
                        console.log(`[Meta Token] Token renovado com sucesso para a conta ${account.username}`);
                    }
                }
            }
        } catch (dbErr) {
            console.warn('[Meta Token] Erro ao verificar validade do token no banco:', dbErr);
        }

        // Verificar token antes de fazer as requisições pesadas
        const verification = await verifyMetaToken(currentToken);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: 'Token Meta inválido ou expirado. Reconecte sua conta em Configurações.' },
                { status: 401 }
            );
        }

        const posts = await fetchInstagramInsights(currentToken, limit);

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
