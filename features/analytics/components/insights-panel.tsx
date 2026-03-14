'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { InstagramPostMetrics, AnalyticsSummary } from '@/types/analytics';

interface InsightsPanelProps {
    posts: InstagramPostMetrics[];
    summary: AnalyticsSummary;
    /** Pre-computed rule-based insights HTML */
    fixedInsights: string | null;
    isLoadingFixed: boolean;
    onLoadFixed: () => void;
}

export function InsightsPanel({
    posts,
    summary,
    fixedInsights,
    isLoadingFixed,
    onLoadFixed,
}: InsightsPanelProps) {
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [question, setQuestion] = useState('');

    const askAI = async (customQuestion?: string) => {
        setIsLoadingAi(true);
        try {
            const res = await fetch('/api/apify/ai-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    posts: posts.slice(0, 20).map((p) => ({
                        type: p.type,
                        caption: p.caption?.slice(0, 200),
                        hashtags: p.hashtags?.slice(0, 10),
                        likesCount: p.likesCount,
                        commentsCount: p.commentsCount,
                        videoViewCount: p.videoViewCount,
                        timestamp: p.timestamp,
                    })),
                    summary,
                    question: customQuestion || undefined,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setAiResponse(json.data);
            } else {
                setAiResponse(`Erro: ${json.error}`);
            }
        } catch {
            setAiResponse('Erro ao conectar com a IA.');
        } finally {
            setIsLoadingAi(false);
        }
    };

    const handleAskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) {
            askAI();
        } else {
            askAI(question.trim());
        }
        setQuestion('');
    };

    return (
        <div className="space-y-4">
            {/* Fixed insights (rule-based) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono text-sm mr-2">◎</span>
                        <h4 className="text-sm font-semibold">Insights de Dados</h4>
                    </div>
                    {!fixedInsights && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onLoadFixed}
                            disabled={isLoadingFixed}
                            className="text-xs"
                        >
                            {isLoadingFixed ? (
                                <><span className="mr-1 font-mono text-xs animate-spin">↻</span> Analisando...</>
                            ) : (
                                <><span className="mr-1 font-mono text-xs">◎</span> Gerar Análise</>
                            )}
                        </Button>
                    )}
                </div>
                <div className="p-4">
                    {isLoadingFixed ? (
                        <div className="flex items-center justify-center py-6">
                            <span className="font-mono text-sm animate-spin text-muted-foreground mr-2">↻</span>
                            <span className="text-sm text-muted-foreground">Processando dados...</span>
                        </div>
                    ) : fixedInsights ? (
                        <div
                            className="insights-content text-sm space-y-3"
                            dangerouslySetInnerHTML={{ __html: fixedInsights }}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Clique em &quot;Gerar Análise&quot; para ver insights baseados nos dados
                        </p>
                    )}
                </div>
            </motion.div>

            {/* AI Analysis box */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 overflow-hidden"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-500/20 bg-purple-500/5">
                    <span className="text-purple-400 font-mono text-sm mr-2">◎</span>
                    <h4 className="text-sm font-semibold">Análise IA (Gemini)</h4>
                </div>
                <div className="p-4 space-y-3">
                    {/* Question input */}
                    <form onSubmit={handleAskSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Pergunte algo sobre seus dados ou deixe vazio para análise geral..."
                            disabled={isLoadingAi}
                            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isLoadingAi}
                            className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-4"
                        >
                            {isLoadingAi ? (
                                <span className="animate-spin font-mono text-sm text-white/50">◷</span>
                            ) : (
                                <span className="font-mono text-sm">↗</span>
                            )}
                        </Button>
                    </form>

                    {/* AI Response */}
                    {isLoadingAi && (
                        <div className="flex items-center justify-center py-6">
                            <div className="relative">
                                <div className="h-8 w-8 rounded-full border-2 border-muted" />
                                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-t-purple-500 animate-spin" />
                            </div>
                            <span className="ml-3 text-sm text-muted-foreground">Gemini está analisando...</span>
                        </div>
                    )}
                    {aiResponse && !isLoadingAi && (
                        <div className="rounded-lg border border-border bg-card p-3">
                            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                {aiResponse}
                            </div>
                        </div>
                    )}
                    {!aiResponse && !isLoadingAi && (
                        <p className="text-xs text-muted-foreground text-center">
                            Envie uma pergunta ou clique no botão para uma análise geral com IA
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
