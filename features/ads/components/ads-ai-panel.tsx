'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AdsKpiSummary, AdCampaign, DailyAdInsight } from '@/types/ads';
import { Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';

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

function generateLocalInsights(kpi: AdsKpiSummary, campaigns: AdCampaign[], daily: DailyAdInsight[]): AiInsight[] {
    const insights: AiInsight[] = [];

    // 1. Diagnóstico geral
    if (kpi.activeCampaigns === 0) {
        insights.push({
            type: 'warning',
            title: 'Nenhuma campanha ativa',
            description: `Você tem ${kpi.pausedCampaigns} campanha(s) pausada(s). Considere reativar as que tiveram melhor performance.`,
        });
    }

    // 2. CTR Analysis
    if (kpi.avgCtr > 0) {
        if (kpi.avgCtr >= 2) {
            insights.push({ type: 'success', title: 'CTR excelente', description: `Seu CTR médio de ${kpi.avgCtr.toFixed(2)}% está acima da média do mercado (1-2%). Seus criativos estão funcionando bem.` });
        } else if (kpi.avgCtr < 0.8) {
            insights.push({ type: 'danger', title: 'CTR abaixo do ideal', description: `CTR de ${kpi.avgCtr.toFixed(2)}% está baixo. Considere testar novos criativos, headlines e segmentação.` });
        }
    }

    // 3. CPC Analysis
    if (kpi.avgCpc > 0) {
        if (kpi.avgCpc > 5) {
            insights.push({ type: 'warning', title: 'CPC alto', description: `CPC médio de R$ ${kpi.avgCpc.toFixed(2)} pode ser otimizado. Teste audiências lookalike e criativos com mais urgência/prova social.` });
        } else if (kpi.avgCpc < 1) {
            insights.push({ type: 'success', title: 'CPC eficiente', description: `CPC de R$ ${kpi.avgCpc.toFixed(2)} está ótimo. Considere escalar as campanhas com melhor CPC mantendo a segmentação.` });
        }
    }

    // 4. Frequência
    if (kpi.avgFrequency > 3) {
        insights.push({ type: 'danger', title: 'Frequência alta — possível fadiga', description: `Frequência média de ${kpi.avgFrequency.toFixed(1)}x. Sua audiência pode estar saturada. Expanda o público ou renove os criativos.` });
    }

    // 5. ROAS
    if (kpi.roas > 0) {
        if (kpi.roas >= 3) {
            insights.push({ type: 'success', title: 'ROAS forte', description: `ROAS de ${kpi.roas.toFixed(2)}x. Para cada R$ 1 investido, você retorna R$ ${kpi.roas.toFixed(2)}. Considere escalar agressivamente.` });
        } else if (kpi.roas < 1) {
            insights.push({ type: 'danger', title: 'ROAS negativo', description: `ROAS de ${kpi.roas.toFixed(2)}x — você está perdendo dinheiro. Revise segmentação, oferta e landing page.` });
        }
    }

    // 6. Tendência de gasto
    if (daily.length >= 7) {
        const lastWeek = daily.slice(-7);
        const prevWeek = daily.slice(-14, -7);
        if (prevWeek.length >= 7) {
            const lastSum = lastWeek.reduce((s, d) => s + d.spend, 0);
            const prevSum = prevWeek.reduce((s, d) => s + d.spend, 0);
            const change = prevSum > 0 ? ((lastSum - prevSum) / prevSum) * 100 : 0;
            if (Math.abs(change) > 20) {
                insights.push({
                    type: change > 0 ? 'warning' : 'info',
                    title: `Gasto ${change > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(change).toFixed(0)}%`,
                    description: `Semana passada: R$ ${prevSum.toFixed(2)} → Esta semana: R$ ${lastSum.toFixed(2)}.`,
                });
            }
        }
    }

    // 7. Campanhas top/bottom
    const sortedBySpend = campaigns
        .filter(c => c.insights && parseFloat(c.insights.spend) > 0)
        .sort((a, b) => parseFloat(b.insights!.ctr || '0') - parseFloat(a.insights!.ctr || '0'));

    if (sortedBySpend.length >= 2) {
        const best = sortedBySpend[0];
        const worst = sortedBySpend[sortedBySpend.length - 1];
        insights.push({
            type: 'info',
            title: 'Melhor campanha por CTR',
            description: `"${best.name}" — CTR ${parseFloat(best.insights!.ctr || '0').toFixed(2)}%, CPC R$ ${parseFloat(best.insights!.cpc || '0').toFixed(2)}`,
        });
        if (worst.id !== best.id) {
            insights.push({
                type: 'warning',
                title: 'Pior campanha por CTR',
                description: `"${worst.name}" — CTR ${parseFloat(worst.insights!.ctr || '0').toFixed(2)}%, CPC R$ ${parseFloat(worst.insights!.cpc || '0').toFixed(2)}. Considere pausar ou otimizar.`,
            });
        }
    }

    // 8. Budget advisor
    if (kpi.totalSpend > 0 && campaigns.length > 1) {
        const activeCampaigns = campaigns.filter(c => c.effective_status === 'ACTIVE' && c.insights);
        const bestROAS = activeCampaigns
            .filter(c => c.insights?.purchase_roas?.[0])
            .sort((a, b) => parseFloat(b.insights!.purchase_roas![0].value) - parseFloat(a.insights!.purchase_roas![0].value));

        if (bestROAS.length > 0) {
            insights.push({
                type: 'info',
                title: 'Redistribuição de verba',
                description: `Concentre mais orçamento em "${bestROAS[0].name}" que tem o melhor ROAS entre as campanhas ativas.`,
            });
        }
    }

    if (insights.length === 0) {
        insights.push({ type: 'info', title: 'Dados insuficientes', description: 'Continue rodando suas campanhas para gerar insights mais precisos.' });
    }

    return insights;
}

const typeIcons: Record<string, typeof TrendingUp> = {
    success: TrendingUp,
    warning: AlertTriangle,
    danger: TrendingDown,
    info: Lightbulb,
};

const typeColors: Record<string, string> = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
};

const iconColors: Record<string, string> = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
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
                totalImpressions: kpi.totalImpressions,
                totalClicks: kpi.totalClicks,
                avgCtr: kpi.avgCtr,
                avgCpc: kpi.avgCpc,
                roas: kpi.roas,
                frequency: kpi.avgFrequency,
                activeCampaigns: kpi.activeCampaigns,
                campaigns: campaigns.map(c => ({
                    name: c.name,
                    status: c.effective_status,
                    objective: c.objective,
                    spend: c.insights?.spend,
                    impressions: c.insights?.impressions,
                    clicks: c.insights?.clicks,
                    ctr: c.insights?.ctr,
                    cpc: c.insights?.cpc,
                })),
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <h2 className="text-lg font-semibold">Painel de Inteligência</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={generateDeepAnalysis}
                    disabled={isGeneratingAi}
                >
                    {isGeneratingAi ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
                    ) : (
                        <><Brain className="h-4 w-4 mr-2" /> Análise Profunda IA</>
                    )}
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">Custo por Resultado</span>
                    </div>
                    <p className="text-xl font-bold">
                        {kpi.cpa > 0 ? `R$ ${kpi.cpa.toFixed(2)}` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {kpi.totalConversions} conversão(ões) no período
                    </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Campanhas</span>
                    </div>
                    <p className="text-xl font-bold">
                        {kpi.activeCampaigns} <span className="text-sm font-normal text-green-500">ativas</span>
                        {' '}{kpi.pausedCampaigns > 0 && <span className="text-sm font-normal text-yellow-500">/ {kpi.pausedCampaigns} pausadas</span>}
                    </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-2 mb-1">
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span className="text-xs text-muted-foreground">CPM Médio</span>
                    </div>
                    <p className="text-xl font-bold">R$ {kpi.avgCpm.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Custo por 1.000 impressões
                    </p>
                </Card>
            </div>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, i) => {
                    const Icon = typeIcons[insight.type] || Lightbulb;
                    return (
                        <Card key={i} className={`p-4 border ${typeColors[insight.type]}`}>
                            <div className="flex items-start gap-3">
                                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColors[insight.type]}`} />
                                <div>
                                    <p className="font-medium text-sm">{insight.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* AI Deep Analysis */}
            {aiAnalysis && (
                <Card className="p-4 border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-purple-500" />
                        <h3 className="font-medium">Análise Profunda (IA)</h3>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                        {aiAnalysis}
                    </div>
                </Card>
            )}
        </div>
    );
}
