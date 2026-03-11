'use client';

import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';

interface MetaPost {
    type: string;
    reach?: number;
    saved?: number;
    shares?: number;
    likesCount: number;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

const TYPE_LABELS: Record<string, string> = {
    Image: 'Foto',
    Video: 'Vídeo',
    Sidecar: 'Carrossel',
};

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs space-y-1">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: entry.color }}>{entry.name}</span>
                    <span className="font-bold">{fmt(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

export function MetaContentTypeChart({ posts }: Props) {
    const typeMap: Record<string, { reach: number[]; saves: number[]; shares: number[]; likes: number[] }> = {};

    posts.forEach((p) => {
        const t = p.type ?? 'Image';
        if (!typeMap[t]) typeMap[t] = { reach: [], saves: [], shares: [], likes: [] };
        typeMap[t].reach.push(p.reach ?? 0);
        typeMap[t].saves.push(p.saved ?? 0);
        typeMap[t].shares.push(p.shares ?? 0);
        typeMap[t].likes.push(p.likesCount);
    });

    const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0);

    const data = Object.entries(typeMap).map(([type, d]) => ({
        tipo: TYPE_LABELS[type] ?? type,
        Alcance: avg(d.reach),
        Saves: avg(d.saves),
        Shares: avg(d.shares),
        Likes: avg(d.likes),
        count: d.reach.length,
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
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                    dataKey="tipo"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
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
                <Bar dataKey="Alcance" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Saves" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Shares" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ResponsiveContainer>
    );
}
