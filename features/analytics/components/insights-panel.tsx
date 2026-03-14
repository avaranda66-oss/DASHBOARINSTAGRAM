'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/design-system/atoms/Button';
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
                className="rounded-xl border border-white/[0.08] bg-[#141414] overflow-hidden"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.04]">
                    <div className="flex items-center gap-2">
                        <span className="text-[#3E63DD] font-mono text-sm mr-2">◎</span>
                        <h4 className="text-sm font-semibold text-[#F5F5F5]">Insights de Dados</h4>
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
                            <span className="font-mono text-sm animate-spin text-[#8A8A8A] mr-2">↻</span>
                            <span className="text-sm text-[#8A8A8A]">Processando dados...</span>
                        </div>
                    ) : fixedInsights ? (
                        <div
                            className="insights-content text-sm space-y-3"
                            dangerouslySetInnerHTML={{ __html: fixedInsights }}
                        />
                    ) : (
                        <p className="text-sm text-[#8A8A8A] text-center py-4">
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
                className="rounded-xl border border-[#A3E635]/30 bg-white/[0.04] overflow-hidden"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] bg-white/[0.04]">
                    <span className="text-[#A3E635] font-mono text-sm mr-2">✧</span>
                    <h4 className="text-sm font-semibold text-[#A3E635]">Análise IA (Gemini)</h4>
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
                            className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-3 text-sm placeholder:text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A3E635]/30 disabled:opacity-50"
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isLoadingAi}
                            className="bg-[#A3E635] hover:bg-[#A3E635]/80 text-black h-9 px-4"
                        >
                            {isLoadingAi ? (
                                <span className="animate-spin font-mono text-sm text-[#F5F5F5]/40">◷</span>
                            ) : (
                                <span className="font-mono text-sm">↗</span>
                            )}
                        </Button>
                    </form>

                    {/* AI Response */}
                    {isLoadingAi && (
                        <div className="flex items-center justify-center py-6">
                            <div className="relative">
                                <div className="h-8 w-8 rounded-full border-2 border-white/[0.04]" />
                                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-t-[#A3E635] animate-spin" />
                            </div>
                            <span className="ml-3 text-sm text-[#8A8A8A]">Gemini está analisando...</span>
                        </div>
                    )}
                    {aiResponse && !isLoadingAi && (
                        <div className="rounded-lg border border-white/[0.08] bg-[#141414] p-3 text-[#F5F5F5]/90">
                            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                {aiResponse}
                            </div>
                        </div>
                    )}
                    {!aiResponse && !isLoadingAi && (
                        <p className="text-xs text-[#8A8A8A] text-center">
                            Envie uma pergunta ou clique no botão para uma análise geral com IA
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
