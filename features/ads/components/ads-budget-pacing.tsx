'use client';

import { useMemo } from 'react';
import type { AdCampaign } from '@/types/ads';
import { calculateAllPacingAlerts } from '@/lib/utils/budget-pacing';
import type { BudgetPacingAlert, PacingStatus } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Constants ───────────────────────────────────────────────────────────────

const GLYPHS = {
    GAUGE: '◎',
    ALERT: '▲',
    CHECK: '◆',
    MONEY: '◈',
    CLOCK: '◷',
};

const STATUS_CONFIG: Record<PacingStatus, { label: string; color: string; bg: string }> = {
    on_track: { label: 'ON_TRACK', color: '#A3E635', bg: 'bg-[#A3E635]/10 border-[#A3E635]/20 text-[#A3E635]' },
    overspending: { label: 'OVERSPEND', color: '#EF4444', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' },
    underspending: { label: 'UNDERSPEND', color: '#FBBF24', bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]' },
    exhausted: { label: 'EXHAUSTED', color: '#EF4444', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
    currency?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number, cur = 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur }).format(v);
}

function PacingBar({ pct, expected, color }: { pct: number; expected: number; color: string }) {
    const clampedPct = Math.min(pct, 100);
    const clampedExpected = Math.min(expected, 100);
    return (
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            {/* Expected marker */}
            <div
                className="absolute top-0 h-full w-px bg-white/20 z-10"
                style={{ left: `${clampedExpected}%` }}
                title={`Esperado: ${expected.toFixed(0)}%`}
            />
            {/* Actual progress */}
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${clampedPct}%`, backgroundColor: color }}
            />
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdsBudgetPacing({ campaigns, currency = 'BRL' }: Props) {
    const alerts = useMemo(() => calculateAllPacingAlerts(campaigns), [campaigns]);

    // Contadores
    const counts = useMemo(() => {
        const c = { on_track: 0, overspending: 0, underspending: 0, exhausted: 0 };
        for (const a of alerts) c[a.status]++;
        return c;
    }, [alerts]);

    if (alerts.length === 0) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] font-mono text-[10px]">{GLYPHS.GAUGE}</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Budget_Pacing_Monitor</h3>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-12 flex flex-col items-center justify-center gap-3 font-mono text-center opacity-40">
                    <span className="text-2xl text-[#4A4A4A]">{GLYPHS.GAUGE}</span>
                    <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">
                        Nenhuma campanha com budget configurado
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-[#A3E635] font-mono text-[10px]">{GLYPHS.GAUGE}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Budget_Pacing_Monitor</h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">[{alerts.length}_CAMPAIGNS]</span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Summary strip */}
            <div className="flex gap-3 font-mono">
                {([
                    { key: 'on_track' as const, label: 'ON_TRACK', glyph: GLYPHS.CHECK },
                    { key: 'overspending' as const, label: 'OVER', glyph: GLYPHS.ALERT },
                    { key: 'underspending' as const, label: 'UNDER', glyph: GLYPHS.MONEY },
                    { key: 'exhausted' as const, label: 'EXHST', glyph: GLYPHS.ALERT },
                ]).map(s => (
                    <div
                        key={s.key}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] uppercase tracking-widest font-bold",
                            counts[s.key] > 0 ? STATUS_CONFIG[s.key].bg : "bg-white/[0.02] border-white/5 text-[#4A4A4A]"
                        )}
                    >
                        <span>{s.glyph}</span>
                        <span>{counts[s.key]}</span>
                    </div>
                ))}
            </div>

            {/* Alert cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {alerts.map(alert => {
                    const cfg = STATUS_CONFIG[alert.status];
                    return (
                        <div
                            key={alert.campaignId}
                            className="bg-[#0A0A0A] border border-white/10 rounded-lg p-5 space-y-4 font-mono hover:border-white/20 transition-all"
                        >
                            {/* Campaign name + badge */}
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] font-bold text-[#F5F5F5] truncate uppercase tracking-tight flex-1" title={alert.campaignName}>
                                    {alert.campaignName}
                                </p>
                                <span className={cn("text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-black shrink-0", cfg.bg)}>
                                    {cfg.label}
                                </span>
                            </div>

                            {/* Pacing bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                                    <span>UTILIZAÇÃO</span>
                                    <span style={{ color: cfg.color }}>{alert.utilizationPct.toFixed(0)}%</span>
                                </div>
                                <PacingBar pct={alert.utilizationPct} expected={alert.expectedUtilizationPct} color={cfg.color} />
                                <div className="flex justify-between text-[8px] text-[#4A4A4A]">
                                    <span>Esperado: {alert.expectedUtilizationPct.toFixed(0)}%</span>
                                    <span>Ratio: {alert.pacingRatio.toFixed(2)}x</span>
                                </div>
                            </div>

                            {/* Metrics grid */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                <div>
                                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block">Budget Total</span>
                                    <span className="text-[11px] text-[#F5F5F5] font-bold">{formatCurrency(alert.budgetTotal, currency)}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block">Restante</span>
                                    <span className="text-[11px] font-bold" style={{ color: alert.budgetRemaining > 0 ? '#F5F5F5' : '#EF4444' }}>
                                        {formatCurrency(alert.budgetRemaining, currency)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block">Gasto/Dia</span>
                                    <span className="text-[11px] text-[#F5F5F5] font-bold">{formatCurrency(alert.avgDailySpend, currency)}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block">Esgota em</span>
                                    <span className="text-[11px] font-bold" style={{ color: alert.daysUntilExhaustion !== null && alert.daysUntilExhaustion < 3 ? '#EF4444' : '#F5F5F5' }}>
                                        {alert.daysUntilExhaustion !== null ? `~${Math.ceil(alert.daysUntilExhaustion)}d` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Message */}
                            <p className="text-[10px] text-[#8A8A8A] italic uppercase leading-tight pt-2 border-t border-white/5">
                                {alert.message}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
