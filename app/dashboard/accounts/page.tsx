'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useAccountStore, useContentStore, useSettingsStore } from '@/stores';
import { AccountList } from '@/features/accounts/components/account-list';
import { motion } from 'framer-motion';

export default function AccountsPage() {
    const { data: session } = useSession();
    const { isLoaded: isAccountsLoaded, loadAccounts } = useAccountStore();
    const { isLoaded: isContentsLoaded, loadContents } = useContentStore();
    const { settings } = useSettingsStore();

    useEffect(() => {
        if (!isAccountsLoaded) loadAccounts();
        if (!isContentsLoaded) loadContents();
    }, [isAccountsLoaded, isContentsLoaded, loadAccounts, loadContents]);

    const hasOAuthToken = !!session?.accessToken;
    const hasManualToken = !!settings?.metaAccessToken;
    const isMetaConnected = hasOAuthToken || hasManualToken;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Seção de Conexão Meta */}
            <div className="border border-white/[0.08] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                            Conexão Meta
                        </span>
                        <div className="flex items-center gap-2.5">
                            <h2 className="font-mono text-sm font-semibold text-white/80">
                                Meta Ads API
                            </h2>
                            {isMetaConnected && (
                                <span className="font-mono text-[10px] px-2 py-0.5 bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/20 tracking-widest uppercase">
                                    ● CONECTADO
                                </span>
                            )}
                        </div>
                        <p className="font-mono text-[11px] text-white/30">
                            {isMetaConnected
                                ? `Token ativo · Expira em ${session?.expiresAt ? new Date(session.expiresAt * 1000).toLocaleDateString('pt-BR') : '—'}`
                                : 'Conecte sua conta Meta para acessar campanhas e criativos.'}
                        </p>
                        {hasOAuthToken && (
                            <p className="font-mono text-[10px] text-white/30 mt-1">
                                Token OAuth ativo — usado para publicação automática e Ads
                            </p>
                        )}
                        {!hasOAuthToken && hasManualToken && (
                            <p className="font-mono text-[10px] text-[#F59E0B]/60 mt-1">
                                ⚠ Token manual — configure tokens individuais por conta para publicação automática
                            </p>
                        )}
                    </div>

                    {isMetaConnected ? (
                        <Link
                            href="/connect"
                            className="font-mono text-[11px] px-4 py-2 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors tracking-wide uppercase"
                        >
                            Renovar Token
                        </Link>
                    ) : (
                        <Link
                            href="/connect"
                            className="font-mono text-[11px] px-4 py-2 bg-[#A3E635] text-black font-bold hover:bg-[#B8F050] transition-colors tracking-wide uppercase"
                        >
                            ⚡ Conectar Meta via OAuth
                        </Link>
                    )}
                </div>
            </div>

            <AccountList />
        </motion.div>
    );
}
