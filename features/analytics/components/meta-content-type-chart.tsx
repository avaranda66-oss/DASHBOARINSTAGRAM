'use client';

import { memo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, 
    ResponsiveContainer, CartesianGrid, Cell 
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

export const MetaContentTypeChart = memo(function MetaContentTypeChart({ posts }: Props) {
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
            <div 
                className="flex flex-col items-center justify-center h-[220px] rounded-[8px] border" 
                style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}
            >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#3A3A3A]">No_Data</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">Desempenho por Tipo</span>
                <span className="font-mono text-[10px] text-[#A3E635] opacity-80">[{data.length.toString().padStart(2, '0')} tipos]</span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="tipo"
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                        width={42}
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
                    />
                    
                    <Bar dataKey="Alcance" fill="#A3E635" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                    <Bar dataKey="Saves" fill="#FBBF24" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                    <Bar dataKey="Shares" fill="#8A8A8A" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                    <Bar dataKey="Likes" fill="rgba(163,230,53,0.35)" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-4 pt-2 border-t mt-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#A3E635' }} /> Alcance
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#FBBF24' }} /> Saves
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#8A8A8A' }} /> Shares
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: 'rgba(163,230,53,0.35)' }} /> Likes
                </span>
            </div>
        </div>
    );
});
