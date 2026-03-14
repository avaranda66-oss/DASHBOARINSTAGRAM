'use client';

/**
 * US-61 — Multi-Account Switcher
 *
 * Dropdown no header da página de ads para trocar entre contas Meta.
 * Persiste a última conta selecionada via localStorage.
 * Carrega a lista de contas disponíveis via /api/meta/adaccounts.
 */

import { useEffect, useRef, useState } from 'react';
import { useAdsStore } from '@/stores/ads-slice';
import type { MetaAdAccount } from '@/types/ads';

const LS_KEY = 'meta_last_account';
const MAX_HISTORY = 5;

function getHistory(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(`${LS_KEY}_history`) || '[]');
    } catch {
        return [];
    }
}

function pushHistory(accountId: string) {
    const history = getHistory().filter(id => id !== accountId);
    history.unshift(accountId);
    localStorage.setItem(`${LS_KEY}_history`, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

interface Props {
    token: string;
    currentAccountId: string;
    onSwitch: (accountId: string) => void;
}

export function AdsAccountSwitcher({ token, currentAccountId, onSwitch }: Props) {
    const { availableAccounts, isLoadingAccounts, fetchAdAccounts } = useAdsStore();
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAdAccounts(token);
        setHistory(getHistory());
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentAccount = availableAccounts.find(a => a.id === currentAccountId)
        || availableAccounts.find(a => a.account_id === currentAccountId);

    function handleSelect(account: MetaAdAccount) {
        setOpen(false);
        pushHistory(account.id);
        setHistory(getHistory());
        onSwitch(account.id);
    }

    // Ordenar: histórico primeiro, depois alfabético
    const sorted = [...availableAccounts].sort((a, b) => {
        const ai = history.indexOf(a.id);
        const bi = history.indexOf(b.id);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors font-mono text-xs text-white/80"
                disabled={isLoadingAccounts}
            >
                {isLoadingAccounts ? (
                    <span className="text-white/40">CARREGANDO...</span>
                ) : (
                    <>
                        <span className="text-[#A3E635] text-[10px]">▶</span>
                        <span className="max-w-[160px] truncate">
                            {currentAccount?.name || currentAccountId}
                        </span>
                        <span className="text-white/30 ml-1">{open ? '▲' : '▼'}</span>
                    </>
                )}
            </button>

            {open && sorted.length > 0 && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 border border-white/10 bg-[#111] shadow-xl">
                    <div className="px-2 py-1 border-b border-white/5">
                        <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                            Contas disponíveis ({sorted.length})
                        </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {sorted.map(account => {
                            const isActive = account.id === currentAccountId || account.account_id === currentAccountId;
                            const inHistory = history.includes(account.id);
                            return (
                                <button
                                    key={account.id}
                                    onClick={() => handleSelect(account)}
                                    className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors flex items-center gap-2 ${
                                        isActive
                                            ? 'bg-[#A3E635]/10 text-[#A3E635]'
                                            : 'text-white/70 hover:bg-white/5'
                                    }`}
                                >
                                    <span className="flex-1 truncate">{account.name}</span>
                                    <span className="text-[10px] text-white/30 shrink-0">{account.currency}</span>
                                    {inHistory && !isActive && (
                                        <span className="text-[10px] text-white/20">↑</span>
                                    )}
                                    {isActive && (
                                        <span className="text-[10px] text-[#A3E635]">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {open && sorted.length === 0 && !isLoadingAccounts && (
                <div className="absolute top-full left-0 mt-1 z-50 w-48 border border-white/10 bg-[#111] px-3 py-2">
                    <span className="text-xs text-white/30 font-mono">Nenhuma conta ativa</span>
                </div>
            )}
        </div>
    );
}
