'use client';

import { useMemo } from 'react';
import { useAdsStore } from '@/stores';
import { bayesianAB } from '@/lib/utils/bayesian-ab';
import { cn } from '@/design-system/utils/cn';
import type { Ad } from '@/types/ads';

// ─── BH Correction ───────────────────────────────────────────────────────────

function bhCorrection(pValues: number[], alpha = 0.05): boolean[] {
    const m = pValues.length;
    if (m === 0) return [];
    const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    const threshold = sorted.findLastIndex((s, k) => s.p <= ((k + 1) / m) * alpha);
    return pValues.map((_, i) => sorted.findIndex(s => s.i === i) <= threshold);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdImpressions(ad: Ad): number {
    return parseInt(ad.insights?.impressions ?? '0', 10) || 0;
}

function getAdConversions(ad: Ad): number {
    const actions = ad.insights?.actions ?? [];
    const purchase = actions.find(a => a.action_type === 'purchase');
    if (purchase) return parseFloat(purchase.value) || 0;
    const click = actions.find(a => a.action_type === 'link_click');
    if (click) return parseFloat(click.value) || 0;
    return 0;
}

function formatPct(v: number): string {
    return `${(v * 100).toFixed(1)}%`;
}

function formatNumber(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString('pt-BR');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ABPair {
    adsetId: string;
    adsetName: string;
    adA: Ad;
    adB: Ad;
    pValue: number; // proxy: 1 - probBWins (two-sided distance from 0.5, mapped to [0,1])
    probBWins: number;
    expectedLoss: number;
    recommendation: 'deploy_B' | 'keep_A' | 'inconclusive';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'significant' | 'trending' | 'inconclusive' }) {
    const cfg = {
        significant: 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/30',
        trending:    'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30',
        inconclusive:'bg-white/5 text-[#4A4A4A] border-white/10',
    };
    return (
        <span className={cn('text-[8px] px-2 py-0.5 border font-black uppercase tracking-[0.2em]', cfg[status])}>
            {status}
        </span>
    );
}

function VariantCard({
    ad,
    isLeader,
    label,
}: {
    ad: Ad;
    isLeader: boolean;
    label: 'A' | 'B';
}) {
    const impressions = getAdImpressions(ad);
    const conversions = getAdConversions(ad);
    const ctr = impressions > 0 ? (conversions / impressions) * 100 : 0;

    return (
        <div
            className={cn(
                'flex-1 bg-[#0A0A0A] border rounded-lg p-4 space-y-3 font-mono min-w-0',
                isLeader ? 'border-[#A3E635]/30' : 'border-white/8',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span
                    className={cn(
                        'text-[8px] px-1.5 py-0.5 border font-black uppercase tracking-[0.2em]',
                        isLeader
                            ? 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/30'
                            : 'bg-white/5 text-[#4A4A4A] border-white/10',
                    )}
                >
                    {label}
                    {isLeader && ' ◈ LÍDER'}
                </span>
            </div>
            <p
                className={cn(
                    'text-[10px] font-bold uppercase tracking-tight truncate',
                    isLeader ? 'text-[#A3E635]' : 'text-[#8A8A8A]',
                )}
                title={ad.name}
            >
                {ad.name}
            </p>
            <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div>
                    <p className="text-[#4A4A4A] uppercase tracking-widest">CTR</p>
                    <p className={cn('font-black', isLeader ? 'text-[#A3E635]' : 'text-[#F5F5F5]')}>
                        {ctr.toFixed(2)}%
                    </p>
                </div>
                <div>
                    <p className="text-[#4A4A4A] uppercase tracking-widest">Imp</p>
                    <p className="text-[#F5F5F5] font-bold">{formatNumber(impressions)}</p>
                </div>
                <div>
                    <p className="text-[#4A4A4A] uppercase tracking-widest">Conv</p>
                    <p className="text-[#F5F5F5] font-bold">{formatNumber(conversions)}</p>
                </div>
            </div>
        </div>
    );
}

function ABPairCard({ pair, isBHSignificant }: { pair: ABPair; isBHSignificant: boolean }) {
    const impressionsA = getAdImpressions(pair.adA);
    const impressionsB = getAdImpressions(pair.adB);

    const status: 'significant' | 'trending' | 'inconclusive' = isBHSignificant
        ? 'significant'
        : pair.probBWins >= 0.85 || pair.probBWins <= 0.15
          ? 'trending'
          : 'inconclusive';

    const leaderIsB = pair.probBWins >= 0.5;
    const leaderProb = leaderIsB ? pair.probBWins : 1 - pair.probBWins;
    const leaderLabel = leaderIsB ? 'B' : 'A';
    const loserLabel = leaderIsB ? 'A' : 'B';

    const barWidth = Math.round(leaderProb * 100);

    const totalImpressions = impressionsA + impressionsB;
    const progressPct = Math.min(Math.round((totalImpressions / 400) * 100), 100);

    return (
        <div className="bg-[#111111] border border-white/8 rounded-lg p-6 space-y-5 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#A3E635] font-mono text-[10px]">◈</span>
                    <span className="text-[11px] font-bold text-[#F5F5F5] uppercase truncate tracking-tight">
                        AB_TEST — {pair.adsetName}
                    </span>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Variant cards */}
            <div className="flex gap-3">
                <VariantCard ad={pair.adA} isLeader={!leaderIsB} label="A" />
                <VariantCard ad={pair.adB} isLeader={leaderIsB} label="B" />
            </div>

            {/* P(B > A) bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                    <span>P({leaderLabel}&gt;{loserLabel})</span>
                    <span className="text-[#A3E635] font-black">{formatPct(leaderProb)}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${barWidth}%`,
                            backgroundColor: isBHSignificant ? '#A3E635' : pair.probBWins >= 0.85 || pair.probBWins <= 0.15 ? '#FBBF24' : '#3A3A3A',
                        }}
                    />
                </div>
                <p className="text-[9px] text-[#8A8A8A]">
                    {formatPct(leaderProb)} probabilidade de que {leaderLabel} é melhor
                </p>
            </div>

            {/* Sample progress */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                    <span>SAMPLE_LOAD</span>
                    <span className="text-[#F5F5F5]">{progressPct}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 bg-white/20"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Expected loss */}
            <p className="text-[9px] text-[#4A4A4A] uppercase">
                EXPECTED_LOSS escolhendo {loserLabel}:{' '}
                <span className="text-[#FBBF24] font-bold">{formatPct(pair.expectedLoss)}</span>
            </p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdsAbTestingPanel() {
    const { ads, adSets } = useAdsStore();

    const { pairs, bhResults } = useMemo(() => {
        // Group ads by adset_id
        const byAdset: Record<string, Ad[]> = {};
        for (const ad of ads) {
            if (!ad.adset_id) continue;
            if (!byAdset[ad.adset_id]) byAdset[ad.adset_id] = [];
            byAdset[ad.adset_id].push(ad);
        }

        const validPairs: ABPair[] = [];

        for (const [adsetId, adsetAds] of Object.entries(byAdset)) {
            // Filter ads with >= 200 impressions
            const qualified = adsetAds.filter(ad => getAdImpressions(ad) >= 200);
            if (qualified.length < 2) continue;

            const adSet = adSets.find(s => s.id === adsetId);
            const adsetName = adSet?.name ?? adsetId;

            // Take first two qualified ads as A/B pair (primary comparison)
            const adA = qualified[0];
            const adB = qualified[1];

            const impA = getAdImpressions(adA);
            const impB = getAdImpressions(adB);
            const convA = getAdConversions(adA);
            const convB = getAdConversions(adB);

            const result = bayesianAB(convA, impA, convB, impB);

            // Proxy p-value: distance from 0.5 mapped to [0,1]
            // Further from 0.5 → smaller p-value → more significant
            const distFromHalf = Math.abs(result.probBWins - 0.5);
            const pValue = Math.max(0, 1 - distFromHalf * 4); // ~0 when probBWins>=0.75

            validPairs.push({
                adsetId,
                adsetName,
                adA,
                adB,
                pValue,
                probBWins: result.probBWins,
                expectedLoss: result.expectedLoss,
                recommendation: result.recommendation,
            });
        }

        const pValues = validPairs.map(p => p.pValue);
        const bh = bhCorrection(pValues);

        return { pairs: validPairs, bhResults: bh };
    }, [ads, adSets]);

    const significantCount = bhResults.filter(Boolean).length;

    if (pairs.length === 0) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] font-mono text-[10px]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                        AB_Testing_Engine
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                </div>
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-10 flex items-center justify-center font-mono">
                    <p className="text-[10px] text-[#4A4A4A] uppercase tracking-[0.2em] text-center">
                        ◈ NENHUM TESTE DETECTADO — precisa de ≥2 ads por adset com ≥200 impressões cada
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-[#A3E635] font-mono text-[10px]">◈</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    AB_Testing_Engine
                </h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-1">
                    [{pairs.length}_TESTES_ATIVOS]
                </span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Pairs */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pairs.map((pair, i) => (
                    <ABPairCard
                        key={pair.adsetId}
                        pair={pair}
                        isBHSignificant={bhResults[i] ?? false}
                    />
                ))}
            </div>

            {/* BH Footer */}
            {pairs.length > 1 && (
                <p className="text-[9px] text-[#4A4A4A] font-mono uppercase tracking-[0.15em] text-center pt-2">
                    Correção BH aplicada (FDR 5%) —{' '}
                    <span className="text-[#A3E635] font-bold">{significantCount}</span>{' '}
                    de {pairs.length} testes significativos
                </p>
            )}
        </section>
    );
}
