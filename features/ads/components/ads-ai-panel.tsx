'use client';

import { useState } from 'react';

import { Button } from '@/design-system/atoms/Button';
import type { AdsKpiSummary, AdCampaign, DailyAdInsight } from '@/types/ads';
// [ZERO_LUCIDE_PURGE]
import { cn } from '@/design-system/utils/cn';

interface Props {
    kpi: AdsKpiSummary | null;
    campaigns: AdCampaign[];
    daily: DailyAdInsight[];
    currency: string;
}

interface AiInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    description: string;
}

const GLYPHS = {
    BRAIN: '◆',
    TREND_UP: '↗',
    TREND_DOWN: '↘',
    ALERT: '▲',
    BULB: '◎',
    MONEY: '＄',
    LOADING: '◑',
    AUTO: '⚡'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

function generateLocalInsights(kpi: AdsKpiSummary, campaigns: AdCampaign[], daily: DailyAdInsight[]): AiInsight[] {
    const insights: AiInsight[] = [];

    // 1. Diagnóstico geral
    if (kpi.activeCampaigns === 0) {
        insights.push({
            type: 'warning',
            title: 'No_Active_Nodes',
            description: `Detectados ${kpi.pausedCampaigns} kernels pausados. Reativação recomendada para fluxo de dados.`,
        });
    }

    // 2. CTR Analysis
    if (kpi.avgCtr > 0) {
        if (kpi.avgCtr >= 2) {
            insights.push({ type: 'success', title: 'High_Yield_CTR', description: `Taxa de ${kpi.avgCtr.toFixed(2)}% acima do baseline industrial. Criativos otimizados.` });
        } else if (kpi.avgCtr < 0.8) {
            insights.push({ type: 'danger', title: 'Low_Visual_Pulse', description: `CTR de ${kpi.avgCtr.toFixed(2)}% crítico. Falha na retenção. Teste novos modelos.` });
        }
    }

    // 3. CPC Analysis
    if (kpi.avgCpc > 0) {
        if (kpi.avgCpc > 5) {
            insights.push({ type: 'warning', title: 'Cost_Inflated', description: `CPC de R$ ${kpi.avgCpc.toFixed(2)} excedendo limites. Audiência lookalike recomendada.` });
        } else if (kpi.avgCpc < 1) {
            insights.push({ type: 'success', title: 'Cost_Optimized', description: `Handshake de R$ ${kpi.avgCpc.toFixed(2)} eficiente. Escala de orçamento segura.` });
        }
    }

    // 4. Frequência
    if (kpi.avgFrequency > 3) {
        insights.push({ type: 'danger', title: 'Audience_Saturation', description: `Frequência ${kpi.avgFrequency.toFixed(1)}x. Fadiga de kernel detectada. Expanda o scope.` });
    }

    // 5. ROAS
    if (kpi.roas > 0) {
        if (kpi.roas >= 3) {
            insights.push({ type: 'success', title: 'Positive_Delta_ROAS', description: `Retorno de ${kpi.roas.toFixed(2)}x. Escala agressiva inicializada.` });
        } else if (kpi.roas < 1) {
            insights.push({ type: 'danger', title: 'Negative_Yield', description: `ROAS ${kpi.roas.toFixed(2)}x. Evasão de recursos. Revise a oferta.` });
        }
    }

    return insights;
}

const typeColors: Record<string, string> = {
    success: 'border-[#A3E635]/20 bg-[#A3E635]/5 text-[#A3E635]',
    warning: 'border-[#FBBF24]/20 bg-[#FBBF24]/5 text-[#FBBF24]',
    danger: 'border-[#EF4444]/20 bg-[#EF4444]/5 text-[#EF4444]',
    info: 'border-blue-500/20 bg-blue-500/5 text-blue-500',
};

const glyphMap: Record<string, string> = {
    success: GLYPHS.TREND_UP,
    warning: GLYPHS.ALERT,
    danger: GLYPHS.TREND_DOWN,
    info: GLYPHS.BULB,
};

export function AdsAiPanel({ kpi, campaigns, daily, currency }: Props) {
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

    if (!kpi) return null;

    const insights = generateLocalInsights(kpi, campaigns, daily);

    const generateDeepAnalysis = async () => {
        setIsGeneratingAi(true);
        try {
            const context = {
                totalSpend: kpi.totalSpend,
                avgCtr: kpi.avgCtr,
                avgCpc: kpi.avgCpc,
                roas: kpi.roas,
                frequency: kpi.avgFrequency,
                activeCampaigns: kpi.activeCampaigns,
            };

            const res = await fetch('/api/ads-ai-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context }),
            });
            const data = await res.json();
            if (data.success) {
                setAiAnalysis(data.analysis);
            }
        } catch {
            // Local insights are enough
        } finally {
            setIsGeneratingAi(false);
        }
    };

    return (
        <div className="space-y-6 font-mono">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] text-lg">{wrap(GLYPHS.BRAIN)}</span>
                    <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Intelligence_Hub</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={generateDeepAnalysis}
                    disabled={isGeneratingAi}
                    className="h-8 text-[9px] tracking-widest uppercase border-white/10"
                >
                    {isGeneratingAi ? (
                        <><span className="animate-spin mr-2">{wrap(GLYPHS.LOADING)}</span> RUNNING_ANALYSIS...</>
                    ) : (
                        <><span className="mr-2">{wrap(GLYPHS.AUTO)}</span> AI_DEEP_INJECT</>
                    )}
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-[#050505] border border-white/10 rounded-lg group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest font-bold">Cost_Per_Unit</span>
                        <span className="text-[#A3E635] opacity-40 group-hover:opacity-100">{wrap(GLYPHS.MONEY)}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">
                        {kpi.cpa > 0 ? `R$ ${kpi.cpa.toFixed(2)}` : '—'}
                    </p>
                    <p className="text-[9px] text-[#4A4A4A] mt-2 uppercase tracking-tighter">
                        VAL_TOTAL: {kpi.totalConversions} CONV_NODES
                    </p>
                </div>

                <div className="p-5 bg-[#050505] border border-white/10 rounded-lg group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest font-bold">Node_Status</span>
                        <span className="text-blue-500 opacity-40 group-hover:opacity-100">{wrap(GLYPHS.TREND_UP)}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">
                        {kpi.activeCampaigns} <span className="text-xs text-[#A3E635]">ACTIVE</span>
                    </p>
                    <p className="text-[9px] text-[#4A4A4A] mt-2 uppercase tracking-tighter">
                        SYSTEM_LOAD: STABLE
                    </p>
                </div>

                <div className="p-5 bg-[#050505] border border-white/10 rounded-lg group">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest font-bold">CPM_Baseline</span>
                        <span className="text-purple-500 opacity-40 group-hover:opacity-100">{wrap(GLYPHS.BRAIN)}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">R$ {kpi.avgCpm.toFixed(2)}</p>
                    <p className="text-[9px] text-[#4A4A4A] mt-2 uppercase tracking-tighter">
                        PER_1K_IMPRESSIONS
                    </p>
                </div>
            </div>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                    <div key={i} className={cn("p-5 border border-white/10 rounded-lg", typeColors[insight.type])}>
                        <div className="flex items-start gap-4">
                            <span className="text-sm mt-0.5">{wrap(glyphMap[insight.type])}</span>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest">{insight.title}</p>
                                <p className="text-[10px] leading-relaxed opacity-80">{insight.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Deep Analysis */}
            {aiAnalysis && (
                <div className="p-8 border border-[#A3E635]/20 bg-[#A3E635]/5 rounded-lg">
                    <div className="flex items-center gap-3 mb-6 border-b border-[#A3E635]/10 pb-4">
                        <span className="text-[#A3E635]">{wrap(GLYPHS.BRAIN)}</span>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#A3E635]">System_Deep_Analysis_v.2.1</h3>
                    </div>
                    <div className="text-[11px] leading-relaxed text-[#F5F5F5] uppercase tracking-tight whitespace-pre-wrap">
                        {aiAnalysis}
                    </div>
                </div>
            )}
        </div>
    );
}
