import { auth } from './auth';
import type { Session } from 'next-auth';

/**
 * Estende o tipo Session do NextAuth com os campos customizados
 * que adicionamos nos callbacks (accessToken, metaUserId, etc.)
 */
export interface AuthSession extends Session {
    accessToken?: string;
    expiresAt?: number | null;
    metaUserId?: string;
    error?: string;
}

/**
 * getServerSession — helper tipado para Server Components e API Routes.
 *
 * @example
 * const session = await getServerSession();
 * if (!session) redirect('/login');
 * const token = session.accessToken;
 */
export async function getServerSession(): Promise<AuthSession | null> {
    const session = await auth();
    return session as AuthSession | null;
}

/**
 * requireServerSession — lança se não houver sessão ativa.
 * Use em Server Actions e API Routes que exigem autenticação.
 */
export async function requireServerSession(): Promise<AuthSession> {
    const session = await getServerSession();
    if (!session) {
        throw new Error('Unauthorized: no active session');
    }
    return session;
}
