'use client';

import { memo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface MetaPost {
    reach?: number;
    saved?: number;
    shares?: number;
    commentsCount: number;
    likesCount: number;
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

export const MetaReelsChart = memo(function MetaReelsChart({ posts }: Props) {
    const reels = posts.filter(p => p.media_product_type === 'REELS');
    const feed = posts.filter(p => !p.media_product_type || p.media_product_type === 'FEED' || p.media_product_type === 'CAROUSEL_ALBUM');

    const totalReelsReach = reels.reduce((acc, p) => acc + (p.reach ?? 0), 0);
    const avgReelsReach = reels.length > 0 ? Math.round(totalReelsReach / reels.length) : 0;
    
    const totalFeedReach = feed.reduce((acc, p) => acc + (p.reach ?? 0), 0);
    const avgFeedReach = feed.length > 0 ? Math.round(totalFeedReach / feed.length) : 0;

    const totalReelsSaves = reels.reduce((acc, p) => acc + (p.saved ?? 0), 0);
    const totalReelsShares = reels.reduce((acc, p) => acc + (p.shares ?? 0), 0);
    const totalReelsLikes = reels.reduce((acc, p) => acc + p.likesCount, 0);

    const data = [
        { name: 'Reels', AlcanceMédio: avgReelsReach },
        { name: 'Feed/Carrossel', AlcanceMédio: avgFeedReach }
    ];

    if (posts.length === 0) {
        return (
            <div 
                className="flex flex-col items-center justify-center h-[200px] rounded-[8px] border" 
                style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#141414' }}
            >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#3A3A3A]">No_Data</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">Performance Reels</span>
                <span className="font-mono text-[10px] text-[#A3E635] opacity-80">[{reels.length.toString().padStart(2, '0')} reels]</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-[6px] border p-3" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0A0A0A' }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A3A] mb-1">Total Reels</p>
                    <p className="font-mono text-xl font-bold text-[#A3E635]">{reels.length}</p>
                </div>
                <div className="rounded-[6px] border p-3" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0A0A0A' }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A3A] mb-1">Engajamento Reels</p>
                    <p className="font-mono text-xl font-bold text-[#A3E635]">{fmt(totalReelsSaves + totalReelsShares + totalReelsLikes)}</p>
                    <p className="font-mono text-[9px] text-[#3A3A3A] mt-1">likes + saves + shares</p>
                </div>
            </div>

            <div className="space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A3A] block mb-2">Reels vs Feed · alcance médio</span>
                <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#3A3A3A', fontFamily: 'ui-monospace, monospace' }} 
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
                            <Bar dataKey="AlcanceMédio" radius={[0, 3, 3, 0]} maxBarSize={28} isAnimationActive={false}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Reels' ? '#A3E635' : '#FBBF24'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});
