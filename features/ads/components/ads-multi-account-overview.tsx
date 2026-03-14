'use client';

/**
 * US-62 — Multi-Account Overview
 *
 * Grid compacto mostrando spend + ROAS das primeiras 5 contas ativas.
 * Usa Promise.all com máx 3 requisições simultâneas para respeitar rate limits.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAdsStore } from '@/stores/ads-slice';
import type { MetaAdAccount, AdsDatePreset } from '@/types/ads';

interface AccountSummary {
    account: MetaAdAccount;
    spend: number;
    roas: number;
    impressions: number;
    loading: boolean;
    error?: string;
}

interface Props {
    token: string;
    datePreset?: AdsDatePreset;
    timeRange?: { since: string; until: string };
}

const CONCURRENCY = 3;

async function fetchAccountSummary(
    token: string,
    accountId: string,
    datePreset: AdsDatePreset,
    timeRange?: { since: string; until: string },
): Promise<{ spend: number; roas: number; impressions: number }> {
    const body: Record<string, unknown> = { token, accountId, datePreset };
    if (timeRange) body.timeRange = timeRange;

    const res = await fetch('/api/ads-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro');

    const kpi = data.kpiSummary;
    return {
        spend: kpi?.spend ?? 0,
        roas: kpi?.roas ?? 0,
        impressions: kpi?.impressions ?? 0,
    };
}

async function runConcurrentBatch<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>,
): Promise<void> {
    const queue = [...items];
    const runners: Promise<void>[] = [];

    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item !== undefined) await fn(item);
        }
    }

    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
        runners.push(worker());
    }
    await Promise.all(runners);
}

export function AdsMultiAccountOverview({ token, datePreset = 'last_30d', timeRange }: Props) {
    const { availableAccounts, fetchAdAccounts } = useAdsStore();
    const [summaries, setSummaries] = useState<AccountSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (availableAccounts.length === 0) {
            fetchAdAccounts(token);
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async () => {
        if (availableAccounts.length === 0) return;
        setLoading(true);
        setFetched(true);

        const top5 = availableAccounts.slice(0, 5);

        const initial: AccountSummary[] = top5.map(a => ({
            account: a,
            spend: 0,
            roas: 0,
            impressions: 0,
            loading: true,
        }));
        setSummaries(initial);

        await runConcurrentBatch(top5, CONCURRENCY, async (account) => {
            try {
                const result = await fetchAccountSummary(token, account.id, datePreset, timeRange);
                setSummaries(prev =>
                    prev.map(s =>
                        s.account.id === account.id
                            ? { ...s, ...result, loading: false }
                            : s,
                    ),
                );
            } catch (e: any) {
                setSummaries(prev =>
                    prev.map(s =>
                        s.account.id === account.id
                            ? { ...s, loading: false, error: e.message }
                            : s,
                    ),
                );
            }
        });

        setLoading(false);
    }, [availableAccounts, token, datePreset, timeRange]);

    useEffect(() => {
        if (availableAccounts.length > 0 && !fetched) {
            load();
        }
    }, [availableAccounts, fetched, load]);

    if (availableAccounts.length <= 1) return null;

    const fmt = (v: number, opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat('pt-BR', opts).format(v);

    const currency = summaries[0]?.account.currency || 'BRL';

    return (
        <div className="border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    VISÃO MULTI-CONTA — TOP {Math.min(availableAccounts.length, 5)}
                </span>
                {!fetched && (
                    <button
                        onClick={load}
                        className="font-mono text-[10px] text-[#A3E635]/60 hover:text-[#A3E635] transition-colors uppercase tracking-widest"
                    >
                        CARREGAR
                    </button>
                )}
                {fetched && !loading && (
                    <button
                        onClick={() => { setFetched(false); setSummaries([]); load(); }}
                        className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                        ↻ ATUALIZAR
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
                {summaries.map(s => (
                    <div
                        key={s.account.id}
                        className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                    >
                        {/* Nome */}
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs text-white/70 truncate">{s.account.name}</p>
                            <p className="font-mono text-[10px] text-white/30">{s.account.currency}</p>
                        </div>

                        {/* Spend */}
                        <div className="text-right w-24 shrink-0">
                            {s.loading ? (
                                <span className="font-mono text-xs text-white/20">—</span>
                            ) : s.error ? (
                                <span className="font-mono text-[10px] text-red-400/60">ERRO</span>
                            ) : (
                                <>
                                    <p className="font-mono text-xs text-white/80">
                                        {currency} {fmt(s.spend, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="font-mono text-[10px] text-white/30">spend</p>
                                </>
                            )}
                        </div>

                        {/* ROAS */}
                        <div className="text-right w-16 shrink-0">
                            {s.loading ? (
                                <span className="font-mono text-xs text-white/20">—</span>
                            ) : !s.error && (
                                <>
                                    <p className={`font-mono text-xs font-bold ${
                                        s.roas >= 2 ? 'text-[#A3E635]' :
                                        s.roas >= 1 ? 'text-yellow-400' :
                                        s.roas > 0 ? 'text-red-400' : 'text-white/20'
                                    }`}>
                                        {s.roas > 0 ? `${s.roas.toFixed(2)}x` : '—'}
                                    </p>
                                    <p className="font-mono text-[10px] text-white/30">ROAS</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {summaries.length === 0 && !loading && (
                    <p className="font-mono text-xs text-white/30 py-2">
                        Clique em CARREGAR para ver o resumo das contas.
                    </p>
                )}
            </div>
        </div>
    );
}
