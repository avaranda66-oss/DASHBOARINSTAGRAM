'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

const FEATURES = [
    { tag: '01', label: 'Meta Ads Intelligence', desc: 'Campanhas, criativos e ROAS em tempo real' },
    { tag: '02', label: 'Bayesian A/B Testing', desc: 'Testes estatísticos com 95% de confiança' },
    { tag: '03', label: 'Predictive Alerts', desc: 'Loop preditivo de fadiga e anomalias' },
    { tag: '04', label: 'Instagram Publishing', desc: 'Agende posts, reels e stories direto no app' },
];

const STATS = [
    { value: '60d', label: 'token seguro' },
    { value: 'v25', label: 'Meta API' },
    { value: '12+', label: 'módulos stat' },
];

export default function ConnectPage() {
    const [loading, setLoading] = useState(false);

    async function handleMetaLogin() {
        setLoading(true);
        await signIn('facebook', { redirectTo: '/dashboard' });
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col">
            <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-[#A3E635]" />
                    <span className="font-mono text-sm font-semibold tracking-tight">DASHBOARD_OSS</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors tracking-widest uppercase">
                        ← Dashboard
                    </Link>
                    <span className="font-mono text-[10px] text-white/20 tracking-widest uppercase">v2.0 · beta</span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <span className="font-mono text-[10px] text-[#A3E635] tracking-widest uppercase">[META_ADS_ENGINE_V2]</span>
                            <h1 className="font-mono text-4xl font-bold leading-tight tracking-tight">
                                Inteligência de<br />
                                <span className="text-[#A3E635]">tráfego pago</span><br />
                                em tempo real.
                            </h1>
                            <p className="font-mono text-sm text-white/40 leading-relaxed max-w-sm">
                                Dashboard profissional para gerenciar campanhas Meta, analisar criativos
                                e publicar no Instagram — tudo em um lugar.
                            </p>
                        </div>

                        <div className="flex items-center gap-8">
                            {STATS.map(s => (
                                <div key={s.value} className="space-y-0.5">
                                    <div className="font-mono text-2xl font-bold text-[#A3E635]">{s.value}</div>
                                    <div className="font-mono text-[10px] text-white/30 uppercase tracking-widest">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {FEATURES.map(f => (
                                <div key={f.tag} className="flex items-start gap-4">
                                    <span className="font-mono text-[10px] text-[#A3E635]/50 tracking-widest mt-0.5 w-5 shrink-0">{f.tag}</span>
                                    <div>
                                        <div className="font-mono text-xs font-semibold text-white/80">{f.label}</div>
                                        <div className="font-mono text-[11px] text-white/30">{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-white/[0.08] bg-white/[0.02] p-10 space-y-8">
                        <div className="space-y-1">
                            <h2 className="font-mono text-base font-semibold">Conectar conta Meta</h2>
                            <p className="font-mono text-xs text-white/30 leading-relaxed">
                                Conecte sua conta Meta para gerenciar campanhas e publicar no Instagram.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="font-mono text-[10px] text-white/20 uppercase tracking-widest">autenticar</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <button
                            onClick={handleMetaLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#A3E635] text-black font-mono text-sm font-bold tracking-wide transition-all hover:bg-[#B8F050] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>CONECTANDO...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    <span>ENTRAR COM META</span>
                                </>
                            )}
                        </button>

                        <div className="space-y-2">
                            <div className="font-mono text-[9px] text-white/20 uppercase tracking-widest">Permissões solicitadas</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {['Leitura de campanhas', 'Gerenciar anúncios', 'Publicar no Instagram', 'Business Manager'].map(p => (
                                    <div key={p} className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 bg-[#A3E635] rounded-full shrink-0" />
                                        <span className="font-mono text-[10px] text-white/30">{p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="font-mono text-[9px] text-white/15 leading-relaxed border-t border-white/5 pt-6">
                            Token válido por 60 dias · Dados protegidos por RLS · Nenhuma senha armazenada
                        </p>
                    </div>

                </div>
            </main>

            <footer className="border-t border-white/5 px-8 py-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/15">© 2026 Dashboard OSS</span>
                <span className="font-mono text-[10px] text-white/15">Powered by Meta Graph API v25</span>
            </footer>
        </div>
    );
}
