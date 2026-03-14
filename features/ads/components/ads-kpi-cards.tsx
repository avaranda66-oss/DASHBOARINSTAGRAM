'use client';

import { Card } from '@/components/ui/card';
import type { AdsKpiSummary } from '@/types/ads';
// [ZERO_LUCIDE_PURGE]
import { cn } from '@/design-system/utils/cn';

interface Props {
    kpi: AdsKpiSummary;
}

const GLYPHS = {
    MONEY: '＄',
    EYE: '◎',
    CLICK: '◈',
    TARGET: '◎',
    TREND: '↗',
    USERS: '○',
    CHART: '▤',
    AUTO: '⚡'
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

export function AdsKpiCards({ kpi }: Props) {
    const cards = [
        {
            label: 'Total_Spend',
            value: formatCurrency(kpi.totalSpend, kpi.currency),
            glyph: GLYPHS.MONEY,
            color: 'text-[#F5F5F5]',
            accent: 'text-[#EF4444]',
        },
        {
            label: 'Impressions',
            value: formatNumber(kpi.totalImpressions),
            glyph: GLYPHS.EYE,
            color: 'text-[#F5F5F5]',
            accent: 'text-blue-500',
        },
        {
            label: 'Clicks',
            value: formatNumber(kpi.totalClicks),
            glyph: GLYPHS.CLICK,
            color: 'text-[#F5F5F5]',
            accent: 'text-green-500',
        },
        {
            label: 'Yield_CTR',
            value: formatPercent(kpi.avgCtr),
            glyph: GLYPHS.TARGET,
            color: 'text-[#A3E635]',
            accent: 'text-[#A3E635]',
        },
        {
            label: 'Avg_CPC',
            value: formatCurrency(kpi.avgCpc, kpi.currency),
            glyph: GLYPHS.CHART,
            color: 'text-[#FBBF24]',
            accent: 'text-[#FBBF24]',
        },
        {
            label: 'Total_Reach',
            value: formatNumber(kpi.totalReach),
            glyph: GLYPHS.USERS,
            color: 'text-[#F5F5F5]',
            accent: 'text-cyan-500',
        },
        {
            label: 'Conversions',
            value: formatNumber(kpi.totalConversions),
            glyph: GLYPHS.AUTO,
            color: 'text-[#A3E635]',
            accent: 'text-[#A3E635]',
        },
        {
            label: 'ROAS_Factor',
            value: kpi.roas > 0 ? `${kpi.roas.toFixed(2)}x` : '—',
            glyph: GLYPHS.TREND,
            color: kpi.roas >= 2 ? 'text-[#A3E635]' : kpi.roas >= 1 ? 'text-[#FBBF24]' : 'text-[#EF4444]',
            accent: kpi.roas >= 2 ? 'text-[#A3E635]' : kpi.roas >= 1 ? 'text-[#FBBF24]' : 'text-[#EF4444]',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            {cards.map((card) => (
                <Card key={card.label} className="p-5 bg-[#0A0A0A] border-white/10 rounded-lg flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] text-[#4A4A4A] font-bold uppercase tracking-[0.2em]">{card.label}</span>
                        <span className={cn("text-xs opacity-40 group-hover:opacity-100 transition-opacity", card.accent)}>{wrap(card.glyph)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className={cn("text-[1.5rem] font-bold tracking-tighter leading-none mb-1", card.color)}>{card.value}</p>
                        <div className="h-0.5 w-8 bg-white/5 group-hover:bg-[#A3E635]/20 transition-colors" />
                    </div>
                </Card>
            ))}
        </div>
    );
}
