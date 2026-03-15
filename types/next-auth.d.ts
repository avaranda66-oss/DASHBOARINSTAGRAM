import type { DefaultSession } from 'next-auth';

/**
 * Extensão dos tipos do NextAuth para incluir campos customizados
 * adicionados nos callbacks jwt + session (lib/auth/auth.ts).
 */
declare module 'next-auth' {
    interface Session extends DefaultSession {
        accessToken?: string;
        expiresAt?: number | null;
        metaUserId?: string;
        error?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        expiresAt?: number | null;
        metaUserId?: string;
        error?: string;
    }
}
