'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { InstagramPostMetrics, MetaPostMetrics } from '@/types/analytics';
import { linearTrend, engagementScore } from '@/lib/utils/statistics';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface MetaPost extends InstagramPostMetrics {
    reach?: number;
    saved?: number;
    shares?: number;
    totalInteractions?: number;
    ig_reels_avg_watch_time?: number;
    media_product_type?: string;
    source?: 'meta';
}

export interface MetaKpiCardsProps {
    posts: MetaPost[];
    accountProfile?: {
        followersCount?: number;
        name?: string;
    };
}

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatNumber(n: number): string {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(n);
}

function SimpleSparkline({ data, color }: { data: number[], color: string }) {
    if (data.length < 2) return null;
    const chartData = data.map((value, i) => ({ i, value }));
    return (
        <div className="mt-2 h-6 w-full opacity-30 group-hover:opacity-70 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill="none"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MetaKpiCards({ posts, accountProfile }: MetaKpiCardsProps) {
    const kpis = useMemo(() => {
        const sortedPosts = [...posts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        let totalReach = 0;
        let totalLikes = 0;
        let totalSaves = 0;
        let totalShares = 0;
        let totalComments = 0;
        let reachSumForEng = 0;
        let engSumForEng = 0;
        
        let reelsWatchTimeSum = 0;
        let reelsCount = 0;

        const reachHistory: number[] = [];
        const likesHistory: number[] = [];
        const savesHistory: number[] = [];
        const sharesHistory: number[] = [];
        const commentsHistory: number[] = [];
        const engRateHistory: number[] = [];

        sortedPosts.forEach((post) => {
            const reach = post.reach ?? 0;
            const likes = post.likesCount ?? 0;
            const saves = post.saved ?? 0;
            const shares = post.shares ?? 0;
            const comments = post.commentsCount ?? 0;

            totalReach += reach;
            totalLikes += likes;
            totalSaves += saves;
            totalShares += shares;
            totalComments += comments;

            reachHistory.push(reach);
            likesHistory.push(likes);
            savesHistory.push(saves);
            sharesHistory.push(shares);
            commentsHistory.push(comments);

            if (reach > 0) {
                reachSumForEng += reach;
                const eng = likes + comments + saves + shares;
                engSumForEng += eng;
                engRateHistory.push((eng / reach) * 100);
            }

            if ((post.type === 'Video' || post.media_product_type === 'REELS') && post.ig_reels_avg_watch_time != null) {
                // Meta API retorna ig_reels_avg_watch_time em milissegundos — converter para segundos
                reelsWatchTimeSum += post.ig_reels_avg_watch_time / 1000;
                reelsCount++;
            }
        });

        const avgEngRate = reachSumForEng > 0 ? (engSumForEng / reachSumForEng) * 100 : 0;
        const avgWatchTime = reelsCount > 0 ? reelsWatchTimeSum / reelsCount : null;

        // Meta-exclusive: Save Rate, Share Rate, Depth Score
        const saveRateHistory: number[] = [];
        const shareRateHistory: number[] = [];
        sortedPosts.forEach((post) => {
            const reach = post.reach ?? 0;
            const saves = post.saved ?? 0;
            const shares = post.shares ?? 0;
            if (reach > 0) {
                saveRateHistory.push((saves / reach) * 100);
                shareRateHistory.push((shares / reach) * 100);
            }
        });

        const saveRate = totalReach > 0 ? (totalSaves / totalReach) * 100 : 0;
        const shareRate = totalReach > 0 ? (totalShares / totalReach) * 100 : 0;

        // Engagement Depth Score (0-100) using full Meta weights
        const depthScores = sortedPosts.map(post => engagementScore({
            likes: post.likesCount ?? 0,
            comments: post.commentsCount ?? 0,
            views: post.videoViewCount ?? 0,
            saves: post.saved ?? 0,
            shares: post.shares ?? 0,
        }));
        const avgDepthScore = depthScores.length > 0 ? depthScores.reduce((a, b) => a + b, 0) / depthScores.length : 0;

        // Best content type by reach
        const typeReach: Record<string, { sum: number; count: number }> = {};
        sortedPosts.forEach(post => {
            const reach = post.reach ?? 0;
            const type = post.type === 'Video' ? 'Reels' : post.type === 'Sidecar' ? 'Carrossel' : 'Imagem';
            if (!typeReach[type]) typeReach[type] = { sum: 0, count: 0 };
            typeReach[type].sum += reach;
            typeReach[type].count++;
        });
        const bestType = Object.entries(typeReach)
            .map(([type, d]) => ({ type, avgReach: d.count > 0 ? d.sum / d.count : 0 }))
            .sort((a, b) => b.avgReach - a.avgReach)[0] ?? null;

        return {
            totalReach, reachHistory,
            totalLikes, likesHistory,
            totalSaves, savesHistory,
            totalShares, sharesHistory,
            totalComments, commentsHistory,
            avgEngRate, engRateHistory,
            avgWatchTime,
            saveRate, saveRateHistory,
            shareRate, shareRateHistory,
            avgDepthScore, depthScores,
            bestType,
        };
    }, [posts]);

    const cards = [
        {
            label: 'Seguidores',
            value: accountProfile?.followersCount != null ? formatNumber(accountProfile.followersCount) : 'N/D',
            sub: accountProfile?.name ?? 'Dados do perfil',
            icon: '◎',
            accentColor: '#A3E635',
        },
        {
            label: 'Alcance Total',
            value: formatNumber(kpis.totalReach),
            sub: 'Soma de todos os posts',
            icon: '◎',
            accentColor: '#3E63DD', // HUD Info (Reach)
            sparkData: kpis.reachHistory,
            trend: linearTrend(kpis.reachHistory),
        },
        {
            label: 'Total Likes',
            value: formatNumber(kpis.totalLikes),
            sub: 'Soma de todos os posts',
            icon: '▲',
            accentColor: '#A3E635', // HUD Accent (Likes)
            sparkData: kpis.likesHistory,
            trend: linearTrend(kpis.likesHistory),
        },
        {
            label: 'Total Saves',
            value: formatNumber(kpis.totalSaves),
            sub: 'Soma de todos os posts',
            icon: '◆',
            accentColor: '#F59E0B', // HUD Warning (Saves)
            sparkData: kpis.savesHistory,
            trend: linearTrend(kpis.savesHistory),
        },
        {
            label: 'Total Shares',
            value: formatNumber(kpis.totalShares),
            sub: 'Soma de todos os posts',
            icon: '↗',
            accentColor: '#10B981', // HUD Success (Shares)
            sparkData: kpis.sharesHistory,
            trend: linearTrend(kpis.sharesHistory),
        },
        {
            label: 'Total Comentários',
            value: formatNumber(kpis.totalComments),
            sub: 'Soma de todos os posts',
            icon: '◐',
            accentColor: '#D4D4D4', // HUD Text Primary (Comments)
            sparkData: kpis.commentsHistory,
            trend: linearTrend(kpis.commentsHistory),
        },
        {
            label: 'Eng. Rate',
            value: kpis.avgEngRate > 0 ? `${kpis.avgEngRate.toFixed(2)}%` : '0%',
            sub: '(Interações / Alcance)',
            icon: '↗',
            accentColor: '#A3E635', // HUD Accent (Eng. Rate)
            sparkData: kpis.engRateHistory,
            trend: linearTrend(kpis.engRateHistory),
        },
        {
            label: 'Avg Watch Time',
            value: kpis.avgWatchTime != null ? `${kpis.avgWatchTime.toFixed(1)}s` : 'Sem Reels',
            sub: 'Tempo médio (Reels)',
            icon: '◷',
            accentColor: '#EF4444', // HUD Error (Watch Time)
        },
        // Meta-exclusive cards (only when reach data exists)
        ...(kpis.totalReach > 0 ? [
            {
                label: 'Save Rate',
                value: `${kpis.saveRate.toFixed(2)}%`,
                sub: 'Saves / Alcance',
                icon: '◆',
                accentColor: '#F59E0B', // HUD Warning (Save Rate)
                sparkData: kpis.saveRateHistory,
                trend: linearTrend(kpis.saveRateHistory),
            },
            {
                label: 'Share Rate',
                value: `${kpis.shareRate.toFixed(2)}%`,
                sub: 'Shares / Alcance',
                icon: '↗',
                accentColor: '#3E63DD', // HUD Info (Share Rate)
                sparkData: kpis.shareRateHistory,
                trend: linearTrend(kpis.shareRateHistory),
            },
            {
                label: 'Depth Score',
                value: `${kpis.avgDepthScore.toFixed(0)}/100`,
                sub: 'Score ponderado (saves>shares>comments>likes)',
                icon: '◎',
                accentColor: '#A3E635', // HUD Accent (Depth Score)
                sparkData: kpis.depthScores,
                trend: linearTrend(kpis.depthScores),
            },
            ...(kpis.bestType ? [{
                label: 'Melhor Tipo',
                value: kpis.bestType.type,
                sub: `${formatNumber(Math.round(kpis.bestType.avgReach))} alcance médio`,
                icon: '◎',
                accentColor: '#D4D4D4', // HUD Text Primary (Melhor Tipo)
            }] : []),
        ] : []),
    ];

    return (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {cards.map((card) => (
                <motion.div
                    key={card.label}
                    variants={item}
                    className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 v2-glass v2-glass-hover"
                >
                    <div className="v2-grain pointer-events-none absolute inset-0 z-[1]" />
                    <div
                        className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
                        style={{ background: card.accentColor }}
                    />
                    <div className="relative z-[2]">
                        <div className="flex items-center justify-between">
                            <span className="v2-label">{card.label}</span>
                             <span className="font-mono text-sm leading-none" style={{ color: card.accentColor, opacity: 0.8 }}>{card.icon}</span>
                        </div>
                        <p className="mt-2 text-2xl font-mono v2-number font-bold tracking-tight" style={{ color: '#F5F5F5' }}>
                            {card.value}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight" style={{ color: '#8A8A8A' }}>{card.sub}</p>
                        
                        {card.trend && (
                            <div className="mt-2 flex items-center gap-1.5">
                                {card.trend.direction === 'rising' ? (
                                    <span className="font-mono text-xs" style={{ color: '#10B981' }}>↗</span>
                                ) : card.trend.direction === 'falling' ? (
                                    <span className="font-mono text-xs" style={{ color: '#EF4444' }}>↘</span>
                                ) : (
                                    <span className="font-mono text-xs" style={{ color: '#8A8A8A' }}>—</span>
                                )}
                                <span className="text-[9px] font-mono" style={{ color: card.trend.direction === 'rising' ? '#10B981' : card.trend.direction === 'falling' ? '#EF4444' : '#8A8A8A' }}>
                                    {card.trend.direction === 'rising' ? 'Crescendo' : card.trend.direction === 'falling' ? 'Caindo' : 'Estável'}
                                </span>
                            </div>
                        )}
                        
                        {card.sparkData && card.sparkData.length > 1 && (
                            <SimpleSparkline data={card.sparkData.slice(-10)} color={card.accentColor} />
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
