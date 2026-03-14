'use client';

import { useMemo } from 'react';
import type { AdsKpiSummary, AdsKpiDelta } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';
import { viralPotentialIndex } from '@/lib/utils/statistics';

interface Props {
    kpi: AdsKpiSummary;
    delta?: AdsKpiDelta | null;
}

const GLYPHS = {
    MONEY: '＄',
    EYE: '◎',
    CLICK: '◈',
    TARGET: '◎',
    TREND: '↗',
    USERS: '○',
    CHART: '▤',
    AUTO: '⚡',
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

function formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
}

/** Badge de variação vs período anterior */
function DeltaBadge({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
    if (value == null || !isFinite(value)) return null;
    // invert=true: queda é boa (ex: CPC — menor é melhor)
    const isPositive = invert ? value < 0 : value > 0;
    const color = isPositive ? '#A3E635' : '#EF4444';
    const arrow = value > 0 ? '↑' : '↓';
    const abs = Math.abs(value);
    const label = abs >= 1000 ? `${(abs / 1000).toFixed(1)}K%` : `${abs.toFixed(1)}%`;

    return (
        <span
            className="font-mono text-[9px] font-semibold mt-1 flex items-center gap-0.5"
            style={{ color }}
        >
            {arrow} {label}
        </span>
    );
}

export function AdsKpiCards({ kpi, delta }: Props) {
    // US-55: Viral Potential Index — computed de totalEngagements/impressions + CTR
    const viral = useMemo(() => {
        if (!kpi.totalImpressions || kpi.totalImpressions === 0) return null;
        return viralPotentialIndex({
            engagementRate: kpi.totalEngagements / kpi.totalImpressions,
            ctr: kpi.avgCtr / 100, // avgCtr vem em % (ex: 1.5 = 1.5%)
        });
    }, [kpi.totalEngagements, kpi.totalImpressions, kpi.avgCtr]);

    const viralColor = viral
        ? viral.classification === 'VIRAL'   ? '#A3E635'
        : viral.classification === 'ALTO'    ? '#FBBF24'
        : viral.classification === 'MODERADO'? '#F97316'
        : '#EF4444'
        : '#4A4A4A';

    const cards = [
        {
            label: 'Total_Spend',
            value: formatCurrency(kpi.totalSpend, kpi.currency),
            glyph: GLYPHS.MONEY,
            color: 'text-[#F5F5F5]',
            accent: 'text-[#EF4444]',
            deltaKey: delta?.totalSpend,
            invert: false, // mais gasto = neutro, sem inversão
        },
        {
            label: 'Impressions',
            value: formatNumber(kpi.totalImpressions),
            glyph: GLYPHS.EYE,
            color: 'text-[#F5F5F5]',
            accent: 'text-blue-500',
            deltaKey: delta?.totalImpressions,
            invert: false,
        },
        {
            label: 'Clicks',
            value: formatNumber(kpi.totalClicks),
            glyph: GLYPHS.CLICK,
            color: 'text-[#F5F5F5]',
            accent: 'text-green-500',
            deltaKey: delta?.totalClicks,
            invert: false,
        },
        {
            label: 'Yield_CTR',
            value: formatPercent(kpi.avgCtr),
            glyph: GLYPHS.TARGET,
            color: 'text-[#A3E635]',
            accent: 'text-[#A3E635]',
            deltaKey: delta?.avgCtr,
            invert: false,
        },
        {
            label: 'Avg_CPC',
            value: formatCurrency(kpi.avgCpc, kpi.currency),
            glyph: GLYPHS.CHART,
            color: 'text-[#FBBF24]',
            accent: 'text-[#FBBF24]',
            deltaKey: delta?.avgCpc,
            invert: true, // CPC menor = melhor
        },
        {
            label: 'Total_Reach',
            value: formatNumber(kpi.totalReach),
            glyph: GLYPHS.USERS,
            color: 'text-[#F5F5F5]',
            accent: 'text-cyan-500',
            deltaKey: delta?.totalReach,
            invert: false,
        },
        {
            label: 'Conversions',
            value: formatNumber(kpi.totalConversions),
            glyph: GLYPHS.AUTO,
            color: 'text-[#A3E635]',
            accent: 'text-[#A3E635]',
            deltaKey: delta?.totalConversions,
            invert: false,
        },
        {
            label: 'ROAS_Factor',
            value: kpi.roas > 0 ? `${kpi.roas.toFixed(2)}x` : '—',
            glyph: GLYPHS.TREND,
            color: kpi.roas >= 2 ? 'text-[#A3E635]' : kpi.roas >= 1 ? 'text-[#FBBF24]' : 'text-[#EF4444]',
            accent: kpi.roas >= 2 ? 'text-[#A3E635]' : kpi.roas >= 1 ? 'text-[#FBBF24]' : 'text-[#EF4444]',
            deltaKey: delta?.roas,
            invert: false,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="p-5 bg-[#0A0A0A] border border-white/10 rounded-lg flex flex-col justify-between group hover:border-white/20 transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] text-[#4A4A4A] font-bold uppercase tracking-[0.2em]">{card.label}</span>
                        <span className={cn('text-xs opacity-40 group-hover:opacity-100 transition-opacity', card.accent)}>{wrap(card.glyph)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className={cn('text-[1.5rem] font-bold tracking-tighter leading-none mb-1', card.color)}>{card.value}</p>
                        <div className="h-0.5 w-8 bg-white/5 group-hover:bg-[#A3E635]/20 transition-colors mb-1" />
                        <DeltaBadge value={card.deltaKey} invert={card.invert} />
                    </div>
                </div>
            ))}

            {/* US-55 — Viral Potential Index card */}
            {viral && (
                <div className="p-5 bg-[#0A0A0A] border border-white/10 rounded-lg flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] text-[#4A4A4A] font-bold uppercase tracking-[0.2em]">Viral_Potential</span>
                        <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: viralColor }}>
                            {wrap('◆')}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[1.5rem] font-bold tracking-tighter leading-none mb-1" style={{ color: viralColor }}>
                            {viral.score.toFixed(0)}
                        </p>
                        <div className="h-0.5 w-8 bg-white/5 group-hover:bg-[#A3E635]/20 transition-colors mb-1" />
                        <span
                            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                            style={{
                                color: viralColor,
                                borderColor: `${viralColor}40`,
                                backgroundColor: `${viralColor}10`,
                            }}
                        >
                            {viral.classification}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
