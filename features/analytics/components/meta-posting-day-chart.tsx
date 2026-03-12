'use client';

import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell, Legend
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

export function MetaPostingDayChart({ posts }: Props) {
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

    return (
        <div className="space-y-4">
            <div className="flex gap-2 mb-2 flex-wrap">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setMetric(opt.value as any)}
                        className={`text-[10px] sm:text-xs px-3 py-1.5 font-medium rounded-full transition-colors border ${
                            metric === opt.value
                                ? 'bg-[#FF7350]/20 text-[#FF7350] border-[#FF7350]/50'
                                : 'bg-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-primary)] border-[var(--v2-border)]'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--v2-border)" opacity={0.5} />
                    <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 11, fill: 'var(--v2-text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--v2-bg-surface-hover)',
                            borderColor: 'var(--v2-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--v2-text-primary)'
                        }}
                        labelStyle={{ color: 'var(--v2-text-secondary)', marginBottom: '4px' }}
                        cursor={{ fill: 'var(--v2-bg-surface)', opacity: 0.2 }}
                        formatter={(value: any, name: any) => [fmt(value as number), name === 'metricaAvg' ? 'Média ' + options.find(o => o.value === metric)?.label : 'Média Engajamento']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar name={options.find(o => o.value === metric)?.label} dataKey="metricaAvg" radius={[4, 4, 0, 0]}>
                        {data.map((entry) => (
                            <Cell
                                key={`metrica-${entry.dia}`}
                                fill={entry.metricaAvg === maxValue && maxValue > 0 ? '#FF7350' : 'rgba(255,115,80,0.3)'}
                            />
                        ))}
                    </Bar>
                    <Bar name="Engajamento" dataKey="engAvg" radius={[4, 4, 0, 0]}>
                        {data.map((entry) => (
                            <Cell
                                key={`eng-${entry.dia}`}
                                fill={entry.engAvg === maxEngValue && maxEngValue > 0 ? '#8b5cf6' : 'rgba(139,92,246,0.3)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
