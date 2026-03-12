import { NextRequest, NextResponse } from 'next/server';
import { fetchInstagramInsights, verifyMetaToken, refreshMetaToken } from '@/lib/services/instagram-graph.service';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const token: string | undefined = body.token;
        const limit: number = body.limit ?? 50;
        // verifyOnly: true → apenas verifica validade do token sem buscar posts (mais rápido)
        const verifyOnly: boolean = body.verifyOnly === true;

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

        // verifyOnly: retorna apenas os dados da verificação sem buscar posts
        if (verifyOnly) {
            return NextResponse.json({
                success: true,
                username: verification.username,
                followersCount: verification.followersCount,
                name: verification.name,
                biography: verification.biography,
                profilePictureUrl: verification.profilePictureUrl,
                followsCount: verification.followsCount,
                mediaCount: verification.mediaCount,
                website: verification.website,
            });
        }

        const posts = await fetchInstagramInsights(currentToken, limit);

        return NextResponse.json({
            success: true,
            data: posts,
            username: verification.username,
            followersCount: verification.followersCount,
            name: verification.name,
            biography: verification.biography,
            profilePictureUrl: verification.profilePictureUrl,
            followsCount: verification.followsCount,
            mediaCount: verification.mediaCount,
            website: verification.website,
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

// NOTA DE SEGURANÇA: O endpoint GET foi removido.
// Tokens NUNCA devem ser enviados como parâmetros de URL (ficam expostos em logs de servidor,
// histórico do browser e proxies intermediários).
// Use o endpoint POST para verificar tokens, enviando o token no corpo da requisição JSON.
export async function GET() {
    return NextResponse.json(
        { success: false, error: 'Use o método POST para verificar tokens. Tokens não devem ser enviados via URL.' },
        { status: 405 }
    );
}
