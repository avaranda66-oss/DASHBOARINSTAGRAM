'use client';

// =============================================================================
// ads-intelligence-summary.tsx — HUD de Resumo Executivo de Inteligência
//
// Story: US-86 — Intelligence Daily Summary
// Exibe: alertas críticos, ação prioritária do dia, overview em formato HUD
// =============================================================================

import type { ActionableInsight } from '@/lib/utils/insight-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
    insights: ActionableInsight[];
    fatigueCount: number;
    saturationCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_ACTION_COLOR: Record<ActionableInsight['urgency'], string> = {
    critical:    '#EF4444',
    warning:     '#FBBF24',
    opportunity: '#A3E635',
    info:        'rgba(255,255,255,0.2)',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdsIntelligenceSummary({ insights, fatigueCount, saturationCount }: Props) {
    const criticalCount = insights.filter(i => i.urgency === 'critical').length;
    const warningCount  = insights.filter(i => i.urgency === 'warning').length;
    const oppCount      = insights.filter(i => i.urgency === 'opportunity').length;

    const top = insights.length > 0
        ? [...insights].sort((a, b) => b.priorityScore - a.priorityScore)[0]
        : null;

    void warningCount; // usado implicitamente via criticalCount e badges

    return (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg font-mono text-xs overflow-hidden">
            {/* Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <span className="text-[#A3E635] text-[11px]">◆</span>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A3E635]">
                    INTEL_SUMMARY_v3
                </span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Empty state ─────────────────────────────────────────────────── */}
            {insights.length === 0 ? (
                <div className="px-4 py-6 text-[10px] text-[#4A4A4A] uppercase tracking-widest">
                    Nenhum insight detectado no período selecionado.
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {/* Counter badges ──────────────────────────────────────── */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {criticalCount > 0 && (
                            <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30">
                                {criticalCount} CRÍTICOS
                            </span>
                        )}
                        {fatigueCount > 0 && (
                            <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30">
                                {fatigueCount} EM FADIGA
                            </span>
                        )}
                        {saturationCount > 0 && (
                            <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#FB923C]/10 text-[#FB923C] border-[#FB923C]/30">
                                {saturationCount} SATURAÇÃO
                            </span>
                        )}
                        {oppCount > 0 && (
                            <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/30">
                                {oppCount} OPORTUNIDADES
                            </span>
                        )}
                    </div>

                    {/* Top priority action ─────────────────────────────────── */}
                    {top && (
                        <div className="space-y-3 pt-1 border-t border-white/5">
                            {/* Label */}
                            <div className="flex items-center gap-2">
                                <span className="text-[#A3E635] text-[10px]">▲</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3E635]">
                                    AÇÃO_PRIORITÁRIA
                                </span>
                            </div>

                            {/* Problem */}
                            <p className="text-white font-bold text-[11px] leading-relaxed">
                                {top.problem}
                            </p>

                            {/* Diagnosis */}
                            <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
                                <span className="text-[#4A4A4A] uppercase tracking-widest mr-1">
                                    DIAGNÓSTICO:
                                </span>
                                {top.diagnosis}
                            </p>

                            {/* Action — colored left border */}
                            <div
                                className="pl-3 border-l-2"
                                style={{ borderColor: URGENCY_ACTION_COLOR[top.urgency] }}
                            >
                                <span
                                    className="text-[8px] uppercase tracking-widest font-black mr-1"
                                    style={{ color: URGENCY_ACTION_COLOR[top.urgency] }}
                                >
                                    AÇÃO:
                                </span>
                                <span className="text-[9px] text-[#D4D4D4] leading-relaxed">
                                    {top.action}
                                </span>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end">
                                <span className="text-[8px] text-[#8A8A8A] uppercase tracking-widest">
                                    SCORE {top.priorityScore.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
