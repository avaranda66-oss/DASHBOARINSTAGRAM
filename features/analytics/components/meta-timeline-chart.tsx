'use client';

import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetaPost {
    timestamp: string;
    reach?: number;
    saved?: number;
    shares?: number;
    likesCount: number;
    caption?: string;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs space-y-1 max-w-[220px]">
            <p className="font-medium text-foreground mb-1.5">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
                    <span className="font-bold">{fmt(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

export function MetaTimelineChart({ posts }: Props) {
    const sorted = [...posts]
        .filter((p) => p.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const data = sorted.map((p) => ({
        date: format(parseISO(p.timestamp), 'dd/MM', { locale: ptBR }),
        Alcance: p.reach ?? 0,
        Saves: p.saved ?? 0,
        Shares: p.shares ?? 0,
    }));

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Sem dados suficientes para o gráfico
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmt}
                    width={42}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                    iconSize={8}
                />
                <Area
                    type="monotone"
                    dataKey="Alcance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorReach)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                    type="monotone"
                    dataKey="Saves"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#colorSaves)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                    type="monotone"
                    dataKey="Shares"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorShares)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
