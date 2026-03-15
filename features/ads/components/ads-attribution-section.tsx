'use client';

// =============================================================================
// ads-attribution-section.tsx — Shapley Attribution por Campanha
//
// Story: US-45 — Conectar attribution.ts (shapleyValues) à UI
// Dados: AdCampaign[] com insights → Shapley credit distribution
//
// NOTA: Com dados agregados (sem jornada do cliente), a função de valor usa
// conversionValue × eficiência ROAS como proxy. Não é multi-touch attribution
// verdadeira — para isso, seria necessário integrar dados de jornada (CRM/Shopify).
// =============================================================================

import { useMemo } from 'react';
import { shapleyValues } from '@/lib/utils/attribution';
import type { AdCampaign, AdInsight } from '@/types/ads';

interface Props {
    campaigns: AdCampaign[];
}

const MIN_CAMPAIGNS = 2;
const MAX_CAMPAIGNS = 8; // shapleyValues: 2^n — limitado para performance

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConversionValue(insight: AdInsight | undefined): number {
    if (!insight) return 0;
    const purchaseRoas = insight.purchase_roas?.find(a => a.action_type === 'omni_purchase');
    if (purchaseRoas) {
        const roas = parseFloat(purchaseRoas.value || '0');
        const spend = parseFloat(insight.spend || '0');
        return roas * spend; // revenue ≈ ROAS × spend
    }
    // Fallback: contar conversões pelo tipo mais comum
    const conv = insight.actions?.find(a =>
        a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
        a.action_type === 'lead' ||
        a.action_type === 'offsite_conversion.fb_pixel_lead'
    );
    return conv ? parseFloat(conv.value || '0') : 0;
}

function getRoas(insight: AdInsight | undefined): number {
    if (!insight) return 0;
    const roas = insight.purchase_roas?.find(a => a.action_type === 'omni_purchase');
    return roas ? parseFloat(roas.value || '0') : 0;
}

// ─── Compute Hook ─────────────────────────────────────────────────────────────

interface ShapleyRow {
    id: string;
    name: string;
    shapleyCredit: number;     // φᵢ normalizado [0,1]
    spendShare: number;        // spend / total_spend [0,1]
    conversionShare: number;   // conversions / total [0,1]
    efficiency: 'over' | 'fair' | 'under'; // Shapley vs spend
    spend: number;
    convValue: number;
    roas: number;
}

function useShapleyAttribution(campaigns: AdCampaign[]): ShapleyRow[] {
    return useMemo(() => {
        const eligible = campaigns
            .filter(c => c.insights && parseFloat(c.insights.spend || '0') > 0)
            .slice(0, MAX_CAMPAIGNS);

        if (eligible.length < MIN_CAMPAIGNS) return [];

        const players = eligible.map(c => c.id);
        const totalSpend = eligible.reduce((s, c) => s + parseFloat(c.insights!.spend || '0'), 0);

        // Pré-computa valor por campanha
        const convByPlayer: Record<string, number> = {};
        const roasByPlayer: Record<string, number> = {};

        for (const c of eligible) {
            convByPlayer[c.id] = getConversionValue(c.insights);
            roasByPlayer[c.id] = getRoas(c.insights);
        }

        const maxRoas = Math.max(...Object.values(roasByPlayer), 0.01);
        const totalConv = Object.values(convByPlayer).reduce((a, v) => a + v, 0);

        // V(S) = Σᵢ∈S [convValue_i × (1 + roas_i/maxRoas)]
        // Captura volume E eficiência relativa
        const valueFn = (coalition: string[]): number => {
            if (coalition.length === 0) return 0;
            return coalition.reduce((acc, id) => {
                const efficiencyBonus = maxRoas > 0 ? 1 + roasByPlayer[id] / maxRoas : 1;
                return acc + convByPlayer[id] * efficiencyBonus;
            }, 0);
        };

        let phi: Record<string, number>;
        try {
            phi = shapleyValues(players, valueFn);
        } catch {
            return [];
        }

        // Normaliza Shapley para [0,1]
        const phiTotal = Object.values(phi).reduce((a, v) => a + Math.max(v, 0), 0) || 1;

        return eligible.map(c => {
            const spend = parseFloat(c.insights!.spend || '0');
            const spendShare = totalSpend > 0 ? spend / totalSpend : 0;
            const shapleyCredit = Math.max(phi[c.id] ?? 0, 0) / phiTotal;
            const convValue = convByPlayer[c.id];
            const convShare = totalConv > 0 ? convValue / totalConv : 0;

            const ratio = spendShare > 0 ? shapleyCredit / spendShare : 1;
            const efficiency: ShapleyRow['efficiency'] =
                ratio > 1.15 ? 'over' : ratio < 0.85 ? 'under' : 'fair';

            return {
                id: c.id,
                name: c.name,
                shapleyCredit,
                spendShare,
                conversionShare: convShare,
                efficiency,
                spend,
                convValue,
                roas: roasByPlayer[c.id],
            };
        }).sort((a, b) => b.shapleyCredit - a.shapleyCredit);
    }, [campaigns]);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const EFFICIENCY_STYLE = {
    over:  { color: '#A3E635', label: 'ALTO ROI', bg: 'bg-[#A3E635]/10 border-[#A3E635]/20' },
    fair:  { color: '#FBBF24', label: 'BALANCEADO', bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/20' },
    under: { color: '#EF4444', label: 'BAIXO ROI', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20' },
};

function DoubleBar({ shapley, spend }: { shapley: number; spend: number }) {
    const shapleyPct = Math.round(shapley * 100);
    const spendPct   = Math.round(spend * 100);
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono">
                <span className="text-[7px] text-[#4A4A4A] w-12 uppercase tracking-widest">SHAPLEY</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#A3E635] rounded-full" style={{ width: `${shapleyPct}%` }} />
                </div>
                <span className="text-[9px] text-[#A3E635] font-black w-8 text-right">{shapleyPct}%</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
                <span className="text-[7px] text-[#4A4A4A] w-12 uppercase tracking-widest">SPEND</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20 rounded-full" style={{ width: `${spendPct}%` }} />
                </div>
                <span className="text-[9px] text-[#8A8A8A] font-black w-8 text-right">{spendPct}%</span>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsAttributionSection({ campaigns }: Props) {
    const rows = useShapleyAttribution(campaigns);

    if (rows.length < MIN_CAMPAIGNS) {
        return (
            <div className="h-[120px] flex items-center justify-center opacity-30">
                <p className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.4em]">
                    Mínimo de {MIN_CAMPAIGNS} campanhas com dados para Shapley Attribution
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-purple-400">◬</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Shapley_Attribution_Engine
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <span className="text-[8px] font-mono text-[#4A4A4A] uppercase tracking-widest">
                    MÉTODO: SHAPLEY VALUES — {rows.length} CAMPANHAS
                </span>
            </div>

            {/* Disclaimer */}
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-white/[0.02] border border-white/5 font-mono">
                <span className="text-[#4A4A4A] text-[9px]">◎</span>
                <p className="text-[8px] text-[#4A4A4A] uppercase tracking-wider">
                    Attribution estimada via performance agregada — crédito justo baseado em conversionValue × eficiência ROAS.
                    Para multi-touch real, integre dados de jornada (CRM/Shopify).
                </p>
            </div>

            {/* Rows */}
            <div className="space-y-3">
                {rows.map((row, idx) => {
                    const style = EFFICIENCY_STYLE[row.efficiency];
                    return (
                        <div key={row.id} className="bg-[#0A0A0A] border border-white/8 rounded-lg p-5 font-mono space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-[10px] text-[#4A4A4A] shrink-0">#{idx + 1}</span>
                                    <p className="text-[11px] font-black text-[#F5F5F5] uppercase truncate tracking-tight">{row.name}</p>
                                </div>
                                <span className={`text-[8px] px-2 py-0.5 rounded border uppercase font-black tracking-widest shrink-0 ${style.bg}`} style={{ color: style.color }}>
                                    {style.label}
                                </span>
                            </div>

                            <DoubleBar shapley={row.shapleyCredit} spend={row.spendShare} />

                            <div className="flex items-center gap-6 text-[8px] text-[#4A4A4A] uppercase tracking-widest pt-1 border-t border-white/5">
                                <span>SPEND: R${row.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                {row.roas > 0 && <span>ROAS: {row.roas.toFixed(2)}×</span>}
                                {row.convValue > 0 && <span>CONV_VALUE: R${row.convValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
