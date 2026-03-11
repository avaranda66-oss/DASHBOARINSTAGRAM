'use client';

import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

interface MetaPost {
    timestamp: string;
    reach?: number;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg bg-[var(--v2-bg-surface)] backdrop-blur-xl border border-[var(--v2-border)] shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-3 py-2 text-xs">
            <p className="text-[var(--v2-text-tertiary)] text-[10px] font-medium uppercase tracking-widest">{label}</p>
            <p className="text-[#FF7350] font-mono font-bold mt-0.5">Alcance médio: {fmt(payload[0].value)}</p>
        </div>
    );
}

export function MetaPostingDayChart({ posts }: Props) {
    const dayMap: Record<string, { count: number; totalReach: number }> = {};
    DAYS.forEach((d) => { dayMap[d] = { count: 0, totalReach: 0 }; });

    posts.forEach((p) => {
        if (!p.timestamp) return;
        const day = DAYS[new Date(p.timestamp).getDay()];
        dayMap[day].count += 1;
        dayMap[day].totalReach += p.reach ?? 0;
    });

    const data = DAYS.map((day) => ({
        dia: day,
        'Alcance médio': dayMap[day].count > 0 ? Math.round(dayMap[day].totalReach / dayMap[day].count) : 0,
        posts: dayMap[day].count,
    }));

    const maxValue = Math.max(...data.map((d) => d['Alcance médio']));

    return (
        <div className="space-y-2">
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 11, fill: '#6B6873', fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#6B6873', fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                        width={42}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Alcance médio" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {data.map((entry) => (
                            <Cell
                                key={entry.dia}
                                fill={entry['Alcance médio'] === maxValue && maxValue > 0 ? '#FF7350' : 'rgba(255,115,80,0.15)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-[var(--v2-text-tertiary)] px-1">
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FF7350]" />
                    <span>Melhor dia</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FF7350]/15" />
                    <span>Outros dias</span>
                </div>
                <span className="ml-auto text-[10px]">
                    {data.map(d => d.posts > 0 ? `${d.dia}: ${d.posts} posts` : null).filter(Boolean).join(' · ')}
                </span>
            </div>
        </div>
    );
}
