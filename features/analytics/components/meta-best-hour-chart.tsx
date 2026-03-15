'use client';

import { memo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface MetaPost {
    timestamp: string;
    reach?: number;
    likesCount: number;
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

export const MetaBestHourChart = memo(function MetaBestHourChart({ posts }: Props) {
    const hourMap: Record<number, { count: number; totalReach: number; totalEng: number }> = {};
    for (let i = 0; i < 24; i++) {
        hourMap[i] = { count: 0, totalReach: 0, totalEng: 0 };
    }

    posts.forEach((p) => {
        if (!p.timestamp) return;
        const date = new Date(p.timestamp);
        const hour = date.getHours();
        hourMap[hour].count += 1;
        hourMap[hour].totalReach += p.reach ?? 0;
        hourMap[hour].totalEng += p.likesCount + (p.commentsCount ?? 0);
    });

    const data = Object.keys(hourMap).map((h) => {
        const hour = parseInt(h);
        const obj = hourMap[hour];
        return {
            hourText: `${hour.toString().padStart(2, '0')}h`,
            Alcance: obj.count > 0 ? Math.round(obj.totalReach / obj.count) : 0,
            Engajamento: obj.count > 0 ? Math.round(obj.totalEng / obj.count) : 0,
            posts: obj.count,
        };
    }).filter(d => d.posts > 0);

    const maxValue = Math.max(...data.map((d) => d.Alcance), 1);
    const bestHourData = data.find(d => d.Alcance === maxValue);

    if (data.length === 0) {
        return (
            <div 
                className="flex flex-col items-center justify-center h-[260px] rounded-[8px] border" 
                style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}
            >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#3A3A3A]">No_Data</span>
            </div>
        );
    }

    data.sort((a, b) => parseInt(a.hourText) - parseInt(b.hourText));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">Melhor Horário</span>
                {bestHourData && (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#3A3A3A] uppercase">peak</span>
                        <span className="font-mono text-sm font-bold text-[#A3E635]">{bestHourData.hourText}</span>
                        <span className="font-mono text-[9px] text-[#3A3A3A]">avg {fmt(bestHourData.Alcance)}</span>
                    </div>
                )}
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                        dataKey="hourText"
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
                        formatter={(value: any, name: any) => [fmt(value as number), name === 'Alcance' ? 'Média de Alcance' : 'Média de Engajamento']}
                    />
                    <Bar name="Média de Alcance" dataKey="Alcance" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {data.map((entry) => (
                            <Cell
                                key={`reach-${entry.hourText}`}
                                fill={entry.Alcance === maxValue && maxValue > 0 ? '#A3E635' : 'rgba(163,230,53,0.15)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});
