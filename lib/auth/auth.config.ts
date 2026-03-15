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

            if (isOnDashboard) {
                return isLoggedIn;
            }

            // Usuário logado tentando acessar /login → redireciona para dashboard
            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }

            return true;
        },
    },
};
