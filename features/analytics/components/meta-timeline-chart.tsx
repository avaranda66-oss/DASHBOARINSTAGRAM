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
        <div className="rounded-lg bg-[var(--v2-bg-surface)] backdrop-blur-xl border border-[var(--v2-border)] shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-3 py-2 text-xs space-y-1 max-w-[220px]">
            <p className="text-[var(--v2-text-tertiary)] text-[10px] font-medium uppercase tracking-widest mb-1.5">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
                    <span className="text-[var(--v2-text-primary)] font-mono font-bold">{fmt(entry.value)}</span>
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
                        <stop offset="5%" stopColor="#FF7350" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FF7350" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6B6873', fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: 'var(--v2-text-tertiary)' }}
                    iconType="circle"
                    iconSize={7}
                />
                <Area
                    type="monotone"
                    dataKey="Alcance"
                    stroke="#FF7350"
                    strokeWidth={2}
                    fill="url(#colorReach)"
                    dot={false}
                    activeDot={{ r: 4, stroke: '#0A0A0C', strokeWidth: 2, fill: '#FF7350' }}
                />
                <Area
                    type="monotone"
                    dataKey="Saves"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#colorSaves)"
                    dot={false}
                    activeDot={{ r: 4, stroke: '#0A0A0C', strokeWidth: 2, fill: '#f59e0b' }}
                />
                <Area
                    type="monotone"
                    dataKey="Shares"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorShares)"
                    dot={false}
                    activeDot={{ r: 4, stroke: '#0A0A0C', strokeWidth: 2, fill: '#10b981' }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
