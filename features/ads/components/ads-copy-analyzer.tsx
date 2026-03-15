'use client';

import { useState } from 'react';
import { foggBehaviorScore } from '@/lib/utils/causal-behavioral';
import type { FoggBehaviorScore } from '@/lib/utils/causal-behavioral';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

function ResultBadge({ score }: { score: number }) {
    if (score >= 75) return (
        <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full border"
            style={{ color: '#A3E635', borderColor: 'rgba(163,230,53,0.3)', backgroundColor: 'rgba(163,230,53,0.06)' }}>
            ● FORTE
        </span>
    );
    if (score >= 50) return (
        <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full border"
            style={{ color: '#FBBF24', borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.06)' }}>
            ● MÉDIO
        </span>
    );
    return (
        <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full border"
            style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
        ● FRACO
        </span>
    );
}

const DIMENSION_CONFIG = {
    motivation: {
        label: 'Motivação (M)',
        description: 'Força emocional e benefício claro',
        max: 33,
        color: '#A3E635',
        tips: {
            low: 'Adicione palavras de desejo e benefício concreto. Ex: "transforme", "conquiste", "imagine".',
            mid: 'Reforce o benefício principal com mais especificidade ou prova social.',
            high: 'Motivação forte. Mantenha.',
        },
    },
    ability: {
        label: 'Habilidade (A)',
        description: 'Simplicidade e baixo atrito',
        max: 33,
        color: '#60A5FA',
        tips: {
            low: 'Copy muito longa ou sem CTA claro. Use frases curtas e um chamado explícito ("clique", "acesse").',
            mid: 'Considere encurtar o texto ou tornar o CTA mais direto.',
            high: 'Formato e clareza adequados.',
        },
    },
    prompt: {
        label: 'Trigger (P)',
        description: 'Urgência e CTA',
        max: 34,
        color: '#FBBF24',
        tips: {
            low: 'Sem gatilho de urgência ou autoridade. Adicione escassez, prazo ou dado de prova ("97% aprovam").',
            mid: 'Urgência presente mas fraca. Seja mais específico com o limitador.',
            high: 'Gatilhos bem posicionados.',
        },
    },
} as const;

function dimensionTip(key: keyof typeof DIMENSION_CONFIG, value: number): string {
    const cfg = DIMENSION_CONFIG[key];
    const pct = value / cfg.max;
    if (pct < 0.4) return cfg.tips.low;
    if (pct < 0.75) return cfg.tips.mid;
    return cfg.tips.high;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdsCopyAnalyzer() {
    const [text, setText] = useState('');
    const [result, setResult] = useState<FoggBehaviorScore | null>(null);

    const handleAnalyze = () => {
        if (!text.trim()) return;
        const score = foggBehaviorScore({
            caption: text.trim(),
            contentType: 'post',
        });
        setResult(score);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAnalyze();
    };

    return (
        <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-mono text-xs tracking-widest uppercase text-[#F5F5F5] font-bold">
                        ◈ ANALISADOR DE COPY
                    </h3>
                    <p className="text-[10px] text-[#4A4A4A] font-mono mt-0.5">
                        Fogg Behavior Model — M × A × P
                    </p>
                </div>
                {result && <ResultBadge score={result.totalScore} />}
            </div>

            {/* Textarea */}
            <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setResult(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Cole o texto do anúncio aqui..."
                rows={5}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-[#F5F5F5] placeholder-[#4A4A4A] resize-none focus:outline-none focus:border-white/20 transition-colors"
            />

            {/* Analyze button */}
            <button
                onClick={handleAnalyze}
                disabled={!text.trim()}
                className="w-full py-2 rounded-lg font-mono text-[11px] tracking-widest uppercase font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                    backgroundColor: text.trim() ? 'rgba(163,230,53,0.1)' : undefined,
                    color: '#A3E635',
                    border: '1px solid rgba(163,230,53,0.2)',
                }}
            >
                ◈ ANALISAR COPY
                <span className="ml-2 opacity-40 normal-case font-normal text-[9px]">Ctrl+Enter</span>
            </button>

            {/* Results */}
            {result && (
                <div className="space-y-4 pt-1">
                    {/* Score total */}
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-3xl font-bold" style={{ color: result.totalScore >= 75 ? '#A3E635' : result.totalScore >= 50 ? '#FBBF24' : '#EF4444' }}>
                            {result.totalScore}
                        </span>
                        <div>
                            <div className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-widest">Score total</div>
                            <div className="font-mono text-[9px] text-[#4A4A4A]">/ 100 pontos</div>
                        </div>
                    </div>

                    {/* Dimensões */}
                    <div className="space-y-3">
                        {(Object.keys(DIMENSION_CONFIG) as Array<keyof typeof DIMENSION_CONFIG>).map((key) => {
                            const cfg = DIMENSION_CONFIG[key];
                            const value = result[key];
                            const tip = dimensionTip(key, value);
                            const isWeakest = result.topOpportunity === key;

                            return (
                                <div key={key} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] text-[#F5F5F5] font-bold">{cfg.label}</span>
                                            {isWeakest && (
                                                <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded"
                                                    style={{ color: '#FBBF24', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                    ▲ OPORTUNIDADE
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono text-[10px]" style={{ color: cfg.color }}>
                                            {value}<span className="text-[#4A4A4A">/{cfg.max}</span>
                                        </span>
                                    </div>
                                    <ScoreBar value={value} max={cfg.max} color={cfg.color} />
                                    <p className="font-mono text-[9px] text-[#4A4A4A] leading-relaxed">{cfg.description} — {tip}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Disclaimer */}
                    <div className="pt-1 border-t border-white/5">
                        <p className="font-mono text-[9px] text-[#4A4A4A] leading-relaxed">
                            ◗ EXPERIMENTAL — baseado no Fogg Behavior Model (Stanford).
                            Não validado empiricamente para Meta Ads. Use como guia, não como verdade.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
