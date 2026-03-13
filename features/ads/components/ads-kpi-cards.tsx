'use client';

import { Card } from '@/components/ui/card';
import type { AdsKpiSummary } from '@/types/ads';
import {
    DollarSign, Eye, MousePointerClick, Target,
    TrendingUp, Users, BarChart3, Zap,
} from 'lucide-react';

interface Props {
    kpi: AdsKpiSummary;
}

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
            label: 'Gasto Total',
            value: formatCurrency(kpi.totalSpend, kpi.currency),
            icon: DollarSign,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
        },
        {
            label: 'Impressões',
            value: formatNumber(kpi.totalImpressions),
            icon: Eye,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Cliques',
            value: formatNumber(kpi.totalClicks),
            icon: MousePointerClick,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
        {
            label: 'CTR',
            value: formatPercent(kpi.avgCtr),
            icon: Target,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            label: 'CPC Médio',
            value: formatCurrency(kpi.avgCpc, kpi.currency),
            icon: BarChart3,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
        {
            label: 'Alcance',
            value: formatNumber(kpi.totalReach),
            icon: Users,
            color: 'text-cyan-500',
            bg: 'bg-cyan-500/10',
        },
        {
            label: 'Conversões',
            value: formatNumber(kpi.totalConversions),
            icon: Zap,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
        },
        {
            label: 'ROAS',
            value: kpi.roas > 0 ? `${kpi.roas.toFixed(2)}x` : '—',
            icon: TrendingUp,
            color: kpi.roas >= 2 ? 'text-green-500' : kpi.roas >= 1 ? 'text-yellow-500' : 'text-red-500',
            bg: kpi.roas >= 2 ? 'bg-green-500/10' : kpi.roas >= 1 ? 'bg-yellow-500/10' : 'bg-red-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map((card) => (
                <Card key={card.label} className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                        <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                        <p className="text-lg font-bold truncate">{card.value}</p>
                    </div>
                </Card>
            ))}
        </div>
    );
}
