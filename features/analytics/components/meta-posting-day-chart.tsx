'use client';

import { useState, memo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface MetaPost {
    timestamp: string;
    reach?: number;
    likesCount: number;
    saved?: number;
    shares?: number;
    commentsCount: number;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MetaPostingDayChart = memo(function MetaPostingDayChart({ posts }: Props) {
    const [metric, setMetric] = useState<'reach' | 'likesCount' | 'saved' | 'shares'>('reach');

    const dayMap: Record<string, { count: number; totalMetric: number; totalEng: number }> = {};
    DAYS.forEach((d) => { dayMap[d] = { count: 0, totalMetric: 0, totalEng: 0 }; });

    posts.forEach((p) => {
        if (!p.timestamp) return;
        const day = DAYS[new Date(p.timestamp).getDay()];
        dayMap[day].count += 1;
        dayMap[day].totalMetric += (p[metric] as number) || 0;
        dayMap[day].totalEng += p.likesCount + p.commentsCount + (p.saved || 0) + (p.shares || 0);
    });

    const data = DAYS.map((day) => ({
        dia: day,
        metricaAvg: dayMap[day].count > 0 ? Math.round(dayMap[day].totalMetric / dayMap[day].count) : 0,
        engAvg: dayMap[day].count > 0 ? Math.round(dayMap[day].totalEng / dayMap[day].count) : 0,
        posts: dayMap[day].count,
    }));

    const maxValue = Math.max(...data.map((d) => d.metricaAvg));
    const maxEngValue = Math.max(...data.map((d) => d.engAvg));

    const options = [
        { value: 'reach', label: 'Alcance' },
        { value: 'likesCount', label: 'Likes' },
        { value: 'saved', label: 'Saves' },
        { value: 'shares', label: 'Shares' }
    ];

    if (posts.length === 0) {
        return (
            <div 
                className="flex flex-col items-center justify-center h-[240px] rounded-[8px] border" 
                style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}
            >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#3A3A3A]">No_Data</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">Alcance por Dia</span>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setMetric(opt.value as any)}
                        className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-1 border transition-colors rounded-[3px]"
                        style={metric === opt.value
                            ? { color: '#A3E635', borderColor: 'rgba(163,230,53,0.3)', backgroundColor: 'rgba(163,230,53,0.06)' }
                            : { color: '#4A4A4A', borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }
                        }
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: '#141414', 
                            borderColor: 'rgba(255,255,255,0.08)', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontFamily: 'ui-monospace, monospace', 
                            color: '#F5F5F5', 
                            padding: '8px 12px' 
                        }}
                        itemStyle={{ color: '#8A8A8A', fontSize: '10px' }}
                        labelStyle={{ color: '#A3E635', fontSize: '10px', marginBottom: '4px', fontFamily: 'ui-monospace, monospace' }}
                        cursor={{ fill: 'rgba(163,230,53,0.04)' }}
                        formatter={(value: any, name: any) => [fmt(value as number), name === 'metricaAvg' ? 'Média ' + options.find(o => o.value === metric)?.label : 'Média Engajamento']}
                    />
                    
                    <Bar name={options.find(o => o.value === metric)?.label} dataKey="metricaAvg" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {data.map((entry) => (
                            <Cell
                                key={`metrica-${entry.dia}`}
                                fill={entry.metricaAvg === maxValue && maxValue > 0 ? '#A3E635' : 'rgba(163,230,53,0.15)'}
                            />
                        ))}
                    </Bar>
                    <Bar name="Engajamento" dataKey="engAvg" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {data.map((entry) => (
                            <Cell
                                key={`eng-${entry.dia}`}
                                fill={entry.engAvg === maxEngValue && maxEngValue > 0 ? '#FBBF24' : 'rgba(251,191,36,0.15)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-4 pt-2 border-t mt-2" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#A3E635' }} /> Métrica
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#FBBF24' }} /> Engajamento
                </span>
            </div>
        </div>
    );
});
