'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import { Button } from '@/design-system/atoms/Button';

export interface FeedAnalysisResult {
    scores: {
        harmonia_visual: number;
        consistencia_marca: number;
        diversidade_conteudo: number;
        apelo_visual: number;
    };
    paleta_detectada: string[];
    paleta_recomendada: string[];
    posts_problematicos: { posicao: number; motivo: string }[];
    sequencia_recomendada: number[] | null;
    bio_sugerida: string;
    destaques_sugeridos: string[];
    recomendacoes: string[];
    resumo_geral: string;
}

interface Props {
    username: string;
    onAnalyze: () => Promise<void>;
    result: FeedAnalysisResult | null;
    isLoading: boolean;
    error: string | null;
    onHighlightPosts?: (indices: number[]) => void;
}

function ScoreBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
    const pct = (value / 10) * 100;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-[var(--v2-text-secondary)]">
                    <span className={`font-mono text-[10px] ${color}`}>{label === 'Harmonia Visual' ? '◎' : label === 'Consistência de Marca' ? '◎' : label === 'Diversidade de Conteúdo' ? '◎' : '◆'}</span>
                    {label}
                </span>
                <span className={`text-xs font-bold ${value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {value}/10
                </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                        value >= 7 ? 'bg-emerald-500' : value >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                />
            </div>
        </div>
    );
}

function ColorSwatch({ colors, label }: { colors: string[]; label: string }) {
    if (!colors || colors.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--v2-text-secondary)] font-medium">{label}</span>
            <div className="flex gap-1.5 flex-wrap">
                {colors.map((c, i) => (
                    <div
                        key={i}
                        className="w-7 h-7 rounded-lg border border-zinc-700 shadow-sm cursor-default"
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
            </div>
        </div>
    );
}

export function FeedAnalysisPanel({ username, onAnalyze, result, isLoading, error, onHighlightPosts }: Props) {
    const [expandedSection, setExpandedSection] = useState<string | null>('scores');

    const toggleSection = (key: string) => {
        setExpandedSection(prev => prev === key ? null : key);
    };

    const avgScore = result
        ? Math.round(
              (result.scores.harmonia_visual +
                  result.scores.consistencia_marca +
                  result.scores.diversidade_conteudo +
                  result.scores.apelo_visual) /
                  4 * 10
          ) / 10
        : 0;

    return (
        <div className="space-y-3 h-full">
            {/* Header + Analyze button */}
            <div className="rounded-xl v2-glass p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-purple-400">◎</span>
                        <span className="text-sm font-semibold text-[var(--v2-text-primary)]">
                            Análise Visual do Feed
                        </span>
                    </div>
                    {result && (
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            avgScore >= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                            avgScore >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                            {avgScore}/10
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-[var(--v2-text-tertiary)] mb-3">
                    Análise com IA multimodal do grid visual, paleta de cores, harmonia e bio de @{username}.
                </p>

                <Button
                    onClick={onAnalyze}
                    disabled={isLoading}
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {isLoading ? (
                        <><span className="mr-2 font-mono text-sm animate-spin">↻</span> Analisando feed...</>
                    ) : result ? (
                        <><span className="mr-2 font-mono text-sm">↻</span> Reanalisar Feed</>
                    ) : (
                        <><span className="mr-2 font-mono text-sm">◎</span> Analisar Feed com IA</>
                    )}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
                    <span className="font-mono text-sm text-red-400 mt-0.5 shrink-0">⊗</span>
                    <p className="text-xs text-red-300">{error}</p>
                </div>
            )}

            {/* Results */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 overflow-y-auto max-h-[480px] pr-1 scrollbar-hide"
                    >
                        {/* Summary */}
                        <div className="rounded-xl v2-glass p-3">
                            <p className="text-xs text-[var(--v2-text-primary)] leading-relaxed">
                                {result.resumo_geral}
                            </p>
                        </div>

                        {/* Scores */}
                        <CollapsibleSection
                            title="Pontuações"
                            glyph="◎"
                            sectionKey="scores"
                            expanded={expandedSection === 'scores'}
                            onToggle={toggleSection}
                        >
                            <div className="space-y-3">
                                <ScoreBar label="Harmonia Visual" value={result.scores.harmonia_visual} icon={() => null} color="text-cyan-400" />
                                <ScoreBar label="Consistência de Marca" value={result.scores.consistencia_marca} icon={() => null} color="text-orange-400" />
                                <ScoreBar label="Diversidade de Conteúdo" value={result.scores.diversidade_conteudo} icon={() => null} color="text-green-400" />
                                <ScoreBar label="Apelo Visual" value={result.scores.apelo_visual} icon={() => null} color="text-yellow-400" />
                            </div>
                        </CollapsibleSection>

                        {/* Color palette */}
                        <CollapsibleSection
                            title="Paleta de Cores"
                            glyph="◎"
                            sectionKey="palette"
                            expanded={expandedSection === 'palette'}
                            onToggle={toggleSection}
                        >
                            <div className="space-y-3">
                                <ColorSwatch colors={result.paleta_detectada} label="Detectada no Feed" />
                                <ColorSwatch colors={result.paleta_recomendada} label="Recomendada" />
                            </div>
                        </CollapsibleSection>

                        {/* Problematic posts */}
                        {result.posts_problematicos.length > 0 && (
                            <CollapsibleSection
                                title={`Posts para Ajustar (${result.posts_problematicos.length})`}
                                glyph="⚠"
                                sectionKey="problems"
                                expanded={expandedSection === 'problems'}
                                onToggle={(key) => {
                                    toggleSection(key);
                                    if (expandedSection !== key) {
                                        onHighlightPosts?.(result.posts_problematicos.map(p => p.posicao - 1));
                                    } else {
                                        onHighlightPosts?.([]);
                                    }
                                }}
                            >
                                <div className="space-y-2">
                                    {result.posts_problematicos.map((p, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                                            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 rounded px-1.5 py-0.5 shrink-0">
                                                #{p.posicao}
                                            </span>
                                            <p className="text-[11px] text-[var(--v2-text-primary)] leading-relaxed">{p.motivo}</p>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* Bio suggestion */}
                        {result.bio_sugerida && (
                            <CollapsibleSection
                                title="Bio Sugerida"
                                glyph="◎"
                                sectionKey="bio"
                                expanded={expandedSection === 'bio'}
                                onToggle={toggleSection}
                            >
                                <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                    <p className="text-xs text-[var(--v2-text-primary)] whitespace-pre-line leading-relaxed">
                                        {result.bio_sugerida}
                                    </p>
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* Highlights suggestion */}
                        {result.destaques_sugeridos.length > 0 && (
                            <CollapsibleSection
                                title="Destaques Sugeridos"
                                glyph="◆"
                                sectionKey="highlights"
                                expanded={expandedSection === 'highlights'}
                                onToggle={toggleSection}
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {result.destaques_sugeridos.map((d, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-full bg-zinc-800 text-[11px] text-[var(--v2-text-secondary)] border border-zinc-700">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* Recommendations */}
                        <CollapsibleSection
                            title={`Recomendações (${result.recomendacoes.length})`}
                            glyph="◎"
                            sectionKey="recs"
                            expanded={expandedSection === 'recs'}
                            onToggle={toggleSection}
                        >
                            <div className="space-y-2">
                                {result.recomendacoes.map((rec, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="font-mono text-[10px] text-emerald-400 mt-0.5 shrink-0">◎</span>
                                        <p className="text-[11px] text-[var(--v2-text-primary)] leading-relaxed">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleSection>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CollapsibleSection({
    title,
    glyph,
    sectionKey,
    expanded,
    onToggle,
    children,
}: {
    title: string;
    glyph: string;
    sectionKey: string;
    expanded: boolean;
    onToggle: (key: string) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl v2-glass overflow-hidden">
            <button
                onClick={() => onToggle(sectionKey)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
            >
                <span className="flex items-center gap-2 text-xs font-semibold text-[var(--v2-text-primary)]">
                    <span className="font-mono text-[10px] text-[var(--v2-accent)]">{glyph}</span>
                    {title}
                </span>
                {expanded ? (
                    <span className="font-mono text-[10px] text-[var(--v2-text-tertiary)]">▲</span>
                ) : (
                    <span className="font-mono text-[10px] text-[var(--v2-text-tertiary)]">▼</span>
                )}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
