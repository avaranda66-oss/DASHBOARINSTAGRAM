'use client';

// =============================================================================
// ads-alert-history.tsx — Histórico dos Últimos Alertas Disparados
// US: predictive-alert-loop
//
// Persiste até 50 registros em localStorage.
// Integrado em ads-intelligence-panel-v2.tsx
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import type { AlertCondition, AlertSeverity } from '@/lib/services/alert-engine.service';
import { cn } from '@/design-system/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertHistoryEntry {
    id: string;
    timestamp: string;
    type: AlertCondition['type'];
    severity: AlertSeverity;
    message: string;
    metric: string;
    currentValue: number;
    threshold: number;
    emailSent: boolean;
    campaignId?: string;
    adId?: string;
}

const STORAGE_KEY = 'ads_alert_history';
const MAX_ENTRIES = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function appendAlertHistory(
    newAlerts: AlertCondition[],
    emailSent: boolean,
): void {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const existing: AlertHistoryEntry[] = raw ? JSON.parse(raw) : [];
        const timestamp = new Date().toISOString();

        const entries: AlertHistoryEntry[] = newAlerts.map((a, i) => ({
            id: `${Date.now()}-${i}`,
            timestamp,
            type: a.type,
            severity: a.severity,
            message: a.message,
            metric: a.metric,
            currentValue: a.currentValue,
            threshold: a.threshold,
            emailSent,
            campaignId: a.campaignId,
            adId: a.adId,
        }));

        const merged = [...entries, ...existing].slice(0, MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
        // localStorage não disponível — silencioso
    }
}

function loadHistory(): AlertHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function clearHistory(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // silencioso
    }
}

// ─── Severity Config ──────────────────────────────────────────────────────────

const SEV_CFG: Record<AlertSeverity, { color: string; bg: string; label: string; glyph: string }> = {
    critical: { color: '#EF4444', bg: 'bg-[#EF4444]/10 border-[#EF4444]/20', label: 'CRITICAL', glyph: '▲' },
    warning:  { color: '#FBBF24', bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/20', label: 'WARNING',  glyph: '◆' },
    info:     { color: '#A3E635', bg: 'bg-[#A3E635]/10 border-[#A3E635]/20', label: 'INFO',     glyph: '◎' },
};

const TYPE_LABELS: Record<AlertCondition['type'], string> = {
    creative_fatigue:    'CREATIVE_FATIGUE',
    survival_warning:    'SURVIVAL_WARN',
    budget_exhaustion:   'BUDGET_EXHAUST',
    frequency_saturation:'FREQ_SATURATION',
};

function formatTs(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdsAlertHistory() {
    const [entries, setEntries] = useState<AlertHistoryEntry[]>([]);
    const [mounted, setMounted] = useState(false);

    const refresh = useCallback(() => {
        setEntries(loadHistory());
    }, []);

    useEffect(() => {
        setMounted(true);
        refresh();
    }, [refresh]);

    if (!mounted) return null;

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#EF4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]">▲</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5] font-mono">
                        Alert_History
                    </h3>
                    <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">
                        [{entries.length}_ENTRIES · MAX_50]
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="text-[9px] font-mono text-[#4A4A4A] hover:text-[#F5F5F5] uppercase tracking-widest transition-colors px-2 py-1 border border-white/5 hover:border-white/10"
                    >
                        ↺ REFRESH
                    </button>
                    {entries.length > 0 && (
                        <button
                            onClick={() => { clearHistory(); setEntries([]); }}
                            className="text-[9px] font-mono text-[#4A4A4A] hover:text-[#EF4444] uppercase tracking-widest transition-colors px-2 py-1 border border-white/5 hover:border-[#EF4444]/20"
                        >
                            ✕ CLEAR
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {entries.length === 0 ? (
                <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-8 flex flex-col items-center justify-center gap-3 font-mono opacity-40">
                    <span className="text-2xl text-[#4A4A4A]">◎</span>
                    <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">
                        Nenhum alerta registrado
                    </p>
                </div>
            ) : (
                <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.03] text-[8px] uppercase tracking-[0.2em] text-[#4A4A4A] border-b border-white/5">
                                    <th className="px-4 py-3 font-bold">Timestamp</th>
                                    <th className="px-4 py-3 font-bold">Tipo</th>
                                    <th className="px-4 py-3 font-bold">Severidade</th>
                                    <th className="px-4 py-3 font-bold">Mensagem</th>
                                    <th className="px-4 py-3 text-center font-bold">Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => {
                                    const sev = SEV_CFG[entry.severity] ?? SEV_CFG.info;
                                    return (
                                        <tr
                                            key={entry.id}
                                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-4 py-3 text-[9px] text-[#4A4A4A] whitespace-nowrap">
                                                {formatTs(entry.timestamp)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[8px] text-[#8A8A8A] uppercase tracking-widest">
                                                    {TYPE_LABELS[entry.type] ?? entry.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        'text-[8px] px-1.5 py-0.5 border uppercase tracking-widest font-black',
                                                        sev.bg,
                                                    )}
                                                    style={{ color: sev.color }}
                                                >
                                                    {sev.glyph} {sev.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[10px] text-[#F5F5F5] max-w-[360px]">
                                                <span className="line-clamp-2">{entry.message}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={cn(
                                                        'text-[8px] px-1.5 py-0.5 border uppercase tracking-widest font-black',
                                                        entry.emailSent
                                                            ? 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20'
                                                            : 'bg-white/5 text-[#4A4A4A] border-white/10',
                                                    )}
                                                >
                                                    {entry.emailSent ? '✓ ENVIADO' : '— PENDENTE'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[8px] text-[#3A3A3A] uppercase tracking-[0.3em]">
                        <span>STORAGE: LOCALSTORAGE · MAX_50</span>
                        <span>PRED_ALERT_LOOP_v1</span>
                    </div>
                </div>
            )}
        </section>
    );
}
