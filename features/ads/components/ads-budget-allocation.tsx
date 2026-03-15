'use client';

// =============================================================================
// ads-budget-allocation.tsx — Budget Optimizer: Alocação Markowitz entre Campanhas
//
// Story: US-37-UI — Budget Optimizer UI (aba INSIGHTS)
// Usa: allocateBudgetMarkowitzLike de budget-optimizer.ts
// Dados: AdCampaign[] com insights (spend, purchase_roas) da Meta API
//
// Lógica:
//   1. Extrai spend diário estimado e ROAS de cada campanha
//   2. Estima std de ROAS via proxy conservador (30% da média)
//   3. Aplica alocação Markowitz diagonal com γ=0.5 (risco equilibrado)
//   4. Compara alocação atual vs sugerida com ganho esperado
// =============================================================================

import { useMemo, useState } from 'react';
import { allocateBudgetMarkowitzLike } from '@/lib/utils/budget-optimizer';
import type { AdCampaign } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
    currency?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency: string): string {
    if (v >= 1_000_000) return `${currency === 'BRL' ? 'R$' : '$'}${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${currency === 'BRL' ? 'R$' : '$'}${(v / 1_000).toFixed(0)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsBudgetAllocation({ campaigns, currency = 'BRL' }: Props) {
    const [riskLevel, setRiskLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

    const riskAversion = riskLevel === 'conservative' ? 1.5 : riskLevel === 'balanced' ? 0.5 : 0.1;

    const result = useMemo(() => {
        // Só campanhas com dados de insights
        const withInsights = campaigns.filter(c => c.insights && parseFloat(c.insights.spend || '0') > 0);
        if (withInsights.length < 2) return null;

        // Estimar gasto diário: spend do período / dias
        const buildStats = (c: AdCampaign) => {
            const i = c.insights!;
            const spend = parseFloat(i.spend) || 0;
            const dStart = new Date(i.date_start);
            const dEnd = new Date(i.date_stop);
            const days = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / 86400000) + 1);
            const dailySpend = spend / days;
            const roas = parseFloat(i.purchase_roas?.[0]?.value || '0') || 0;

            return { campaign: c, dailySpend, roas, days };
        };

        const statsMap = withInsights.map(buildStats);

        // Filtrar campanhas com ROAS válido (ou usar proxy 1x para campanhas de awareness)
        const adSets = statsMap.map(s => ({
            id: s.campaign.id,
            meanRoas: s.roas > 0 ? s.roas : 1.0,
            roasStd: s.roas > 0 ? s.roas * 0.3 : 0.3, // 30% conservador
            minSpend: s.dailySpend * 0.2,
            maxSpend: s.dailySpend * 3.0,
        }));

        const totalBudget = statsMap.reduce((s, x) => s + x.dailySpend, 0);
        if (totalBudget <= 0) return null;

        const allocations = allocateBudgetMarkowitzLike(adSets, totalBudget, riskAversion);

        // Merge para display
        const rows = statsMap.map(s => {
            const alloc = allocations.find(a => a.adSetId === s.campaign.id);
            const suggestedSpend = alloc?.spend ?? s.dailySpend;
            const delta = suggestedSpend - s.dailySpend;
            const deltaPercent = s.dailySpend > 0 ? delta / s.dailySpend : 0;
            return {
                id: s.campaign.id,
                name: s.campaign.name,
                currentSpend: s.dailySpend,
                suggestedSpend,
                delta,
                deltaPercent,
                roas: s.roas,
                days: s.days,
            };
        }).sort((a, b) => b.suggestedSpend - a.suggestedSpend);

        // Ganho esperado estimado: Σ (ROAS × ΔSpend) para deltas positivos
        const expectedGain = rows
            .filter(r => r.delta > 0 && r.roas > 0)
            .reduce((s, r) => s + r.roas * r.delta, 0);

        return { rows, totalBudget, expectedGain };
    }, [campaigns, riskAversion]);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!result) {
        return (
            <div className="h-[120px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#A3E635] text-[10px] uppercase tracking-[0.4em]">◈ BUDGET_OPT_UNAVAILABLE</span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Mínimo de 2 campanhas com dados de gasto para alocação
                </p>
            </div>
        );
    }

    const { rows, totalBudget, expectedGain } = result;

    return (
        <section className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]">▤</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Budget_Optimizer — Markowitz_Allocation
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                {/* Risk toggle */}
                <div className="flex bg-[#050505] border border-white/8 rounded overflow-hidden font-mono p-0.5">
                    {(['conservative', 'balanced', 'aggressive'] as const).map(level => (
                        <button
                            key={level}
                            onClick={() => setRiskLevel(level)}
                            className={`text-[8px] px-3 py-1 uppercase font-black tracking-widest transition-all ${
                                riskLevel === level ? 'bg-[#A3E635] text-black' : 'text-[#4A4A4A] hover:text-[#F5F5F5]'
                            }`}
                        >
                            {level === 'conservative' ? 'CONSERV' : level === 'balanced' ? 'EQUILIB' : 'AGRESSIV'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Summary ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { label: 'BUDGET_DIÁRIO_TOTAL', value: fmtCurrency(totalBudget, currency), sub: 'gasto médio estimado' },
                    { label: 'CAMPANHAS_ANALISADAS', value: rows.length.toString(), sub: 'com dados de spend' },
                    { label: 'GANHO_ESPERADO', value: fmtCurrency(expectedGain, currency), sub: 'receita adicional estimada' },
                ].map(item => (
                    <div key={item.label} className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                        <p className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">{item.label}</p>
                        <p className="text-[16px] font-black text-[#F5F5F5] tracking-tight leading-tight">{item.value}</p>
                        <p className="text-[8px] text-[#4A4A4A]">{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Allocation table ─────────────────────────────────────────── */}
            <div className="bg-[#0A0A0A] border border-white/8 rounded-lg overflow-hidden font-mono">
                <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
                    <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.3em]">ALOCAÇÃO POR CAMPANHA</p>
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map(row => {
                        const deltaColor = row.delta > 0 ? '#A3E635' : row.delta < 0 ? '#EF4444' : '#FBBF24';
                        const deltaSign = row.delta > 0 ? '↗' : row.delta < 0 ? '↘' : '─';
                        const barWidth = Math.min(100, Math.abs(row.deltaPercent) * 100);

                        return (
                            <div key={row.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                                {/* Campaign name */}
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-bold text-[#F5F5F5] uppercase truncate max-w-[55%]" title={row.name}>
                                        {row.name}
                                    </p>
                                    <div className="flex items-center gap-3 text-[9px]">
                                        <span className="text-[#4A4A4A]">
                                            ROAS: <span className="text-[#F5F5F5] font-bold">{row.roas > 0 ? `${row.roas.toFixed(2)}×` : 'N/A'}</span>
                                        </span>
                                        <span className="font-black" style={{ color: deltaColor }}>
                                            {deltaSign} {row.deltaPercent >= 0 ? '+' : ''}{(row.deltaPercent * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Current vs Suggested */}
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="space-y-1">
                                        <p className="text-[7px] text-[#4A4A4A] uppercase tracking-widest">ATUAL / DIA</p>
                                        <p className="text-[12px] font-black text-[#8A8A8A]">{fmtCurrency(row.currentSpend, currency)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[7px] text-[#4A4A4A] uppercase tracking-widest">SUGERIDO / DIA</p>
                                        <p className="text-[12px] font-black" style={{ color: deltaColor }}>
                                            {fmtCurrency(row.suggestedSpend, currency)}
                                        </p>
                                    </div>
                                </div>

                                {/* Delta bar */}
                                <div className="space-y-1">
                                    <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${barWidth}%`, backgroundColor: deltaColor }}
                                        />
                                    </div>
                                    <p className="text-[7px] text-[#4A4A4A]">
                                        {row.delta > 0
                                            ? `Escalar +${fmtCurrency(row.delta, currency)}/dia → ROAS ${row.roas.toFixed(2)}× justifica`
                                            : row.delta < 0
                                            ? `Reduzir ${fmtCurrency(Math.abs(row.delta), currency)}/dia → alocar para campanhas de maior ROAS`
                                            : `Manter budget atual`
                                        }
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Disclaimer ──────────────────────────────────────────────── */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-white/[0.02] border border-white/5 font-mono text-[8px] text-[#4A4A4A] tracking-wide">
                <span className="text-[#FBBF24] mt-0.5 flex-shrink-0">◈</span>
                <span>
                    Alocação Markowitz diagonal com γ={riskAversion.toFixed(1)} (aversão ao risco).
                    Baseada em ROAS do período selecionado — não prevê performance futura.
                    Aplique mudanças gradualmente (+20-30%/semana) para evitar disrução de entrega.
                    Std de ROAS estimado em 30% da média histórica (proxy conservador).
                </span>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-6 text-[8px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>MODEL: MARKOWITZ_DIAGONAL_γ={riskAversion}</span>
                <span>CAMPANHAS: {rows.length}</span>
                <span>BUDGET: {fmtCurrency(totalBudget, currency)}/DIA</span>
            </div>
        </section>
    );
}
