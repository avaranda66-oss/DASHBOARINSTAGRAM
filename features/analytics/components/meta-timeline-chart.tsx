'use client';

import { useState, memo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ComposedChart, Line
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
            cx={cx} cy={cy}
            r={isReel ? 4 : 3}
            stroke="#0A0A0A"
            strokeWidth={1}
            fill={isReel ? '#A3E635' : 'rgba(163,230,53,0.5)'}
        />
    );
};

export const MetaTimelineChart = memo(function MetaTimelineChart({ posts }: Props) {
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
            <div
                className="flex flex-col items-center justify-center h-[260px] rounded-[8px] border"
                style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}
            >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#3A3A3A]">
                    No_Data
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header HUD */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">
                        Evolução do Engajamento
                    </span>
                    <span className="font-mono text-[10px] text-[#A3E635] opacity-80">
                        [{sorted.length.toString().padStart(2, '0')} posts]
                    </span>
                </div>
            </div>

            {/* Toggle buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setView('reach')}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-1 border transition-colors rounded-[3px]"
                    style={view === 'reach'
                        ? { color: '#A3E635', borderColor: 'rgba(163,230,53,0.3)', backgroundColor: 'rgba(163,230,53,0.06)' }
                        : { color: '#4A4A4A', borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }
                    }
                >
                    Alcance + Saves
                </button>
                <button
                    onClick={() => setView('engagement')}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-1 border transition-colors rounded-[3px]"
                    style={view === 'engagement'
                        ? { color: '#A3E635', borderColor: 'rgba(163,230,53,0.3)', backgroundColor: 'rgba(163,230,53,0.06)' }
                        : { color: '#4A4A4A', borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }
                    }
                >
                    Likes + Comentários
                </button>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data} margin={{ top: 8, right: 28, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="hudAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A3E635" stopOpacity={0.20} />
                            <stop offset="95%" stopColor="#A3E635" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmt}
                        width={28}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#141414',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'ui-monospace, monospace',
                            color: '#F5F5F5',
                            padding: '8px 12px',
                        }}
                        itemStyle={{ color: '#8A8A8A', fontSize: '10px' }}
                        labelStyle={{ color: '#A3E635', fontSize: '10px', marginBottom: '4px', fontFamily: 'ui-monospace, monospace' }}
                        cursor={{ stroke: 'rgba(163,230,53,0.2)', strokeWidth: 1 }}
                    />

                    {view === 'reach' ? (
                        <>
                            <Area
                                yAxisId="left"
                                type="monotone"
                                name="Alcance"
                                dataKey="Alcance"
                                stroke="#A3E635"
                                strokeWidth={2}
                                fill="url(#hudAreaGradient)"
                                dot={renderDot}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                name="Tendência (Alcance)"
                                dataKey="Alcance_Trend"
                                stroke="rgba(163,230,53,0.45)"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                            <Line yAxisId="right" type="monotone" name="Saves" dataKey="Saves" stroke="#FBBF24" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line yAxisId="right" type="monotone" name="Shares" dataKey="Shares" stroke="#8A8A8A" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </>
                    ) : (
                        <>
                            <Area
                                yAxisId="left"
                                type="monotone"
                                name="Likes"
                                dataKey="Likes"
                                stroke="#A3E635"
                                strokeWidth={2}
                                fill="url(#hudAreaGradient)"
                                dot={renderDot}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                name="Tendência (Likes)"
                                dataKey="Likes_Trend"
                                stroke="rgba(163,230,53,0.45)"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                            <Line yAxisId="right" type="monotone" name="Comentários" dataKey="Comments" stroke="#FBBF24" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>

            {/* Legend HUD */}
            <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#A3E635' }} />
                    Reels
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#3A3A3A]">
                    <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: 'rgba(163,230,53,0.4)' }} />
                    Feed / Carrossel
                </span>
            </div>
        </div>
    );
});
