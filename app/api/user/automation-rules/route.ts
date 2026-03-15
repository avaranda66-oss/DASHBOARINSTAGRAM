import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { createSupabaseServiceClient } from '@/lib/db/supabase';
import type { Session } from 'next-auth';

function getUserIdentifier(session: Session | null): string | null {
    if (!session) return null;
    if (session.metaUserId) return `meta:${session.metaUserId}`;
    if (session.user?.email) return `email:${session.user.email}`;
    return null;
}

export async function GET() {
    const session = await auth();
    const identifier = getUserIdentifier(session);

    if (!identifier) {
        return NextResponse.json({ rules: [] });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('automation_rules')
        .select('rule')
        .eq('user_identifier', identifier)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rules: (data ?? []).map(r => r.rule) });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const identifier = getUserIdentifier(session);

    if (!identifier) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { rules } = await req.json() as { rules: unknown[] };
    const supabase = createSupabaseServiceClient();

    // Sync: apaga tudo e reinsere (simples e consistente)
    await supabase.from('automation_rules').delete().eq('user_identifier', identifier);

    if (rules && rules.length > 0) {
        const rows = rules.map((rule) => ({
            user_identifier: identifier,
            rule,
        }));
        const { error } = await supabase.from('automation_rules').insert(rows);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
