'use client';

import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell, Legend
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

export function MetaBestHourChart({ posts }: Props) {
    // 0 to 23 hours
    const hourMap: Record<number, { count: number; totalReach: number, totalEng: number }> = {};
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
    }).filter(d => d.posts > 0); // Only show hours that have posts to keep chart clean

    const maxValue = Math.max(...data.map((d) => d.Alcance), 1); // fallback to 1 to avoid NaN
    const bestHourData = data.find(d => d.Alcance === maxValue);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground w-full border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                Sem dados de postagens (horários).
            </div>
        );
    }

    // Sort chronologically
    data.sort((a, b) => parseInt(a.hourText) - parseInt(b.hourText));

    return (
        <div className="space-y-4">
             <div className="mb-2">
                <p className="text-sm font-medium">Melhor Horário: <span className="text-[#FF7350]">{bestHourData?.hourText}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Média de {fmt(bestHourData?.Alcance || 0)} alcance.</p>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--v2-border)" opacity={0.5} />
                    <XAxis
                        dataKey="hourText"
                        tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
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
                        formatter={(value: any, name: any) => [fmt(value as number), name === 'Alcance' ? 'Média de Alcance' : 'Média de Engajamento']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar name="Média de Alcance" dataKey="Alcance" radius={[4, 4, 0, 0]}>
                        {data.map((entry) => (
                            <Cell
                                key={`reach-${entry.hourText}`}
                                fill={entry.Alcance === maxValue && maxValue > 0 ? '#FF7350' : 'rgba(255,115,80,0.3)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
