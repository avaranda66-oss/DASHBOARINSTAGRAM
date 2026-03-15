'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Email ou senha inválidos.');
            setLoading(false);
            return;
        }

        router.push('/dashboard');
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col">
            <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-[#A3E635]" />
                    <span className="font-mono text-sm font-semibold tracking-tight">DASHBOARD_OSS</span>
                </div>
                <span className="font-mono text-[10px] text-white/20 tracking-widest uppercase">v2.0 · beta</span>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-sm">
                    <div className="space-y-2 mb-10">
                        <span className="font-mono text-[10px] text-[#A3E635] tracking-widest uppercase">[ACESSO RESTRITO]</span>
                        <h1 className="font-mono text-2xl font-bold tracking-tight">Entrar na plataforma</h1>
                        <p className="font-mono text-xs text-white/30 leading-relaxed">
                            Apenas usuários autorizados têm acesso.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="seu@email.com"
                                className="w-full bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-[#A3E635]/40 focus:bg-white/[0.06] transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                                Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full bg-white/[0.04] border border-white/[0.08] px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-[#A3E635]/40 focus:bg-white/[0.06] transition-all"
                            />
                        </div>

                        {error && (
                            <div className="font-mono text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 px-4 py-2.5">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#A3E635] text-black font-mono text-sm font-bold tracking-wide transition-all hover:bg-[#B8F050] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>VERIFICANDO...</span>
                                </>
                            ) : (
                                <span>ENTRAR</span>
                            )}
                        </button>
                    </form>

                    <p className="font-mono text-[10px] text-white/20 text-center mt-4 leading-relaxed">
                        Após o login, conecte sua conta Meta em Contas para ativar
                        publicação e análise de anúncios.
                    </p>

                    <p className="font-mono text-[9px] text-white/15 leading-relaxed mt-8 text-center">
                        Acesso exclusivo · Contate o administrador para obter credenciais
                    </p>
                </div>
            </main>

            <footer className="border-t border-white/5 px-8 py-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/15">© 2026 Dashboard OSS</span>
                <span className="font-mono text-[10px] text-white/15">Powered by Meta Graph API v25</span>
            </footer>
        </div>
    );
}
