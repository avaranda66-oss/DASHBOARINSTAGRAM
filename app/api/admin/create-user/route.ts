import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/db/supabase';
import { hashPassword } from '@/lib/auth/auth';

/**
 * POST /api/admin/create-user
 * Rota protegida por ADMIN_SECRET para criar usuários permitidos.
 *
 * Body: { adminSecret, email, password, name, role? }
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { adminSecret, email, password, name, role = 'user' } = body;

    if (adminSecret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    if (!email || !password || !name) {
        return NextResponse.json({ error: 'email, password e name são obrigatórios.' }, { status: 400 });
    }

    const password_hash = hashPassword(password);
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from('allowed_users').upsert(
        { email: email.toLowerCase(), password_hash, name, role, active: true, updated_at: new Date().toISOString() },
        { onConflict: 'email' }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: `Usuário ${email} criado/atualizado.` });
}
