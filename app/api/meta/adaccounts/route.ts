import { NextRequest, NextResponse } from 'next/server';
import type { MetaAdAccount } from '@/types/ads';

/**
 * US-61 — Multi-Account Switcher
 *
 * GET /api/meta/adaccounts?token=xxx
 * Response: { success, accounts: MetaAdAccount[] }
 *
 * Retorna todas as ad accounts ativas do usuário do token.
 * Filtra account_status != 1 (só ACTIVE) e != 101 (CLOSED).
 */

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';
const FIELDS = 'id,account_id,name,currency,account_status,timezone_name';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token é obrigatório.' },
                { status: 400 },
            );
        }

        const url = `${GRAPH_BASE}/me/adaccounts?fields=${FIELDS}&limit=50&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.error) {
            const msg: string = json.error?.message || 'Erro ao buscar contas.';
            const isAuth =
                msg.includes('190') ||
                msg.includes('OAuthException') ||
                msg.includes('access token');
            if (isAuth) {
                return NextResponse.json(
                    { success: false, error: 'TOKEN_EXPIRED', errorMessage: 'Token Meta expirado.' },
                    { status: 401 },
                );
            }
            return NextResponse.json({ success: false, error: msg }, { status: 500 });
        }

        const raw: MetaAdAccount[] = json.data || [];

        // Filtrar apenas contas ativas (status 1)
        const accounts = raw.filter(a => a.account_status === 1);

        return NextResponse.json({ success: true, accounts });
    } catch (e: any) {
        console.error('[meta/adaccounts] Erro:', e);
        return NextResponse.json(
            { success: false, error: e.message || 'Erro interno.' },
            { status: 500 },
        );
    }
}
