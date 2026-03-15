import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

/**
 * GET /api/meta-status
 * Verifica se o usuário tem um token Meta válido e retorna dados básicos do perfil.
 * Usado pelo MetaStatusBadge para exibir estado da conexão.
 *
 * Response: { connected: boolean, name?: string, id?: string, error?: string }
 */
export async function GET() {
    const NO_CACHE = { headers: { 'Cache-Control': 'no-store' } };

    try {
        const session = await auth();
        const token: string | undefined = session?.accessToken;

        if (!token) {
            return NextResponse.json(
                { connected: false, error: 'NO_TOKEN' },
                { status: 200, ...NO_CACHE },
            );
        }

        const url = new URL('https://graph.facebook.com/v25.0/me');
        url.searchParams.set('fields', 'id,name');

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const msg: string = (errBody as any)?.error?.message || `HTTP ${res.status}`;
            const isAuthError = res.status === 401 || msg.includes('190') || msg.includes('OAuthException');
            return NextResponse.json(
                { connected: false, error: isAuthError ? 'TOKEN_EXPIRED' : msg },
                { status: 200, ...NO_CACHE },
            );
        }

        const data = await res.json() as { id: string; name: string };
        return NextResponse.json(
            { connected: true, id: data.id, name: data.name },
            { status: 200, ...NO_CACHE },
        );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro interno.';
        console.error('[meta-status] Erro:', e);
        return NextResponse.json(
            { connected: false, error: message },
            { status: 200, ...NO_CACHE },
        );
    }
}
