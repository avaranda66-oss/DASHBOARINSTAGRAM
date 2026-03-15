import NextAuth from 'next-auth';
import Facebook from 'next-auth/providers/facebook';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { createSupabaseServiceClient } from '@/lib/db/supabase';
import { timingSafeEqual, scryptSync, randomBytes } from 'crypto';

// ─── Password helpers (usando crypto nativo — sem dependência extra) ──────────

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    try {
        const [salt, hash] = stored.split(':');
        const hashBuf = Buffer.from(hash, 'hex');
        const derivedBuf = scryptSync(password, salt, 64);
        return timingSafeEqual(hashBuf, derivedBuf);
    } catch {
        return false;
    }
}

// ─── Long-lived token exchange ────────────────────────────────────────────────
// O token OAuth padrão do Facebook dura ~1h.
// Trocamos por um long-lived token (60 dias) imediatamente no callback.

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresAt: number; // Unix timestamp
}> {
    const appId = process.env.INSTAGRAM_APP_ID!;
    const appSecret = process.env.INSTAGRAM_APP_SECRET!;

    const url = new URL('https://graph.facebook.com/oauth/access_token');
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Long-lived token exchange failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };

    return {
        accessToken: data.access_token,
        // expires_in é em segundos; convertemos para Unix timestamp
        expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 5_184_000), // fallback 60d
    };
}

// ─── Auth.js (NextAuth v5) ────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Senha', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const supabase = createSupabaseServiceClient();
                const { data, error } = await supabase
                    .from('allowed_users')
                    .select('id, email, name, password_hash, active')
                    .eq('email', credentials.email as string)
                    .single();

                if (error || !data || !data.active) return null;

                const valid = await verifyPassword(
                    credentials.password as string,
                    data.password_hash,
                );
                if (!valid) return null;

                return { id: data.id, email: data.email, name: data.name };
            },
        }),
        Facebook({
            clientId: process.env.INSTAGRAM_APP_ID!,
            clientSecret: process.env.INSTAGRAM_APP_SECRET!,
            // Escopos: Meta Ads API + Instagram Content Publishing
            // Nota: ads_read, ads_management e instagram_content_publish requerem App Review para produção
            authorization: {
                params: {
                    scope: [
                        'email', 'public_profile',
                        'ads_read', 'ads_management', 'business_management',
                        'pages_show_list', 'pages_read_engagement',
                        'instagram_basic', 'instagram_content_publish',
                    ].join(','),
                },
            },
        }),
    ],
    callbacks: {
        // Chamado quando token JWT é criado (primeiro login) ou atualizado
        async jwt({ token, account, profile }) {
            // Primeiro login: account contém o short-lived token
            if (account && account.access_token) {
                try {
                    const { accessToken, expiresAt } = await exchangeForLongLivedToken(
                        account.access_token,
                    );
                    token.accessToken = accessToken;
                    token.expiresAt = expiresAt;
                    token.metaUserId = account.providerAccountId;
                } catch (err) {
                    console.error('[auth] Long-lived token exchange error:', err);
                    // Fallback para o short-lived token se a troca falhar
                    token.accessToken = account.access_token;
                    token.expiresAt = account.expires_at ?? null;
                    token.metaUserId = account.providerAccountId;
                    token.error = 'LongLivedTokenExchangeFailed';
                }

                // Persistir usuário e token no Supabase
                await upsertUserInSupabase({
                    metaUserId: account.providerAccountId,
                    name: profile?.name ?? null,
                    email: profile?.email ?? null,
                    accessToken: token.accessToken as string,
                    expiresAt: token.expiresAt as number | null,
                });
            }

            return token;
        },

        // Expõe campos do JWT na sessão (acessível via useSession / auth())
        async session({ session, token }) {
            session.accessToken = token.accessToken as string | undefined;
            session.expiresAt = token.expiresAt as number | null | undefined;
            session.metaUserId = token.metaUserId as string | undefined;
            session.error = token.error as string | undefined;
            return session;
        },

    },
});

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertUserInSupabase(params: {
    metaUserId: string;
    name: string | null;
    email: string | null;
    accessToken: string;
    expiresAt: number | null;
}) {
    try {
        const supabase = createSupabaseServiceClient();

        // Upsert user
        const { data: user, error: userError } = await supabase
            .from('users')
            .upsert(
                {
                    meta_user_id: params.metaUserId,
                    name: params.name,
                    email: params.email,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'meta_user_id' },
            )
            .select('id')
            .single();

        if (userError || !user) {
            console.error('[auth] Supabase upsert user error:', userError);
            return;
        }

        // Upsert token
        const expiresAtISO = params.expiresAt
            ? new Date(params.expiresAt * 1000).toISOString()
            : null;

        const { error: tokenError } = await supabase.from('user_tokens').upsert(
            {
                user_id: user.id,
                access_token: params.accessToken,
                expires_at: expiresAtISO,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        );

        if (tokenError) {
            console.error('[auth] Supabase upsert token error:', tokenError);
        }
    } catch (err) {
        // Não bloqueia o login se Supabase estiver offline
        console.error('[auth] Supabase upsert unexpected error:', err);
    }
}
