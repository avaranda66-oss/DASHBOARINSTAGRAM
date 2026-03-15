'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/design-system/utils/cn';
import { motion } from 'framer-motion';
import type { AdsDatePreset } from '@/types/ads';

// ─── US-60 — Scheduled Reports UI ────────────────────────────────────────────

type ReportFrequency = 'daily' | 'weekly' | 'monthly';

interface ScheduleConfig {
    email: string;
    frequency: ReportFrequency;
    accountId: string;
    accountName?: string;
    token: string;
    enabled: boolean;
    nextSendAt: string;
    datePreset?: AdsDatePreset;
}

interface Props {
    token: string;
    accountId: string;
    accountName?: string;
    datePreset?: AdsDatePreset;
}

const FREQUENCIES: { value: ReportFrequency; label: string; desc: string }[] = [
    { value: 'daily', label: 'DIÁRIO', desc: 'Todos os dias às 08:00' },
    { value: 'weekly', label: 'SEMANAL', desc: 'Segunda-feira às 08:00' },
    { value: 'monthly', label: 'MENSAL', desc: 'Dia 1 de cada mês às 08:00' },
];

export function AdsScheduledReports({ token, accountId, accountName, datePreset }: Props) {
    const [email, setEmail] = useState('');
    const [frequency, setFrequency] = useState<ReportFrequency>('weekly');
    const [enabled, setEnabled] = useState(false);
    const [nextSendAt, setNextSendAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [hasSchedule, setHasSchedule] = useState(false);

    // Carregar config existente
    useEffect(() => {
        fetch('/api/reports/schedule')
            .then(r => r.json())
            .then(data => {
                if (data.schedule) {
                    const s: ScheduleConfig = data.schedule;
                    setEmail(s.email);
                    setFrequency(s.frequency);
                    setEnabled(s.enabled);
                    setNextSendAt(s.nextSendAt);
                    setHasSchedule(true);
                }
            })
            .catch(() => {});
    }, []);

    // Salvar agendamento
    const handleSave = useCallback(async () => {
        if (!email || !email.includes('@')) {
            toast.error('Informe um email válido');
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/reports/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    frequency,
                    accountId,
                    accountName,
                    token,
                    enabled,
                    datePreset,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setNextSendAt(data.schedule.nextSendAt);
            setHasSchedule(true);
            toast.success(data.message || 'Agendamento salvo');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, [email, frequency, accountId, accountName, token, enabled, datePreset]);

    // Enviar agora (teste)
    const handleSendNow = useCallback(async () => {
        if (!email || !email.includes('@')) {
            toast.error('Informe um email válido');
            return;
        }
        setIsSending(true);
        try {
            const res = await fetch('/api/reports/send-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    token,
                    accountId,
                    accountName,
                    datePreset: datePreset || 'last_30d',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message);
            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar';
            toast.error(msg);
        } finally {
            setIsSending(false);
        }
    }, [email, token, accountId, accountName, datePreset]);

    const formatNextSend = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return iso;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] border rounded-[8px] p-6"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#A3E635] tracking-[0.2em]">[REPORT_SCHEDULER]</span>
                        {hasSchedule && enabled && (
                            <span className="px-2 py-0.5 rounded-full font-mono text-[8px] tracking-widest bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/20">
                                ATIVO
                            </span>
                        )}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#F5F5F5] mt-1 tracking-tight">
                        Relatórios Agendados
                    </h3>
                </div>
                {/* Toggle */}
                <button
                    onClick={() => setEnabled(!enabled)}
                    className={cn(
                        "w-11 h-6 rounded-full transition-all relative",
                        enabled ? "bg-[#A3E635]" : "bg-[#2A2A2A]"
                    )}
                >
                    <span
                        className={cn(
                            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
                            enabled ? "left-[22px]" : "left-0.5"
                        )}
                    />
                </button>
            </div>

            {/* Email */}
            <div className="space-y-4">
                <div>
                    <label className="font-mono text-[9px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-2">
                        Email Destinatário
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-transparent border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-white outline-none focus:border-[#A3E635] placeholder:text-[#2A2A2A] transition-colors"
                    />
                </div>

                {/* Frequency */}
                <div>
                    <label className="font-mono text-[9px] text-[#4A4A4A] tracking-[0.2em] uppercase block mb-2">
                        Frequência
                    </label>
                    <div className="flex gap-2">
                        {FREQUENCIES.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFrequency(f.value)}
                                className={cn(
                                    "flex-1 px-3 py-2 rounded font-mono text-[10px] uppercase tracking-widest border transition-all text-center",
                                    frequency === f.value
                                        ? "bg-[#A3E635] text-black border-[#A3E635]"
                                        : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/10"
                                )}
                                title={f.desc}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <p className="font-mono text-[9px] text-[#2A2A2A] mt-1">
                        {FREQUENCIES.find(f => f.value === frequency)?.desc}
                    </p>
                </div>

                {/* Next send info */}
                {hasSchedule && nextSendAt && enabled && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded bg-[#A3E635]/5 border border-[#A3E635]/10">
                        <span className="text-[#A3E635] font-mono text-[10px]">▸</span>
                        <span className="font-mono text-[10px] text-[#4A4A4A]">
                            Próximo envio: <span className="text-[#F5F5F5]">{formatNextSend(nextSendAt)}</span>
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !email}
                        className={cn(
                            "flex-1 px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest transition-all",
                            "bg-[#A3E635] text-black hover:bg-[#A3E635]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                        )}
                    >
                        {isLoading ? '◎ SALVANDO...' : '▲ SALVAR_AGENDAMENTO'}
                    </button>
                    <button
                        onClick={handleSendNow}
                        disabled={isSending || !email}
                        className={cn(
                            "px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest border transition-all",
                            "border-white/10 text-[#4A4A4A] hover:border-[#A3E635] hover:text-[#A3E635] disabled:opacity-40 disabled:cursor-not-allowed"
                        )}
                    >
                        {isSending ? '◎ ENVIANDO...' : '◆ ENVIAR_AGORA'}
                    </button>
                </div>

                {/* Gmail config hint */}
                <p className="font-mono text-[9px] text-[#2A2A2A] leading-relaxed">
                    Requer GMAIL_USER e GMAIL_APP_PASS no .env — Gmail com App Password (verificação em 2 etapas).
                </p>
            </div>
        </motion.div>
    );
}
