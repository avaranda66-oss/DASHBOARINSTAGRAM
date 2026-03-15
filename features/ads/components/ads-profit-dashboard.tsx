'use client';

import { useState } from 'react';
import { useProfitConfigStore } from '@/stores/profit-config-slice';
import {
    calcBreakevenRoas,
    calcTargetRoas,
    calcProfitRoas,
    getRoasStatus,
    type RoasStatus,
} from '@/lib/utils/profit-calculator';
import { AdsProfitConfig } from './ads-profit-config';
import type { AdsKpiSummary } from '@/types/ads';
import type { AdCampaign } from '@/types/ads';

interface Props {
    kpi: AdsKpiSummary;
    campaigns?: AdCampaign[];
}

const STATUS_COLOR: Record<RoasStatus, string> = {
    profit:   '#A3E635',
    breakeven:'#FBBF24',
    loss:     '#EF4444',
    unknown:  '#4A4A4A',
};

const STATUS_ICON: Record<RoasStatus, string> = {
    profit:   '▲',
    breakeven:'─',
    loss:     '▼',
    unknown:  '?',
};

export function AdsProfitDashboard({ kpi, campaigns = [] }: Props) {
    const { config, setConfig } = useProfitConfigStore();
    const [showConfig, setShowConfig] = useState(false);

    const breakeven = calcBreakevenRoas(config);
    const target = calcTargetRoas(config);
    const profitRoas = calcProfitRoas(kpi.totalConversionValue, kpi.totalSpend, config);
    const status = getRoasStatus(kpi.roas, config);
    const statusColor = STATUS_COLOR[status];

    if (!config.enabled) {
        return (
            <>
                <div className="p-6 bg-[#0A0A0A] border border-white/10 rounded-lg font-mono flex items-center justify-between">
                    <div>
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-1">◈ Profit_Intelligence</p>
                        <p className="text-[12px] text-[#8A8A8A]">Configure sua estrutura de custos para ativar análise de lucro real.</p>
                    </div>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="px-4 py-2 border border-[#A3E635]/40 text-[#A3E635] text-[9px] uppercase tracking-widest rounded hover:bg-[#A3E635]/10 transition-colors whitespace-nowrap"
                    >
                        ⚙ Configurar_Margem
                    </button>
                </div>
                {showConfig && <AdsProfitConfig onClose={() => setShowConfig(false)} />}
            </>
        );
    }

    return (
        <>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg font-mono overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">◈ Profit_Intelligence</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-[#A3E635]/10 border border-[#A3E635]/30 text-[#A3E635]">
                            Configurado
                        </span>
                    </div>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="text-[9px] text-[#4A4A4A] uppercase tracking-widest hover:text-[#A3E635] transition-colors"
                    >
                        ⚙ Configurar_Margem
                    </button>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-3 divide-x divide-white/5">
                    <MetricCell
                        label="Breakeven_ROAS"
                        value={`${breakeven.toFixed(2)}x`}
                        color="#8A8A8A"
                        hint={`Margem: ${(100 - config.cogsPct - config.shippingPct - config.feesPct).toFixed(1)}%`}
                    />
                    <MetricCell
                        label="ROAS_Atual"
                        value={kpi.roas > 0 ? `${kpi.roas.toFixed(2)}x` : '—'}
                        color={statusColor}
                        hint={`Target: ${target.toFixed(2)}x`}
                        badge={status !== 'unknown' ? `${STATUS_ICON[status]} ${status.toUpperCase()}` : undefined}
                        badgeColor={statusColor}
                    />
                    <MetricCell
                        label="Profit_ROAS"
                        value={kpi.totalSpend > 0 ? `${profitRoas.toFixed(2)}x` : '—'}
                        color={profitRoas > 0 ? '#A3E635' : profitRoas < 0 ? '#EF4444' : '#4A4A4A'}
                        hint="Receita − custos variáveis − gasto"
                    />
                </div>

                {/* Status banner */}
                {status !== 'unknown' && (
                    <div
                        className="px-6 py-3 border-t border-white/5 text-[10px] tracking-wide"
                        style={{ backgroundColor: `${statusColor}08`, color: statusColor }}
                    >
                        {status === 'loss' && (
                            <span>
                                ⚠ <strong>ABAIXO DO BREAKEVEN</strong> — cada R$1 investido retorna R${kpi.roas.toFixed(2)} mas o breakeven exige R${breakeven.toFixed(2)}
                            </span>
                        )}
                        {status === 'breakeven' && (
                            <span>
                                ─ <strong>NA ZONA DE EQUILÍBRIO</strong> — aumentar eficiência ou reduzir custos variáveis para atingir o target de {target.toFixed(2)}x
                            </span>
                        )}
                        {status === 'profit' && (
                            <span>
                                ▲ <strong>ACIMA DO TARGET</strong> — campanha contribuindo positivamente ({kpi.roas.toFixed(2)}x vs target {target.toFixed(2)}x)
                            </span>
                        )}
                    </div>
                )}

                {/* Per-campaign table */}
                {campaigns.length > 0 && (
                    <CampaignTable campaigns={campaigns} config={config} breakeven={breakeven} />
                )}

                {/* Disclaimer */}
                <div className="px-6 py-3 border-t border-white/5">
                    <p className="text-[8px] text-[#3A3A3A] tracking-wide">
                        Baseado em configuração de margem. ROAS Meta = atribuído, não incremental.
                    </p>
                </div>
            </div>

            {showConfig && (
                <AdsProfitConfig onClose={() => setShowConfig(false)} />
            )}
        </>
    );
}

function MetricCell({
    label,
    value,
    color,
    hint,
    badge,
    badgeColor,
}: {
    label: string;
    value: string;
    color: string;
    hint?: string;
    badge?: string;
    badgeColor?: string;
}) {
    return (
        <div className="p-6 flex flex-col gap-2">
            <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">{label}</span>
            <div className="flex items-end gap-2">
                <span className="text-[1.75rem] font-bold tracking-tighter leading-none" style={{ color }}>
                    {value}
                </span>
                {badge && badgeColor && (
                    <span
                        className="mb-1 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest"
                        style={{ color: badgeColor, borderColor: `${badgeColor}40`, backgroundColor: `${badgeColor}10` }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {hint && <span className="text-[9px] text-[#4A4A4A]">{hint}</span>}
        </div>
    );
}

function CampaignTable({
    campaigns,
    config,
    breakeven,
}: {
    campaigns: AdCampaign[];
    config: import('@/stores/profit-config-slice').ProfitConfig;
    breakeven: number;
}) {
    const rows = campaigns
        .filter(c => c.insights)
        .map(c => {
            const spend = parseFloat(c.insights?.spend || '0') || 0;
            const roasVal = parseFloat(c.insights?.purchase_roas?.[0]?.value || '0') || 0;
            const status = getRoasStatus(roasVal, config);
            const gap = roasVal > 0 ? roasVal - breakeven : null;
            return { id: c.id, name: c.name, roas: roasVal, status, gap };
        })
        .filter(r => r.roas > 0);

    if (rows.length === 0) return null;

    return (
        <div className="border-t border-white/5">
            <div className="px-6 py-3">
                <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-3">Por Campanha</p>
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="text-[#3A3A3A] uppercase tracking-widest">
                            <th className="text-left pb-2 font-normal">Campanha</th>
                            <th className="text-right pb-2 font-normal">ROAS</th>
                            <th className="text-right pb-2 font-normal">Status</th>
                            <th className="text-right pb-2 font-normal">Gap Breakeven</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => {
                            const color = STATUS_COLOR[r.status];
                            const icon = STATUS_ICON[r.status];
                            return (
                                <tr key={r.id} className="border-t border-white/5">
                                    <td className="py-2 text-[#8A8A8A] truncate max-w-[200px]">{r.name}</td>
                                    <td className="py-2 text-right text-[#F5F5F5] font-bold">{r.roas.toFixed(2)}x</td>
                                    <td className="py-2 text-right font-bold" style={{ color }}>
                                        {icon} {r.status.toUpperCase()}
                                    </td>
                                    <td className="py-2 text-right" style={{ color: r.gap != null && r.gap >= 0 ? '#A3E635' : '#EF4444' }}>
                                        {r.gap != null ? `${r.gap >= 0 ? '+' : ''}${r.gap.toFixed(2)}x` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
