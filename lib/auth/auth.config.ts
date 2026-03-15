import type { NextAuthConfig } from 'next-auth';

/**
 * auth.config.ts — configuração base do NextAuth (sem depender do Node.js runtime).
 * Usada pelo middleware (Edge Runtime) e pelo auth.ts (Node.js runtime).
 *
 * Regra: /dashboard/* exige sessão ativa. Caso contrário, redireciona para /login.
 */
export const authConfig: NextAuthConfig = {
    pages: {
        signIn: '/login',
        error: '/login',
    },
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const isOnConnect = nextUrl.pathname === '/connect';

            if (isOnDashboard) {
                if (!isLoggedIn) {
                    return Response.redirect(new URL('/login', nextUrl));
                }
                return true;
            }

            // /connect (Meta OAuth) requer login de email primeiro
            if (isOnConnect && !isLoggedIn) {
                return Response.redirect(new URL('/login', nextUrl));
            }

            // Usuário já logado tentando acessar /login → dashboard
            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }

            return true;
        },
    },
};
