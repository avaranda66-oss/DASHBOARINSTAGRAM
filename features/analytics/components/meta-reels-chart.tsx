'use client';

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
    video_views?: number;
    average_video_watch_time?: number; // Might vary what name it is, maybe just use standard metrics if undefined
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

export function MetaReelsChart({ posts }: Props) {
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
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
                Sem dados de postagens.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/30 rounded-lg p-4 border border-[var(--v2-border)]">
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Total de Reels</p>
                    <p className="text-2xl font-bold font-mono text-purple-400">{reels.length}</p>
                </div>
                <div className="bg-zinc-900/30 rounded-lg p-4 border border-[var(--v2-border)]">
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Engajamento Reels</p>
                    <p className="text-2xl font-bold font-mono text-purple-400">{fmt(totalReelsSaves + totalReelsShares + totalReelsLikes)}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">likes + saves + shares</p>
                </div>
            </div>

            <div>
                <p className="text-sm font-semibold mb-3">Reels VS Feed (Alcance Médio)</p>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--v2-border)" opacity={0.5} />
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: 'var(--v2-text-tertiary)' }} 
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--v2-bg-surface-hover)',
                                    borderColor: 'var(--v2-border)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'var(--v2-text-primary)'
                                }}
                                cursor={{ fill: 'var(--v2-bg-surface)', opacity: 0.2 }}
                            />
                            <Bar dataKey="AlcanceMédio" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Reels' ? '#c026d3' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
