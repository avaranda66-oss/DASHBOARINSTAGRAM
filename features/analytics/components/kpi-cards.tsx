'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, TrendingUp, Users, Bookmark, Share2, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { InstagramPostMetrics } from '@/types/analytics';
import { linearTrend } from '@/lib/utils/statistics';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface MetaPost extends InstagramPostMetrics {
    reach?: number;
    saved?: number;
    shares?: number;
    totalInteractions?: number;
    ig_reels_avg_watch_time?: number;
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

            if ((post.type === 'Video' || (post as any).mediaProductType === 'REELS') && (post as any).ig_reels_avg_watch_time != null) {
                reelsWatchTimeSum += (post as any).ig_reels_avg_watch_time;
                reelsCount++;
            }
        });

        const avgEngRate = reachSumForEng > 0 ? (engSumForEng / reachSumForEng) * 100 : 0;
        const avgWatchTime = reelsCount > 0 ? reelsWatchTimeSum / reelsCount : null;

        return {
            totalReach, reachHistory,
            totalLikes, likesHistory,
            totalSaves, savesHistory,
            totalShares, sharesHistory,
            totalComments, commentsHistory,
            avgEngRate, engRateHistory,
            avgWatchTime
        };
    }, [posts]);

    const cards = [
        {
            label: 'Seguidores',
            value: accountProfile?.followersCount != null ? formatNumber(accountProfile.followersCount) : 'N/D',
            sub: accountProfile?.name ?? 'Dados do perfil',
            icon: Users,
            accentColor: 'var(--v2-accent)',
        },
        {
            label: 'Alcance Total',
            value: formatNumber(kpis.totalReach),
            sub: 'Soma de todos os posts',
            icon: Eye,
            accentColor: '#3b82f6', // blue
            sparkData: kpis.reachHistory,
            trend: linearTrend(kpis.reachHistory),
        },
        {
            label: 'Total Likes',
            value: formatNumber(kpis.totalLikes),
            sub: 'Soma de todos os posts',
            icon: Heart,
            accentColor: '#ec4899', // pink
            sparkData: kpis.likesHistory,
            trend: linearTrend(kpis.likesHistory),
        },
        {
            label: 'Total Saves',
            value: formatNumber(kpis.totalSaves),
            sub: 'Soma de todos os posts',
            icon: Bookmark,
            accentColor: '#f59e0b', // amber
            sparkData: kpis.savesHistory,
            trend: linearTrend(kpis.savesHistory),
        },
        {
            label: 'Total Shares',
            value: formatNumber(kpis.totalShares),
            sub: 'Soma de todos os posts',
            icon: Share2,
            accentColor: '#10b981', // emerald
            sparkData: kpis.sharesHistory,
            trend: linearTrend(kpis.sharesHistory),
        },
        {
            label: 'Total Comentários',
            value: formatNumber(kpis.totalComments),
            sub: 'Soma de todos os posts',
            icon: MessageCircle,
            accentColor: '#f97316', // orange
            sparkData: kpis.commentsHistory,
            trend: linearTrend(kpis.commentsHistory),
        },
        {
            label: 'Eng. Rate',
            value: kpis.avgEngRate > 0 ? `${kpis.avgEngRate.toFixed(2)}%` : '0%',
            sub: '(Interações / Alcance)',
            icon: TrendingUp,
            accentColor: '#a855f7', // purple
            sparkData: kpis.engRateHistory,
            trend: linearTrend(kpis.engRateHistory),
        },
        {
            label: 'Avg Watch Time',
            value: kpis.avgWatchTime != null ? `${kpis.avgWatchTime.toFixed(1)}s` : 'Sem Reels',
            sub: 'Tempo médio (Reels)',
            icon: Clock,
            accentColor: '#ef4444', // red
        },
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
                            <card.icon className="h-3.5 w-3.5" style={{ color: card.accentColor, opacity: 0.8 }} />
                        </div>
                        <p className="mt-2 text-2xl font-mono v2-number font-bold tracking-tight" style={{ color: 'var(--v2-text-primary)' }}>
                            {card.value}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--v2-text-tertiary)' }}>{card.sub}</p>
                        
                        {card.trend && (
                            <div className="mt-2 flex items-center gap-1.5">
                                {card.trend.direction === 'rising' ? (
                                    <ArrowUpRight className="h-3 w-3" style={{ color: 'var(--v2-success)' }} />
                                ) : card.trend.direction === 'falling' ? (
                                    <ArrowDownRight className="h-3 w-3" style={{ color: 'var(--v2-danger)' }} />
                                ) : (
                                    <Minus className="h-3 w-3" style={{ color: 'var(--v2-text-tertiary)' }} />
                                )}
                                <span className="text-[9px] font-mono" style={{ color: card.trend.direction === 'rising' ? 'var(--v2-success)' : card.trend.direction === 'falling' ? 'var(--v2-danger)' : 'var(--v2-text-tertiary)' }}>
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
