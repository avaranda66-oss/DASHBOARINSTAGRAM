import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('[Meta OAuth] Erro retornado pelo Instagram:', error);
        return NextResponse.redirect(
            new URL('/dashboard/settings?error=oauth_denied', req.url)
        );
    }

    if (!code) {
        return NextResponse.redirect(
            new URL('/dashboard/settings?error=no_code', req.url)
        );
    }

    // O Instagram às vezes adiciona "#_" no final do código
    const cleanCode = code.replace(/#_$/, '');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

    try {
        // 1. Trocar code por short-lived token
        const tokenForm = new FormData();
        tokenForm.append('client_id', process.env.INSTAGRAM_APP_ID!);
        tokenForm.append('client_secret', process.env.INSTAGRAM_APP_SECRET!);
        tokenForm.append('grant_type', 'authorization_code');
        tokenForm.append('redirect_uri', redirectUri);
        tokenForm.append('code', cleanCode);

        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            body: tokenForm,
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error('[Meta OAuth] Falha ao obter short-lived token:', tokenData);
            throw new Error('Falha ao obter token de curta duração');
        }

        const shortLivedToken: string = tokenData.access_token;
        const userId: string = String(tokenData.user_id);

        // 2. Trocar por long-lived token (60 dias)
        const longLivedRes = await fetch(
            `https://graph.instagram.com/access_token` +
            `?grant_type=ig_exchange_token` +
            `&client_secret=${process.env.INSTAGRAM_APP_SECRET}` +
            `&access_token=${shortLivedToken}`
        );

        const longLivedData = await longLivedRes.json();
        if (!longLivedData.access_token) {
            console.error('[Meta OAuth] Falha ao obter long-lived token:', longLivedData);
            throw new Error('Falha ao obter token de longa duração');
        }

        const longLivedToken: string = longLivedData.access_token;
        const expiresIn: number = longLivedData.expires_in ?? 5183944; // ~60 dias padrão
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

        // 3. Buscar dados do perfil
        const profileRes = await fetch(
            `https://graph.instagram.com/v25.0/me` +
            `?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website` +
            `&access_token=${longLivedToken}`
        );
        const profileData = await profileRes.json();
        const username: string = profileData.username ?? '';
        const name: string = profileData.name ?? '';
        const biography: string = profileData.biography ?? '';
        const followers_count: number = profileData.followers_count ?? 0;
        const follows_count: number = profileData.follows_count ?? 0;
        const media_count: number = profileData.media_count ?? 0;
        const website: string = profileData.website ?? '';
        const picture: string = profileData.profile_picture_url ?? '';

        // 4. Salvar no Prisma (upsert por providerAccountId)
        await prisma.account.upsert({
            where: { providerAccountId: userId },
            update: {
                access_token: longLivedToken,
                expires_at: expiresAt,
                username,
                name,
                biography,
                followers_count,
                follows_count,
                media_count,
                website,
                picture,
            },
            create: {
                type: 'instagram',
                provider: 'instagram_business',
                providerAccountId: userId,
                access_token: longLivedToken,
                expires_at: expiresAt,
                username,
                name,
                biography,
                followers_count,
                follows_count,
                media_count,
                website,
                picture,
            },
        });


        return NextResponse.redirect(
            new URL(`/dashboard/settings?success=meta_connected&username=${encodeURIComponent(username)}`, req.url)
        );
    } catch (err) {
        console.error('[Meta OAuth] Erro no callback:', err);
        return NextResponse.redirect(
            new URL('/dashboard/settings?error=auth_failed', req.url)
        );
    }
}
