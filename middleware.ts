import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';

/**
 * middleware.ts — proteção de rotas via NextAuth (Edge Runtime).
 *
 * Usa authConfig (sem providers completos) para manter compatibilidade com Edge.
 * O callback `authorized` em auth.config.ts define as regras de acesso:
 *   - /dashboard/* → exige sessão ativa → redireciona para /login se ausente
 *   - /login → redireciona para /dashboard se já logado
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
    matcher: [
        /*
         * Executa em todas as rotas exceto:
         * - _next/static (arquivos estáticos)
         * - _next/image (otimização de imagem)
         * - favicon.ico
         * - arquivos com extensão (imagens, fontes, etc.)
         * - rotas públicas de auth do NextAuth (/api/auth/*)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$|api/auth).*)',
    ],
};
