'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { chiSquaredProportions, bayesianAB } from '@/lib/utils/bayesian-ab';
import type { AdSet } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

interface Props {
    adSets: AdSet[];
    currency?: string;
}

const MIN_IMPRESSIONS = 100;

function fmt(n: number, decimals = 2) {
    return n.toFixed(decimals);
}

function pValueLabel(pValue: number): string {
    if (pValue < 0.001) return 'p < 0.001';
    if (pValue < 0.01)  return `p = ${pValue.toFixed(3)}`;
    return `p = ${pValue.toFixed(3)}`;
}

export function AdsABTestCard({ adSets, currency = 'BRL' }: Props) {
    const result = useMemo(() => {
        // Filtra ad sets com insights suficientes
        const valid = adSets
            .filter(s => {
                const impr = parseInt(s.insights?.impressions ?? '0');
                const clicks = parseInt(s.insights?.clicks ?? '0');
                return impr >= MIN_IMPRESSIONS && clicks >= 0;
            })
            .sort((a, b) => {
                const ia = parseInt(a.insights?.impressions ?? '0');
                const ib = parseInt(b.insights?.impressions ?? '0');
                return ib - ia;
            });

        if (valid.length < 2) return null;

        const setA = valid[0];
        const setB = valid[1];

        const aImpr  = parseInt(setA.insights!.impressions);
        const aClicks = parseInt(setA.insights!.inline_link_clicks ?? setA.insights!.clicks ?? '0') || 0;
        const bImpr  = parseInt(setB.insights!.impressions);
        const bClicks = parseInt(setB.insights!.inline_link_clicks ?? setB.insights!.clicks ?? '0') || 0;

        const chiSqResult  = chiSquaredProportions(aClicks, aImpr, bClicks, bImpr);
        const bayesResult  = bayesianAB(aClicks, aImpr, bClicks, bImpr);

        return { setA, setB, chiSqResult, bayesResult, aImpr, aClicks, bImpr, bClicks };
    }, [adSets]);

    if (!result) {
        return (
            <div
                className="p-5 bg-[#0A0A0A] border rounded-lg font-mono"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
                <span className="text-[9px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-2">
                    A/B_Test · Statistical Engine
                </span>
                <p className="text-[11px] text-[#2A2A2A]">
                    Necessário ≥ 2 ad sets com {MIN_IMPRESSIONS}+ impressões para comparação estatística.
                </p>
            </div>
        );
    }

    const { setA, setB, chiSqResult, bayesResult } = result;

    const recColor = {
        deploy_B: '#A3E635',
        keep_A: '#EF4444',
        inconclusive: '#FBBF24',
    }[bayesResult.recommendation];

    const recLabel = {
        deploy_B: `ESCALAR ${setB.name.split(' ')[0].toUpperCase()}`,
        keep_A: `MANTER ${setA.name.split(' ')[0].toUpperCase()}`,
        inconclusive: 'INCONCLUSIVO',
    }[bayesResult.recommendation];

    const winnerCtr = bayesResult.recommendation === 'deploy_B'
        ? chiSqResult.ctrB : chiSqResult.ctrA;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] border rounded-lg overflow-hidden font-mono"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
            {/* Header */}
            <div
                className="px-5 py-3 border-b border-white/5 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
            >
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F5F5]">
                        A/B_Test · Statistical Engine
                    </span>
                    <p className="text-[8px] text-[#4A4A4A] uppercase tracking-widest mt-0.5">
                        Chi² + Bayesian Beta-Binomial · Top 2 Ad Sets
                    </p>
                </div>
                <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[3px]"
                    style={{ color: recColor, backgroundColor: `${recColor}15`, border: `1px solid ${recColor}40` }}
                >
                    {recLabel}
                </span>
            </div>

            <div className="p-5 space-y-5">
                {/* Variantes */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'A', set: setA, impr: result.aImpr, clicks: result.aClicks, ctr: chiSqResult.ctrA },
                        { label: 'B', set: setB, impr: result.bImpr, clicks: result.bClicks, ctr: chiSqResult.ctrB },
                    ].map(({ label, set, impr, clicks, ctr }) => {
                        const isWinner = (label === 'B' && bayesResult.recommendation === 'deploy_B')
                                      || (label === 'A' && bayesResult.recommendation === 'keep_A');
                        return (
                            <div
                                key={label}
                                className={cn(
                                    "p-4 rounded-[6px] border transition-all",
                                    isWinner
                                        ? "border-[#A3E635]/30 bg-[#A3E635]/5"
                                        : "border-white/5 bg-[#111]"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span
                                        className="text-[9px] font-black px-1.5 py-0.5 rounded-sm"
                                        style={{
                                            backgroundColor: isWinner ? '#A3E635' : 'rgba(255,255,255,0.08)',
                                            color: isWinner ? '#000' : '#4A4A4A',
                                        }}
                                    >
                                        VAR_{label}
                                    </span>
                                    <span className="text-[9px] text-[#4A4A4A] truncate max-w-[120px]">{set.name}</span>
                                </div>
                                <p className="text-[1.4rem] font-bold tracking-tighter text-[#F5F5F5]">
                                    {fmt(ctr * 100)}%
                                </p>
                                <p className="text-[8px] text-[#4A4A4A] mt-1">CTR</p>
                                <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-1">
                                    <div>
                                        <p className="text-[8px] text-[#3A3A3A]">Impressões</p>
                                        <p className="text-[10px] text-[#8A8A8A]">{impr.toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-[#3A3A3A]">Cliques</p>
                                        <p className="text-[10px] text-[#8A8A8A]">{clicks.toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCell
                        label="P(B > A)"
                        value={`${(bayesResult.probBWins * 100).toFixed(1)}%`}
                        sub="Bayesian"
                        highlight={bayesResult.probBWins > 0.9}
                    />
                    <StatCell
                        label="Chi² p-value"
                        value={pValueLabel(chiSqResult.pValue)}
                        sub={chiSqResult.significant ? 'Significativo' : 'Não-sig.'}
                        highlight={chiSqResult.significant}
                    />
                    <StatCell
                        label="Efeito"
                        value={`${chiSqResult.effectPercent > 0 ? '+' : ''}${chiSqResult.effectPercent.toFixed(1)}%`}
                        sub="B vs A (relativo)"
                        highlight={Math.abs(chiSqResult.effectPercent) > 10}
                    />
                    <StatCell
                        label="Perda Esp."
                        value={`${(bayesResult.expectedLoss * 100).toFixed(3)}%`}
                        sub="Expected Loss"
                        highlight={false}
                    />
                </div>

                {/* Credible Interval */}
                <div
                    className="px-4 py-3 rounded-[4px] border border-white/5 flex items-center justify-between"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                    <span className="text-[9px] text-[#3A3A3A] uppercase tracking-widest">IC 95% (θB − θA)</span>
                    <span className="text-[10px] text-[#8A8A8A] font-mono">
                        [{(bayesResult.credibleInterval.lower * 100).toFixed(3)}%, {(bayesResult.credibleInterval.upper * 100).toFixed(3)}%]
                    </span>
                    {chiSqResult.yatesCorrectionApplied && (
                        <span className="text-[8px] text-[#4A4A4A] italic ml-2">+Yates</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function StatCell({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight: boolean }) {
    return (
        <div className={cn(
            "p-3 rounded-[4px] border",
            highlight ? "border-[#A3E635]/20 bg-[#A3E635]/5" : "border-white/5 bg-[#111]"
        )}>
            <p className="text-[8px] text-[#3A3A3A] uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-[11px] font-bold", highlight ? "text-[#A3E635]" : "text-[#F5F5F5]")}>{value}</p>
            <p className="text-[8px] text-[#3A3A3A] mt-0.5">{sub}</p>
        </div>
    );
}
