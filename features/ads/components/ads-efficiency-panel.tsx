'use client';

// =============================================================================
// ads-efficiency-panel.tsx — Painel de Eficiência: Retornos Decrescentes
//
// Story: US-53 — Ads Efficiency Panel: Elasticidade + Diminishing Returns
// Usa: diminishingReturns + advertisingElasticity de advanced-indicators.ts
//
// Dados: AdCampaign[] com insights (spend, ROAS) — cada campanha = 1 ponto de dados
// Modelo: Michaelis-Menten (Lineweaver-Burk) para curva spend × resultado
//
// Design: bg-[#0A0A0A], font-mono, verde #A3E635, ZERO Lucide
// =============================================================================

import { useMemo } from 'react';
import { diminishingReturns, advertisingElasticity } from '@/lib/utils/advanced-indicators';
import type { AdCampaign } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
    currency?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCampaignMetrics(campaigns: AdCampaign[]): {
    spend: number[];
    roas: number[];
    revenue: number[];
    names: string[];
} {
    const spend: number[] = [];
    const roas: number[] = [];
    const revenue: number[] = [];
    const names: string[] = [];

    for (const c of campaigns) {
        if (!c.insights) continue;
        const s = parseFloat(c.insights.spend) || 0;
        const roasRaw = c.insights.purchase_roas?.[0]?.value;
        const r = roasRaw ? parseFloat(roasRaw) : 0;
        if (s > 0 && r > 0) {
            spend.push(s);
            roas.push(r);
            revenue.push(s * r); // conversion value = spend × ROAS
            names.push(c.name);
        }
    }

    return { spend, roas, revenue, names };
}

function fmtCurrency(v: number, currency = 'BRL'): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v);
}

// ─── Saturation Bar ──────────────────────────────────────────────────────────

function SaturationBar({ pct }: { pct: number }) {
    const color =
        pct < 30 ? '#A3E635' :
        pct < 60 ? '#FBBF24' :
        pct < 80 ? '#F97316' : '#EF4444';

    const zone =
        pct < 30 ? 'CRESCIMENTO' :
        pct < 60 ? 'EFICIÊNCIA' :
        pct < 80 ? 'DECRESCENTE' : 'SATURAÇÃO';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#4A4A4A]">
                    Saturação de Spend
                </span>
                <div className="flex items-center gap-2">
                    <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                        style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
                    >
                        {zone}
                    </span>
                    <span className="font-mono text-[12px] font-black" style={{ color }}>
                        {pct.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Bar */}
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                />
                {/* Zone markers */}
                {[30, 60, 80].map(m => (
                    <div
                        key={m}
                        className="absolute top-0 h-full w-px bg-white/15"
                        style={{ left: `${m}%` }}
                    />
                ))}
            </div>

            {/* Zone labels */}
            <div className="flex font-mono text-[7px] text-[#3A3A3A] uppercase tracking-widest">
                <span style={{ width: '30%' }}>Crescimento</span>
                <span style={{ width: '30%' }}>Eficiência</span>
                <span style={{ width: '20%' }}>Decresc.</span>
                <span>Saturação</span>
            </div>
        </div>
    );
}

// ─── Campaign Scatter ─────────────────────────────────────────────────────────

function CampaignScatter({
    spendArr,
    roasArr,
    names,
    Km,
    Vmax,
}: {
    spendArr: number[];
    roasArr: number[];
    names: string[];
    Km: number;
    Vmax: number;
}) {
    if (spendArr.length === 0) return null;

    const maxSpend = Math.max(...spendArr) * 1.2;
    const maxRoas  = Math.max(...roasArr, Vmax > 0 ? Vmax : 0) * 1.1;

    // Curve points (Michaelis-Menten)
    const curvePoints: { x: number; y: number }[] = [];
    if (Km > 0 && Vmax > 0) {
        for (let i = 0; i <= 40; i++) {
            const s = (maxSpend / 40) * i;
            const r = (Vmax * s) / (Km + s);
            curvePoints.push({ x: s, y: r });
        }
    }

    const toSvgX = (v: number) => (v / maxSpend) * 100;
    const toSvgY = (v: number) => 100 - (v / maxRoas) * 100;

    const curvePath = curvePoints.length > 1
        ? curvePoints.map((p, i) =>
            `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`
          ).join(' ')
        : '';

    return (
        <div className="space-y-2">
            <p className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                Curva Michaelis-Menten — Spend × ROAS por Campanha
            </p>
            <div className="relative bg-white/[0.02] rounded-lg border border-white/5 overflow-hidden" style={{ height: 160 }}>
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid */}
                    {[25, 50, 75].map(g => (
                        <line key={g} x1={g} y1="0" x2={g} y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    ))}
                    {[25, 50, 75].map(g => (
                        <line key={g} x1="0" y1={g} x2="100" y2={g} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    ))}

                    {/* Michaelis-Menten curve */}
                    {curvePath && (
                        <path
                            d={curvePath}
                            fill="none"
                            stroke="#A3E635"
                            strokeWidth="0.8"
                            strokeOpacity="0.6"
                        />
                    )}

                    {/* Vmax line */}
                    {Vmax > 0 && (
                        <line
                            x1="0" y1={toSvgY(Vmax).toFixed(2)}
                            x2="100" y2={toSvgY(Vmax).toFixed(2)}
                            stroke="#EF4444" strokeWidth="0.5" strokeDasharray="2,2" strokeOpacity="0.5"
                        />
                    )}

                    {/* Campaign dots */}
                    {spendArr.map((s, i) => (
                        <circle
                            key={i}
                            cx={toSvgX(s).toFixed(2)}
                            cy={toSvgY(roasArr[i]).toFixed(2)}
                            r="1.5"
                            fill="#FBBF24"
                            fillOpacity="0.9"
                        >
                            <title>{names[i]}: R${s.toFixed(0)} / ROAS {roasArr[i].toFixed(2)}x</title>
                        </circle>
                    ))}
                </svg>

                {/* Axis labels */}
                <div className="absolute bottom-1 left-1 font-mono text-[6px] text-[#3A3A3A] uppercase">Spend →</div>
                <div className="absolute top-1 right-1 font-mono text-[6px] text-[#3A3A3A] uppercase">← ROAS</div>
                {Vmax > 0 && (
                    <div className="absolute right-1 font-mono text-[6px] text-[#EF4444]" style={{ top: `${toSvgY(Vmax)}%` }}>
                        Vmax
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsEfficiencyPanel({ campaigns, currency = 'BRL' }: Props) {
    const analysis = useMemo(() => {
        const { spend, roas, revenue, names } = extractCampaignMetrics(campaigns);
        if (spend.length < 3) return null;

        const dr   = diminishingReturns(spend, revenue);
        const elast = advertisingElasticity(spend, revenue);

        return { spend, roas, revenue, names, dr, elast };
    }, [campaigns]);

    if (!analysis) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#FBBF24]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                        Efficiency_Curve_Analysis
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                </div>
                <div className="py-8 flex items-center justify-center opacity-30 font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                    Mínimo de 3 campanhas com ROAS para ativar análise de saturação
                </div>
            </section>
        );
    }

    const { spend, roas, names, dr, elast } = analysis;
    const hasModel = dr.Vmax > 0 && dr.Km > 0;

    const elastColor =
        elast.elasticity < 0   ? '#EF4444' :
        elast.elasticity < 0.5 ? '#F97316' :
        elast.elasticity < 1   ? '#FBBF24' : '#A3E635';

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#FBBF24] drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">◈</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Efficiency_Curve_Analysis
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">
                    {spend.length} CAMPANHAS ANALISADAS
                </span>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Elasticidade */}
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                    <p className="text-[7px] text-[#4A4A4A] uppercase tracking-[0.3em]">Elasticidade</p>
                    <p className="text-[18px] font-black leading-tight" style={{ color: elastColor }}>
                        {elast.elasticity.toFixed(2)}
                    </p>
                    <p className="text-[7px] text-[#4A4A4A]">
                        {elast.confidence === 'high' ? '● Alta confiança' :
                         elast.confidence === 'medium' ? '◑ Média confiança' : '○ Baixa confiança'}
                    </p>
                </div>

                {/* Vmax */}
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                    <p className="text-[7px] text-[#4A4A4A] uppercase tracking-[0.3em]">Resultado Máx (Vmax)</p>
                    <p className="text-[18px] font-black leading-tight text-[#F5F5F5]">
                        {hasModel ? fmtCurrency(dr.Vmax, currency) : '—'}
                    </p>
                    <p className="text-[7px] text-[#4A4A4A]">teto teórico de resultado</p>
                </div>

                {/* Km */}
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                    <p className="text-[7px] text-[#4A4A4A] uppercase tracking-[0.3em]">Spend p/ 50% Vmax (Km)</p>
                    <p className="text-[18px] font-black leading-tight text-[#F5F5F5]">
                        {hasModel ? fmtCurrency(dr.Km, currency) : '—'}
                    </p>
                    <p className="text-[7px] text-[#4A4A4A]">ponto de meia-saturação</p>
                </div>

                {/* Eficiência atual */}
                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-4 font-mono space-y-1">
                    <p className="text-[7px] text-[#4A4A4A] uppercase tracking-[0.3em]">Eficiência Atual</p>
                    <p className="text-[18px] font-black leading-tight text-[#A3E635]">
                        {dr.currentEfficiency > 0 ? `${dr.currentEfficiency.toFixed(2)}×` : '—'}
                    </p>
                    <p className="text-[7px] text-[#4A4A4A]">resultado / spend</p>
                </div>
            </div>

            {/* Saturation bar */}
            {hasModel && <SaturationBar pct={dr.saturationPercent} />}

            {/* Scatter chart */}
            <CampaignScatter
                spendArr={spend}
                roasArr={roas}
                names={names}
                Km={dr.Km}
                Vmax={dr.Vmax > 0 ? Math.max(...roas) * 1.1 : 0} // normalize Vmax to ROAS scale
            />

            {/* Interpretation */}
            <div className="space-y-3">
                {hasModel && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-[9px]">
                        <span className="text-[#FBBF24] flex-shrink-0 mt-0.5">◈</span>
                        <p className="text-[#8A8A8A] leading-relaxed">{dr.interpretation}</p>
                    </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-[9px]">
                    <span style={{ color: elastColor }} className="flex-shrink-0 mt-0.5">◆</span>
                    <p className="text-[#8A8A8A] leading-relaxed">{elast.interpretation}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-6 text-[7px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>MODEL: Michaelis-Menten (Lineweaver-Burk)</span>
                <span>ELAST: log-log OLS</span>
                <span>MIN_CAMPAIGNS: 3</span>
            </div>
        </section>
    );
}
