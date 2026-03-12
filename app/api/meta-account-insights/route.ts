import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaToken, fetchAccountInsights, fetchAudienceDemographics } from '@/lib/services/instagram-graph.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const token: string | undefined = body.token;
        const days: number = body.days ?? 30;

        if (!token || token.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Token de acesso Meta não fornecido.' },
                { status: 400 }
            );
        }

        const verification = await verifyMetaToken(token);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: 'Token Meta inválido ou expirado. Reconecte sua conta em Configurações.' },
                { status: 401 }
            );
        }

        // Obtém o user id usando a rota me. O Instagram userId is returned implicitly although we could retrieve from verification if we passed fields=id
        const userRes = await fetch(`https://graph.instagram.com/v25.0/me?fields=id&access_token=${token}`);
        const userData = await userRes.json();
        const userId = userData.id;

        if (!userId) {
             return NextResponse.json(
                { success: false, error: 'Falha ao buscar ID do usuário Meta.' },
                { status: 500 }
            );
        }

        const accountInsights = await fetchAccountInsights(token, userId, days);
        const demographics = await fetchAudienceDemographics(token, userId);

        return NextResponse.json({
            success: true,
            accountInsights,
            demographics,
            period: days
        });

    } catch (error: any) {
        console.error('[/api/meta-account-insights] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro ao buscar insights da conta.' },
            { status: 500 }
        );
    }
}
