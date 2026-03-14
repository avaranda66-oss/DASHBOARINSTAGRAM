'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import { Button } from '@/design-system/atoms/Button';
import type { ProfileMetrics } from './comparison-view';

interface ComparisonAIChatProps {
    client: ProfileMetrics;
    competitors: ProfileMetrics[];
    periodLabel: string;
}

export function ComparisonAIChat({ client, competitors, periodLabel }: ComparisonAIChatProps) {
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [question, setQuestion] = useState('');

    const askAI = async (customQuestion?: string) => {
        setIsLoadingAi(true);
        try {
            const res = await fetch('/api/apify/ai-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client,
                    competitors,
                    periodSummary: periodLabel,
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 overflow-hidden mt-8"
        >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-500/20 bg-purple-500/5">
                <span className="font-mono text-xs text-purple-400">◎</span>
                <h4 className="text-sm font-semibold">Análise Competitiva IA (Gemini)</h4>
            </div>
            <div className="p-4 space-y-3">
                {/* Question input */}
                <form onSubmit={handleAskSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ex: Onde meu concorrente está ganhando de mim e como posso superar? Ou deixe vazio para análise geral..."
                        disabled={isLoadingAi}
                        className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-3 text-sm placeholder:text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isLoadingAi}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-4"
                    >
                        {isLoadingAi ? (
                            <span className="font-mono text-sm animate-spin">↻</span>
                        ) : (
                            <span className="font-mono text-sm">↗</span>
                        )}
                    </Button>
                </form>

                {/* AI Response */}
                {isLoadingAi && (
                    <div className="flex items-center justify-center py-6">
                        <div className="relative">
                            <div className="h-8 w-8 rounded-full border-2 border-[#1A1A1A]" />
                            <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-t-purple-500 animate-spin" />
                        </div>
                        <span className="ml-3 text-sm text-[#8A8A8A]">Gemini está analisando a concorrência...</span>
                    </div>
                )}
                {aiResponse && !isLoadingAi && (
                    <div className="rounded-lg border border-white/[0.08] bg-[#141414] p-3">
                        <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {aiResponse}
                        </div>
                    </div>
                )}
                {!aiResponse && !isLoadingAi && (
                    <p className="text-xs text-[#8A8A8A] text-center">
                        Envie uma pergunta ou clique no botão para uma análise competitiva geral com IA
                    </p>
                )}
            </div>
        </motion.div>
    );
}
