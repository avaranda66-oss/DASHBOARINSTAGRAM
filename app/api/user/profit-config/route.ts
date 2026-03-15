import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { createSupabaseServiceClient } from '@/lib/db/supabase';
import type { ProfitConfig } from '@/stores/profit-config-slice';
import type { Session } from 'next-auth';

const DEFAULT_CONFIG: ProfitConfig = {
    cogsPct: 40,
    shippingPct: 8,
    feesPct: 3,
    targetRoasMultiplier: 1.2,
    enabled: false,
};

function getUserIdentifier(session: Session | null): string | null {
    if (!session) return null;
    // Meta OAuth login → usa metaUserId
    if (session.metaUserId) return `meta:${session.metaUserId}`;
    // Credentials login → usa email
    if (session.user?.email) return `email:${session.user.email}`;
    return null;
}

export async function GET() {
    const session = await auth();
    const identifier = getUserIdentifier(session);

    if (!identifier) {
        // Sem sessão: retorna config padrão silenciosamente
        return NextResponse.json({ config: DEFAULT_CONFIG });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('profit_configs')
        .select('config')
        .eq('user_identifier', identifier)
        .single();

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: (data?.config as ProfitConfig) ?? DEFAULT_CONFIG });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const identifier = getUserIdentifier(session);

    if (!identifier) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json() as ProfitConfig;
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from('profit_configs').upsert(
        {
            user_identifier: identifier,
            config: body,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_identifier' },
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
