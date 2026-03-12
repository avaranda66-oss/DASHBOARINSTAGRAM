'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetaPost {
    caption?: string;
    timestamp: string;
    type: string;
    reach?: number;
    saved?: number;
    shares?: number;
    likesCount: number;
    commentsCount: number;
    hashtags?: string[];
}

interface MetaSummary {
    avgReach?: number;
    avgEngagementRate?: number;
}

interface Props {
    posts: MetaPost[];
    summary?: MetaSummary;
    accountInsights?: any[];
    demographics?: Record<string, any>;
}

export function MetaAiStrategy({ posts, summary, accountInsights, demographics }: Props) {
    const [report, setReport] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setCollapsed(false);
        try {
            const res = await fetch('/api/meta-ai-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ posts, summary, accountInsights, demographics }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error ?? 'Erro ao gerar relatório.');
                return;
            }
            setReport(json.data);
        } catch (e: any) {
            setError(e.message ?? 'Erro de rede.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl v2-glass bg-gradient-to-r from-[var(--v2-accent)]/5 to-[var(--v2-accent-secondary)]/5 p-4">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--v2-accent)]" />
                        <span className="font-semibold text-sm">Relatório Estratégico com IA</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Gemini analisa seus {posts.length} posts e gera recomendações concretas para aumentar alcance.
                    </p>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={isLoading || posts.length === 0}
                    size="sm"
                    className="bg-[var(--v2-accent)] hover:bg-[var(--v2-accent-hover)] text-white shrink-0"
                >
                    {isLoading ? (
                        <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Gerando...</>
                    ) : report ? (
                        <><RefreshCw className="mr-2 h-3.5 w-3.5" /> Regenerar</>
                    ) : (
                        <><Sparkles className="mr-2 h-3.5 w-3.5" /> Gerar Relatório Estratégico</>
                    )}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--v2-danger)]/20 bg-[var(--v2-danger)]/5 p-3">
                    <AlertCircle className="h-4 w-4 text-[var(--v2-danger)] mt-0.5 shrink-0" />
                    <p className="text-sm text-[var(--v2-danger)]">{error}</p>
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && !report && (
                <div className="space-y-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 bg-[var(--v2-bg-surface)] rounded w-1/3" />
                            <div className="h-3 bg-[var(--v2-border)] rounded w-full" />
                            <div className="h-3 bg-[var(--v2-border)] rounded w-4/5" />
                            <div className="h-3 bg-[var(--v2-border)] rounded w-3/5" />
                        </div>
                    ))}
                </div>
            )}

            {/* Report */}
            {report && !isLoading && (
                <div className="rounded-xl v2-glass overflow-hidden">
                    <button
                        onClick={() => setCollapsed((v) => !v)}
                        className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b border-border bg-[var(--v2-bg-surface)]"
                    >
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--v2-accent)]" />
                            Relatório Estratégico
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                    </button>
                    {!collapsed && (
                        <div className="px-4 py-4 space-y-3 text-xs">
                            {report.split('\n').map((line, i) => {
                                if (line.startsWith('## ')) {
                                    return (
                                        <h3 key={i} className="text-sm font-semibold text-foreground border-b border-border pb-1 mt-4 first:mt-0">
                                            {line.replace('## ', '')}
                                        </h3>
                                    );
                                }
                                if (line.startsWith('- ') || line.startsWith('* ')) {
                                    return (
                                        <p key={i} className="text-muted-foreground flex gap-2 leading-relaxed">
                                            <span className="text-[var(--v2-accent)] shrink-0">•</span>
                                            <span>{line.replace(/^[-*] /, '').replace(/\*\*(.+?)\*\*/g, '$1')}</span>
                                        </p>
                                    );
                                }
                                if (line.match(/^\d+\. /)) {
                                    return (
                                        <p key={i} className="text-muted-foreground leading-relaxed">
                                            {line.replace(/\*\*(.+?)\*\*/g, '$1')}
                                        </p>
                                    );
                                }
                                if (line.trim() === '') return <div key={i} className="h-1" />;
                                return (
                                    <p key={i} className="text-muted-foreground leading-relaxed">
                                        {line.replace(/\*\*(.+?)\*\*/g, '$1')}
                                    </p>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Empty prompt */}
            {!report && !isLoading && !error && (
                <div className="rounded-xl border border-dashed border-[var(--v2-accent)]/20 p-8 text-center">
                    <Sparkles className="h-8 w-8 text-[var(--v2-accent)]/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                        Clique em <strong className="text-foreground">Gerar Relatório Estratégico</strong> para obter análise personalizada da sua conta com recomendações de IA.
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-2">
                        Gemini irá analisar seus posts, hashtags, melhores dias e formatos para gerar 5 recomendações práticas.
                    </p>
                </div>
            )}
        </div>
    );
}
