'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    async function handleMetaLogin() {
        setLoading(true);
        await signIn('facebook', { redirectTo: '/dashboard' });
        // setLoading(false) não é chamado pois o redirect ocorre
    }

    return (
        <div className="w-full max-w-sm mx-auto px-6">
            {/* Logo / Brand */}
            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#A3E635] rounded-sm" />
                    <span className="font-mono text-lg font-semibold text-white tracking-tight">
                        dashboard
                    </span>
                </div>
                <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                    Meta Ads Manager
                </p>
            </div>

            {/* Card */}
            <div className="border border-zinc-800 rounded-lg p-8 bg-zinc-950/50">
                <h1 className="font-mono text-base font-medium text-white mb-1">
                    Conecte sua conta
                </h1>
                <p className="font-mono text-xs text-zinc-500 mb-8 leading-relaxed">
                    Autorize o acesso à sua conta Meta para gerenciar campanhas, criativos e
                    relatórios.
                </p>

                <button
                    onClick={handleMetaLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md bg-[#A3E635] text-black font-mono text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            {/* Spinner sem Lucide */}
                            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        <>
                            {/* Meta "f" icon via SVG inline */}
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Entrar com Meta
                        </>
                    )}
                </button>

                <p className="mt-6 font-mono text-[10px] text-zinc-600 text-center leading-relaxed">
                    Ao conectar, você autoriza leitura de dados de campanhas e anúncios.
                    <br />
                    Permissões de escrita requerem aprovação Meta para produção.
                </p>
            </div>
        </div>
    );
}
