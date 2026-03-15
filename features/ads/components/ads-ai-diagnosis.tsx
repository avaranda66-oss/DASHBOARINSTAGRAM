'use client';

import { useState } from 'react';
import { useAdsStore } from '@/stores';
import { cn } from '@/design-system/utils/cn';
import type { AdCampaign } from '@/types/ads';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scorecard {
    campaign_id: string;
    name: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    diagnosis: string;
    alerts: string[];
}

interface PriorityAction {
    action: string;
    impact: 'high' | 'medium' | 'low';
    campaign_id?: string;
}

interface DiagnosisResult {
    executive_summary: string[];
    scorecards: Scorecard[];
    priority_actions: PriorityAction[];
}

type DiagnosisStatus = 'idle' | 'loading' | 'result' | 'error';

interface Props {
    campaigns: AdCampaign[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
    A: '#A3E635',
    B: '#86efac',
    C: '#FBBF24',
    D: '#f97316',
    F: '#EF4444',
};

const GRADE_BG: Record<string, string> = {
    A: 'bg-[#A3E635]/10 border-[#A3E635]/30',
    B: 'bg-green-400/10 border-green-400/30',
    C: 'bg-[#FBBF24]/10 border-[#FBBF24]/30',
    D: 'bg-orange-500/10 border-orange-500/30',
    F: 'bg-[#EF4444]/10 border-[#EF4444]/30',
};

const IMPACT_COLOR: Record<string, string> = {
    high: '#EF4444',
    medium: '#FBBF24',
    low: '#A3E635',
};

const IMPACT_BG: Record<string, string> = {
    high: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
    medium: 'bg-[#FBBF24]/10 border-[#FBBF24]/30 text-[#FBBF24]',
    low: 'bg-[#A3E635]/10 border-[#A3E635]/30 text-[#A3E635]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdsAiDiagnosis({ campaigns }: Props) {
    const { kpiSummary, filters } = useAdsStore();
    const [status, setStatus] = useState<DiagnosisStatus>('idle');
    const [result, setResult] = useState<DiagnosisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    async function runDiagnosis() {
        setStatus('loading');
        setResult(null);
        setErrorMsg('');

        try {
            const res = await fetch('/api/ads-ai-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: kpiSummary ? 'current' : '',
                    campaigns,
                    kpi: kpiSummary,
                    datePreset: filters.datePreset,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            setResult(data.diagnosis as DiagnosisResult);
            setStatus('result');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
            setErrorMsg(msg);
            setStatus('error');
        }
    }

    function reset() {
        setStatus('idle');
        setResult(null);
        setErrorMsg('');
    }

    // ── Idle state ────────────────────────────────────────────────────────────
    if (status === 'idle') {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] font-mono text-[10px]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5] font-mono">
                        LLM_Campaign_Diagnosis
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                </div>

                <div className="bg-[#0A0A0A] border border-white/8 rounded-lg p-6 flex items-center justify-between font-mono">
                    <div className="space-y-1">
                        <p className="text-[11px] text-[#F5F5F5] font-bold uppercase tracking-wider">
                            Diagnóstico inteligente por IA
                        </p>
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">
                            {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''} · {filters.datePreset}
                        </p>
                    </div>
                    <button
                        onClick={runDiagnosis}
                        className="flex items-center gap-2 px-5 py-2.5 border border-[#A3E635]/40 text-[#A3E635] text-[10px] font-bold uppercase tracking-widest hover:bg-[#A3E635]/10 transition-all"
                    >
                        <span>◈</span> DIAGNÓSTICO IA
                    </button>
                </div>
            </section>
        );
    }

    // ── Loading state ─────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] font-mono text-[10px]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5] font-mono">
                        LLM_Campaign_Diagnosis
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                </div>

                <div className="bg-[#0A0A0A] border border-[#A3E635]/20 rounded-lg p-10 flex items-center justify-center font-mono">
                    <span
                        className="text-[13px] font-bold tracking-[0.3em] uppercase"
                        style={{
                            color: '#A3E635',
                            animation: 'pulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
                        }}
                    >
                        ◈ analisando campanhas...
                    </span>
                </div>
            </section>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (status === 'error') {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[#EF4444] font-mono text-[10px]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5] font-mono">
                        LLM_Campaign_Diagnosis
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                </div>

                <div className="bg-[#0A0A0A] border border-[#EF4444]/30 rounded-lg p-6 flex items-center justify-between font-mono">
                    <p className="text-[11px] text-[#EF4444] font-bold uppercase tracking-wider">
                        ◈ ERRO — {errorMsg}
                    </p>
                    <button
                        onClick={reset}
                        className="text-[9px] text-[#4A4A4A] hover:text-[#F5F5F5] uppercase tracking-widest transition-colors"
                    >
                        ✕ fechar
                    </button>
                </div>
            </section>
        );
    }

    // ── Result state ──────────────────────────────────────────────────────────
    if (status === 'result' && result) {
        return (
            <section className="space-y-6 font-mono">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] text-[10px]">◈</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                        LLM_Campaign_Diagnosis
                    </h3>
                    <span className="h-px flex-1 bg-white/5" />
                    <button
                        onClick={reset}
                        className="text-[9px] text-[#4A4A4A] hover:text-[#F5F5F5] uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                        ✕ fechar
                    </button>
                </div>

                {/* Executive Summary */}
                {result.executive_summary?.length > 0 && (
                    <div className="bg-[#0A0A0A] border border-white/8 rounded-lg overflow-hidden">
                        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#4A4A4A]">
                                EXECUTIVE_SUMMARY
                            </span>
                        </div>
                        <ul className="p-6 space-y-3">
                            {result.executive_summary.map((bullet, i) => (
                                <li key={i} className="flex gap-3 text-[11px] text-[#D4D4D4]">
                                    <span
                                        className="w-0.5 shrink-0 rounded-full mt-0.5 self-stretch"
                                        style={{ backgroundColor: '#A3E635', minHeight: '14px' }}
                                    />
                                    <span className="leading-relaxed">{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Scorecards */}
                {result.scorecards?.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#4A4A4A]">
                            CAMPAIGN_SCORECARDS
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {result.scorecards.map((sc) => (
                                <div
                                    key={sc.campaign_id}
                                    className="bg-[#0A0A0A] border border-white/8 rounded-lg p-5 space-y-3 hover:border-white/15 transition-all"
                                >
                                    {/* Grade + name */}
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={cn(
                                                'w-10 h-10 flex items-center justify-center text-lg font-black border shrink-0',
                                                GRADE_BG[sc.grade] ?? 'bg-white/5 border-white/10'
                                            )}
                                            style={{ color: GRADE_COLOR[sc.grade] ?? '#F5F5F5' }}
                                        >
                                            {sc.grade}
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-[10px] font-bold text-[#F5F5F5] uppercase leading-tight truncate"
                                                title={sc.name}
                                            >
                                                {sc.name}
                                            </p>
                                            <p className="text-[9px] text-[#8A8A8A] mt-1 leading-relaxed">
                                                {sc.diagnosis}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Alerts */}
                                    {sc.alerts?.length > 0 && (
                                        <ul className="space-y-1.5 border-t border-white/5 pt-3">
                                            {sc.alerts.map((alert, i) => (
                                                <li key={i} className="flex gap-2 text-[9px] text-[#FBBF24]">
                                                    <span className="shrink-0">▲</span>
                                                    <span className="leading-tight">{alert}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Priority Actions */}
                {result.priority_actions?.length > 0 && (
                    <div className="bg-[#0A0A0A] border border-white/8 rounded-lg overflow-hidden">
                        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#4A4A4A]">
                                PRIORITY_ACTIONS
                            </span>
                        </div>
                        <ul className="p-4 space-y-2">
                            {result.priority_actions.map((action, i) => (
                                <li key={i} className="flex items-start gap-3 p-3 hover:bg-white/[0.02] transition-colors">
                                    <span
                                        className={cn(
                                            'text-[8px] font-black uppercase tracking-widest px-2 py-1 border shrink-0',
                                            IMPACT_BG[action.impact] ?? 'bg-white/5 border-white/10 text-[#4A4A4A]'
                                        )}
                                    >
                                        {action.impact}
                                    </span>
                                    <span className="text-[11px] text-[#D4D4D4] leading-relaxed flex-1">
                                        {action.action}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        );
    }

    return null;
}
