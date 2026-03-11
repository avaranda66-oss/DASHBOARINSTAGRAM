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
        <div className="rounded-lg bg-[var(--v2-bg-surface)] backdrop-blur-xl border border-[var(--v2-border)] shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-3 py-2 text-xs space-y-1">
            <p className="text-[var(--v2-text-tertiary)] text-[10px] font-medium uppercase tracking-widest mb-1">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: entry.color }}>{entry.name}</span>
                    <span className="text-[var(--v2-text-primary)] font-mono font-bold">{fmt(entry.value)}</span>
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
                <defs>
                    <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF7350" stopOpacity={1} />
                        <stop offset="100%" stopColor="#FF7350" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradSaves" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#746C7E" stopOpacity={1} />
                        <stop offset="100%" stopColor="#746C7E" stopOpacity={0.6} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                    dataKey="tipo"
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
                <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: 'var(--v2-text-tertiary)' }}
                    iconType="circle"
                    iconSize={7}
                />
                <Bar dataKey="Alcance" fill="url(#gradReach)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Saves" fill="url(#gradSaves)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Shares" fill="url(#gradShares)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Likes" fill="url(#gradLikes)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ResponsiveContainer>
    );
}
