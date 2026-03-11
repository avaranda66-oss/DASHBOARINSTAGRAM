'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, TrendingUp, Image as ImageIcon, Film, Layers, Star, Smile, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { AnalyticsSummary, InstagramPostMetrics } from '@/types/analytics';
import { descriptiveStats, linearTrend, performanceBadge } from '@/lib/utils/statistics';

interface KpiCardsProps {
    summary: AnalyticsSummary;
    posts?: InstagramPostMetrics[];
}

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

/** Mini sparkline SVG */
function Sparkline({ data, color = 'currentColor' }: { data: number[]; color?: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const path = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((v - min) / range) * 100;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox="0 -5 100 110" preserveAspectRatio="none" className="w-full h-6 opacity-30 group-hover:opacity-70 transition-opacity">
            <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

export function KpiCards({ summary, posts = [] }: KpiCardsProps) {
    // Statistical analysis
    const statsData = useMemo(() => {
        if (!posts.length) return null;
        const likes = posts.map(p => p.likesCount ?? 0);
        const comments = posts.map(p => p.commentsCount ?? 0);
        const likesTrend = linearTrend(likes);
        const commentsTrend = linearTrend(comments);
        const likesStats = descriptiveStats(likes);
        const commentsStats = descriptiveStats(comments);

        return { likes, comments, likesTrend, commentsTrend, likesStats, commentsStats };
    }, [posts]);

    const cards = [
        {
            label: 'Total de Likes',
            value: formatNumber(summary.totalLikes),
            sub: `${formatNumber(summary.avgLikesPerPost)}/post`,
            icon: Heart,
            accentColor: '#FF7350',
            sparkData: statsData?.likes,
            trend: statsData?.likesTrend,
            volatility: statsData?.likesStats.cv != null
                ? statsData.likesStats.cv > 1 ? 'Alta variab.' : statsData.likesStats.cv > 0.5 ? 'Méd. variab.' : 'Estável'
                : null,
        },
        {
            label: 'Total de Comentários',
            value: formatNumber(summary.totalComments),
            sub: `${formatNumber(summary.avgCommentsPerPost)}/post`,
            icon: MessageCircle,
            accentColor: '#746C7E',
            sparkData: statsData?.comments,
            trend: statsData?.commentsTrend,
        },
        {
            label: 'Views (Reels)',
            value: summary.videosWithViews > 0 ? formatNumber(summary.totalViews) : 'N/D',
            sub: summary.videosWithViews > 0 ? `${summary.videosWithViews} vídeos com dados` : 'Sem dados',
            icon: Eye,
            accentColor: '#6B8E70',
        },
        {
            label: 'Engajamento',
            value: summary.videosWithViews > 0 ? `${summary.avgEngagementRate}%` : 'N/D',
            sub: summary.videosWithViews > 0 ? `(likes+coments)/views` : 'Requer Reels',
            icon: TrendingUp,
            accentColor: '#B38654',
        },
        {
            label: 'Engaj. Qualificado',
            value: summary.qualifiedEngagement > 0 ? summary.qualifiedEngagement.toLocaleString('pt-BR') : 'N/D',
            sub: 'Ajustado por sentimento',
            icon: Star,
            accentColor: '#FF7350',
        },
        {
            label: 'Sentimento',
            value: summary.commentSentiment.total > 0 ? `${summary.commentSentiment.pctPos}%` : 'N/D',
            sub: summary.commentSentiment.total > 0
                ? `${summary.commentSentiment.pctNeu}% Neutro · ${summary.commentSentiment.pctNeg}% Neg`
                : 'Sem dados',
            icon: Smile,
            accentColor: '#6B8E70',
        },
    ];

    return (
        <div className="space-y-3">
            {/* Main KPI grid — V2 Glassmorphism */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {cards.map((card) => (
                    <motion.div
                        key={card.label}
                        variants={item}
                        className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 v2-glass v2-glass-hover"
                    >
                        {/* Grain */}
                        <div className="v2-grain pointer-events-none absolute inset-0 z-[1]" />

                        {/* Subtle accent glow on hover */}
                        <div
                            className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
                            style={{ background: card.accentColor }}
                        />

                        <div className="relative z-[2]">
                            <div className="flex items-center justify-between">
                                <span className="v2-label">{card.label}</span>
                                <card.icon className="h-3.5 w-3.5" style={{ color: card.accentColor, opacity: 0.6 }} />
                            </div>
                            <p className="mt-2 text-2xl font-mono v2-number font-bold tracking-tight" style={{ color: 'var(--v2-text-primary)' }}>
                                {card.value}
                            </p>
                            <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--v2-text-tertiary)' }}>{card.sub}</p>

                            {/* Trend indicator */}
                            {card.trend && (
                                <div className="mt-2 flex items-center gap-1.5">
                                    {card.trend.direction === 'rising' ? (
                                        <ArrowUpRight className="h-3 w-3" style={{ color: 'var(--v2-success)' }} />
                                    ) : card.trend.direction === 'falling' ? (
                                        <ArrowDownRight className="h-3 w-3" style={{ color: 'var(--v2-danger)' }} />
                                    ) : null}
                                    <span className="text-[9px] font-mono" style={{ color: card.trend.direction === 'rising' ? 'var(--v2-success)' : card.trend.direction === 'falling' ? 'var(--v2-danger)' : 'var(--v2-text-tertiary)' }}>
                                        {card.trend.direction === 'rising' ? 'Crescendo' : card.trend.direction === 'falling' ? 'Caindo' : 'Estável'}
                                        {card.trend.r2 > 0.5 && ` (R²: ${card.trend.r2.toFixed(2)})`}
                                    </span>
                                </div>
                            )}

                            {/* Volatility badge */}
                            {card.volatility && (
                                <span className="mt-1 inline-block text-[8px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'var(--v2-border)', color: 'var(--v2-text-tertiary)' }}>
                                    {card.volatility}
                                </span>
                            )}

                            {/* Sparkline */}
                            {card.sparkData && card.sparkData.length > 1 && (
                                <div className="mt-2">
                                    <Sparkline data={card.sparkData} color={card.accentColor} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Per-type breakdown — V2 style */}
            {(summary.imageCount > 0 || summary.videoCount > 0 || summary.carouselCount > 0) && (
                <div className="grid gap-2 grid-cols-3">
                    {[
                        { count: summary.imageCount, label: 'Post', icon: ImageIcon, avg: summary.avgLikesImage, color: '#746C7E' },
                        { count: summary.videoCount, label: 'Reel', icon: Film, avg: summary.avgLikesVideo, color: '#FF7350' },
                        { count: summary.carouselCount, label: 'Carrossel', icon: Layers, avg: summary.avgLikesCarousel, color: '#B38654' },
                    ]
                        .filter(t => t.count > 0)
                        .map((t) => (
                            <div key={t.label} className="v2-glass rounded-lg p-2.5 flex items-center gap-2.5">
                                <t.icon className="h-3.5 w-3.5 shrink-0" style={{ color: t.color }} />
                                <div>
                                    <p className="text-xs font-medium" style={{ color: 'var(--v2-text-primary)' }}>
                                        {t.count} {t.label}{t.count !== 1 ? (t.label === 'Carrossel' ? 'éis' : 's') : ''}
                                    </p>
                                    <p className="text-[10px] font-mono" style={{ color: 'var(--v2-text-tertiary)' }}>
                                        ~{formatNumber(t.avg)} likes/{t.label.toLowerCase().slice(0, 4)}
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
