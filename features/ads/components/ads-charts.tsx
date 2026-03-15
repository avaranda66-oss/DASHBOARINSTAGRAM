'use client';

import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { cn } from '@/design-system/utils/cn';
import type { DailyAdInsight, AdCampaign } from '@/types/ads';
import { AdsForecastChart } from './ads-forecast-chart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const metricLabels: Record<string, string> = {
    spend: 'Gasto (R$)',
    impressions: 'Impressões',
    clicks: 'Cliques',
    ctr: 'CTR (%)',
    cpc: 'CPC (R$)',
    reach: 'Alcance',
};

type MetricKey = keyof typeof metricLabels;

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch (e) {
        return dateStr;
    }
}

// ─── Blueprint Components ───────────────────────────────────────────────────

function BlueprintChartContainer({ title, subtitle, footer, children, className }: { 
    title: string; subtitle?: string; footer?: string; children: React.ReactNode; className?: string 
}) {
    return (
        <div 
            className={cn("bg-[#0A0A0A] border rounded-lg overflow-hidden relative group font-mono", className)}
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
            {/* Blueprint Grid Background */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ 
                    backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }} 
            />

            {/* Header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01] relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F5F5]">{title}</span>
                    {subtitle && <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest mt-0.5">{subtitle}</span>}
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-30 group-hover:opacity-100 transition-opacity">
                    <span className="w-1 h-1 bg-[#A3E635] rounded-full" />
                    <span className="text-[8px] text-[#4A4A4A]">LIVE_STREAM</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 relative z-10">
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[7px] text-[#3A3A3A] tracking-[0.4em] uppercase">
                    <span>{footer}</span>
                    <span>PROTO_0x_v2.5</span>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface AdsChartsProps {
    daily: DailyAdInsight[];
    campaigns: AdCampaign[];
    currency?: string;
    isLoading?: boolean;
    dateLabel?: string;
}

export function AdsCharts({ daily, campaigns, isLoading = false, dateLabel }: AdsChartsProps) {
    const [primaryMetric, setPrimaryMetric] = useState<MetricKey>('spend');

    const campaignSpendData = campaigns
        .filter(c => c.insights && parseFloat(c.insights.spend) > 0)
        .map(c => ({
            name: c.name.length > 20 ? c.name.substring(0, 20) + '…' : c.name,
            value: parseFloat(c.insights!.spend),
        }))
        .sort((a, b) => b.value - a.value);

    const campaignCompareData = campaigns
        .filter(c => c.insights)
        .map(c => ({
            name: c.name.length > 12 ? c.name.substring(0, 12) + '…' : c.name,
            spend: parseFloat(c.insights!.spend || '0'),
            clicks: parseInt(c.insights!.clicks || '0'),
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 6);

    // Sem dados nenhum (diário E campanhas) — sem period selecionado ou sem atividade
    const hasAnyCampaignData = campaignSpendData.length > 0 || campaignCompareData.length > 0;
    if (daily.length === 0 && !hasAnyCampaignData) {
        return (
            <div className="rounded-[8px] border border-dashed border-white/10 p-16 text-center bg-[#0A0A0A] font-mono flex flex-col items-center gap-3">
                <span className="text-[#A3E635] text-[10px] uppercase tracking-[0.4em] opacity-40">◈ SEM_DADOS_PERÍODO</span>
                <p className="text-[11px] text-[#4A4A4A] max-w-xs leading-relaxed">
                    {isLoading
                        ? 'Carregando dados da Meta API...'
                        : `Nenhuma atividade encontrada${dateLabel ? ` para "${dateLabel}"` : ' neste período'}. Verifique se campanhas estavam ativas neste intervalo.`
                    }
                </p>
            </div>
        );
    }

    const currentPrimaryLabel = metricLabels[primaryMetric];

    return (
        <div className="space-y-8 pb-10 font-mono">
            {/* HUD Metric Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/5">
                <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mr-4">Select_Node:</span>
                {(Object.keys(metricLabels) as MetricKey[]).map(key => (
                    <button
                        key={key}
                        onClick={() => setPrimaryMetric(key)}
                        className={cn(
                            "px-3 py-1.5 rounded-[3px] border text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            primaryMetric === key 
                                ? "bg-[#A3E635] text-black border-[#A3E635]" 
                                : "bg-transparent text-[#4A4A4A] border-white/5 hover:border-white/20"
                        )}
                    >
                        {metricLabels[key]}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Time Evolution - Area Chart */}
                <BlueprintChartContainer
                    title={currentPrimaryLabel}
                    subtitle="Evolution_Protocol_Temporal"
                    footer="Time_Series_Calibration"
                    className="col-span-12"
                >
                    <div className="h-[280px]" style={{ minHeight: 1 }}>
                        {daily.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30">
                                <span className="text-[#A3E635] text-[10px] uppercase tracking-[0.4em]">◈ NO_TIMELINE_DATA</span>
                                <p className="text-[9px] text-[#4A4A4A]">
                                    {dateLabel ? `Sem dados diários para "${dateLabel}"` : 'Sem dados de série temporal para o período'}
                                </p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="blueprintArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#A3E635" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#A3E635" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={formatDate} 
                                    tick={{ fontSize: 9, fill: '#3A3A3A' }} 
                                    axisLine={false} 
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fontSize: 9, fill: '#3A3A3A' }} 
                                    axisLine={false} 
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                                    labelStyle={{ color: '#A3E635', fontSize: '10px', fontWeight: 'bold' }}
                                    itemStyle={{ fontSize: '10px', color: '#F5F5F5' }}
                                    labelFormatter={(v) => formatDate(String(v))}
                                />
                                <Area
                                    type="monotone"
                                    dataKey={primaryMetric}
                                    stroke="#A3E635"
                                    fill="url(#blueprintArea)"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                    activeDot={{ r: 4, fill: '#A3E635', stroke: '#000', strokeWidth: 1 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </BlueprintChartContainer>

                {/* Spend Distribution - Pie Chart */}
                <BlueprintChartContainer 
                    title="Gasto_By_Campaign" 
                    subtitle="Distribution_Matrix"
                    footer="Cluster_Analysis"
                    className="col-span-12 xl:col-span-5"
                >
                    <div className="h-[300px]" style={{ minHeight: 1 }}>
                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={campaignSpendData}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    isAnimationActive={false}
                                >
                                    {campaignSpendData.map((_, i) => (
                                        <Cell 
                                            key={i} 
                                            fill={i === 0 ? '#A3E635' : i === 1 ? '#FBBF24' : `rgba(255,255,255,${0.25 - i * 0.04})`} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '10px', color: '#8A8A8A' }}
                                    formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, 'Spend']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Minimal Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {campaignSpendData.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span 
                                    className="w-1.5 h-1.5 rounded-full" 
                                    style={{ backgroundColor: i === 0 ? '#A3E635' : i === 1 ? '#FBBF24' : 'rgba(255,255,255,0.1)' }} 
                                />
                                <span className="text-[8px] text-[#4A4A4A] truncate uppercase tracking-tighter">{c.name}</span>
                            </div>
                        ))}
                    </div>
                </BlueprintChartContainer>

                {/* Campaign Comparison - Vertical Bar Chart */}
                <BlueprintChartContainer 
                    title="Camp_Performance" 
                    subtitle="Comparison_Benchmarking"
                    footer="Competitive_Calibration"
                    className="col-span-12 xl:col-span-7"
                >
                    <div className="h-[340px]" style={{ minHeight: 1 }}>
                        <ResponsiveContainer width="100%" height={340} minWidth={0}>
                            <BarChart data={campaignCompareData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={100} 
                                    tick={{ fontSize: 9, fill: '#4A4A4A' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '10px' }}
                                />
                                <Bar 
                                    dataKey="spend" 
                                    name="Gasto_R$" 
                                    fill="#A3E635" 
                                    radius={[0, 2, 2, 0]} 
                                    barSize={12} 
                                    isAnimationActive={false} 
                                />
                                <Bar 
                                    dataKey="clicks" 
                                    name="Clicks_Idx" 
                                    fill="#FBBF24" 
                                    radius={[0, 2, 2, 0]} 
                                    barSize={12} 
                                    isAnimationActive={false} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </BlueprintChartContainer>
            </div>

            {/* Forecast de Gasto — Holt-Winters com Intervalos de Predição */}
            <BlueprintChartContainer
                title="Forecast_Spend"
                subtitle="Holt-Winters · PI 80% / 95% · +7 dias"
                footer="Statistical_Engine_v3"
                className="col-span-12"
            >
                <AdsForecastChart daily={daily} currency="BRL" />
            </BlueprintChartContainer>
        </div>
    );
}
