'use client';

import { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Line, Dot
} from 'recharts';
// Dual Y-axis: left=Alcance, right=Saves+Shares (escalas muito diferentes)
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetaPost {
    timestamp: string;
    reach?: number;
    saved?: number;
    shares?: number;
    likesCount: number;
    commentsCount?: number;
    caption?: string;
    media_product_type?: string;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const isReel = payload.type === 'REELS';
    return (
        <circle 
            key={`dot-${cx}-${cy}`}
            cx={cx} cy={cy} r={3} 
            stroke="var(--v2-bg-surface)" 
            strokeWidth={1} 
            fill={isReel ? '#ec4899' : '#3b82f6'} 
        />
    );
};

export function MetaTimelineChart({ posts }: Props) {
    const [view, setView] = useState<'reach' | 'engagement'>('reach');

    const sorted = [...posts]
        .filter((p) => p.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate moving average (window=3)
    const computeMovingAverage = (index: number, key: 'reach' | 'likesCount') => {
        const start = Math.max(0, index - 2);
        const window = sorted.slice(start, index + 1);
        const sum = window.reduce((acc, p) => acc + (p[key] || 0), 0);
        return Math.round(sum / window.length);
    };

    const data = sorted.map((p, i) => ({
        date: format(parseISO(p.timestamp), 'dd/MM/yy', { locale: ptBR }),
        Alcance: p.reach ?? 0,
        Alcance_Trend: computeMovingAverage(i, 'reach'),
        Saves: p.saved ?? 0,
        Shares: p.shares ?? 0,
        Likes: p.likesCount ?? 0,
        Likes_Trend: computeMovingAverage(i, 'likesCount'),
        Comments: p.commentsCount ?? 0,
        type: p.media_product_type,
    }));

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                Sem dados suficientes para o gráfico
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 mb-2 flex-wrap">
                <button
                    onClick={() => setView('reach')}
                    className={`text-[10px] sm:text-xs px-3 py-1.5 font-medium rounded-full transition-colors border ${
                        view === 'reach'
                            ? 'bg-[#FF7350]/20 text-[#FF7350] border-[#FF7350]/50'
                            : 'bg-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-primary)] border-[var(--v2-border)]'
                    }`}
                >
                    Alcance & Saves
                </button>
                <button
                    onClick={() => setView('engagement')}
                    className={`text-[10px] sm:text-xs px-3 py-1.5 font-medium rounded-full transition-colors border ${
                        view === 'engagement'
                            ? 'bg-pink-500/20 text-pink-400 border-pink-500/50'
                            : 'bg-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-primary)] border-[var(--v2-border)]'
                    }`}
                >
                    Likes & Comentários
                </button>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data} margin={{ top: 10, right: 35, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF7350" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#FF7350" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9, fill: 'var(--v2-text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                        width={30}
                    />
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: 'var(--v2-bg-surface-hover)',
                            borderColor: 'var(--v2-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--v2-text-primary)'
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--v2-text-tertiary)' }}
                        iconType="circle"
                    />
                    
                    {view === 'reach' ? (
                        <>
                            <Area
                                yAxisId="left"
                                type="monotone"
                                name="Alcance"
                                dataKey="Alcance"
                                stroke="#FF7350"
                                strokeWidth={2}
                                fill="url(#colorReach)"
                                dot={renderDot}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                name="Tendência (Alcance)"
                                dataKey="Alcance_Trend"
                                stroke="#FF7350"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line yAxisId="right" type="monotone" name="Saves" dataKey="Saves" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" name="Shares" dataKey="Shares" stroke="#10b981" strokeWidth={2} dot={false} />
                        </>
                    ) : (
                        <>
                            <Area
                                yAxisId="left"
                                type="monotone"
                                name="Likes"
                                dataKey="Likes"
                                stroke="#ec4899"
                                strokeWidth={2}
                                fill="url(#colorLikes)"
                                dot={renderDot}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                name="Tendência (Likes)"
                                dataKey="Likes_Trend"
                                stroke="#ec4899"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line yAxisId="right" type="monotone" name="Comentários" dataKey="Comments" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
            
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground px-2 pt-2">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ec4899]"></div> Reels</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div> Feed / Sidecar</span>
            </div>
        </div>
    );
}
