'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DailyAdInsight, AdCampaign } from '@/types/ads';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

interface Props {
    daily: DailyAdInsight[];
    campaigns: AdCampaign[];
    currency: string;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

type MetricKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'reach';

const metricLabels: Record<MetricKey, string> = {
    spend: 'Gasto (R$)',
    impressions: 'Impressões',
    clicks: 'Cliques',
    ctr: 'CTR (%)',
    cpc: 'CPC (R$)',
    reach: 'Alcance',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function AdsCharts({ daily, campaigns, currency }: Props) {
    const [primaryMetric, setPrimaryMetric] = useState<MetricKey>('spend');
    const [secondaryMetric, setSecondaryMetric] = useState<MetricKey>('clicks');

    // Dados para o gráfico de pizza (distribuição de gasto por campanha)
    const campaignSpendData = campaigns
        .filter(c => c.insights && parseFloat(c.insights.spend) > 0)
        .map(c => ({
            name: c.name.length > 25 ? c.name.substring(0, 25) + '…' : c.name,
            value: parseFloat(c.insights!.spend),
        }))
        .sort((a, b) => b.value - a.value);

    // Dados para o gráfico de barras (comparação entre campanhas)
    const campaignCompareData = campaigns
        .filter(c => c.insights)
        .map(c => ({
            name: c.name.length > 15 ? c.name.substring(0, 15) + '…' : c.name,
            spend: parseFloat(c.insights!.spend || '0'),
            clicks: parseInt(c.insights!.clicks || '0'),
            impressions: parseInt(c.insights!.impressions || '0'),
            ctr: parseFloat(c.insights!.ctr || '0'),
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 8);

    if (daily.length === 0) {
        return (
            <Card className="p-8 text-center text-muted-foreground">
                Sem dados diários para o período selecionado.
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Seletor de métricas */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Métrica principal:</span>
                {(Object.keys(metricLabels) as MetricKey[]).map(key => (
                    <Button
                        key={key}
                        variant={primaryMetric === key ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPrimaryMetric(key)}
                    >
                        {metricLabels[key]}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Linha/Área — Tendência temporal */}
                <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">{metricLabels[primaryMetric]} ao longo do tempo</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={daily}>
                            <defs>
                                <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" tick={{ fontSize: 10 }} />
                            <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                labelFormatter={(label: any) => formatDate(String(label))}
                            />
                            <Area
                                type="monotone"
                                dataKey={primaryMetric}
                                stroke="#6366f1"
                                fill="url(#gradPrimary)"
                                strokeWidth={2}
                                name={metricLabels[primaryMetric]}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                {/* Gráfico de Pizza — Distribuição de gasto */}
                <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">Distribuição de Gasto por Campanha</h3>
                    {campaignSpendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={campaignSpendData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                    labelLine={{ strokeWidth: 1 }}
                                >
                                    {campaignSpendData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                            Sem dados de gasto
                        </div>
                    )}
                </Card>

                {/* Gráfico de Barras — Comparação entre campanhas */}
                <Card className="p-4 lg:col-span-2">
                    <h3 className="text-sm font-medium mb-3">Comparação entre Campanhas</h3>
                    {campaignCompareData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={campaignCompareData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Legend />
                                <Bar dataKey="spend" name="Gasto (R$)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="clicks" name="Cliques" fill="#22c55e" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                            Sem dados para comparação
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
