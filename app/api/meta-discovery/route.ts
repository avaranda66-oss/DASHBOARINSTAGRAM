import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaToken, fetchBusinessDiscovery } from '@/lib/services/instagram-graph.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const token: string | undefined = body.token;
        const targetUsername: string | undefined = body.targetUsername;

        if (!token || token.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Token de acesso Meta não fornecido.' },
                { status: 400 }
            );
        }

        if (!targetUsername || targetUsername.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Username (concorrente) não fornecido.' },
                { status: 400 }
            );
        }

        const verification = await verifyMetaToken(token);
        if (!verification.valid) {
            return NextResponse.json(
                { success: false, error: 'Token Meta inválido ou expirado.' },
                { status: 401 }
            );
        }

        // Obtém o user id usando a rota me.
        const userRes = await fetch(`https://graph.instagram.com/v25.0/me?fields=id&access_token=${token}`);
        const userData = await userRes.json();
        const userId = userData.id;

        if (!userId) {
             return NextResponse.json(
                { success: false, error: 'Falha ao buscar ID do usuário Meta.' },
                { status: 500 }
            );
        }

        const cleanUsername = targetUsername.replace('@', '').trim();
        const discovery = await fetchBusinessDiscovery(token, userId, cleanUsername);

        if (!discovery) {
            return NextResponse.json(
                { success: false, error: `Perfil não encontrado, ou a conta não é Business/Creator.` },
                { status: 404 }
            );
        }

        // Mapping to profile and posts format
        return NextResponse.json({
            success: true,
            profile: {
                handle: discovery.username,
                name: discovery.name,
                biography: discovery.biography,
                followersCount: discovery.followersCount,
                followsCount: discovery.followsCount,
                mediaCount: discovery.mediaCount,
                avatarUrl: discovery.profilePictureUrl
            },
            posts: discovery.posts.map((p) => ({
                id: p.id,
                caption: p.caption,
                type: p.media_type === 'CAROUSEL_ALBUM' ? 'Sidecar' : p.media_type === 'VIDEO' ? 'Video' : 'Image',
                likesCount: p.like_count || 0,
                commentsCount: p.comments_count || 0,
                timestamp: p.timestamp,
                url: p.permalink,
                thumbnailUrl: p.media_url,
                ownerUsername: discovery.username
            })),
            fetchedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[/api/meta-discovery] Erro:', error);
        return NextResponse.json(
            { success: false, error: error.message ?? 'Erro interno.' },
            { status: 500 }
        );
    }
}
