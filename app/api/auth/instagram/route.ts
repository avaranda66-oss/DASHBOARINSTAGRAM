import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

    if (!clientId) {
        return NextResponse.json(
            { error: 'INSTAGRAM_APP_ID não configurado no servidor.' },
            { status: 500 }
        );
    }

    const scope = 'instagram_business_basic,instagram_business_manage_insights';

    const authUrl =
        `https://www.instagram.com/oauth/authorize` +
        `?enable_fb_login=0` +
        `&force_reauth=0` +
        `&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}`;

    return NextResponse.redirect(authUrl);
}
