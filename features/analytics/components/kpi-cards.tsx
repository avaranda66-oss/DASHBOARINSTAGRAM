'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, TrendingUp, Image as ImageIcon, Film, Layers, Star, Smile } from 'lucide-react';
import type { AnalyticsSummary } from '@/types/analytics';

interface KpiCardsProps {
    summary: AnalyticsSummary;
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

export function KpiCards({ summary }: KpiCardsProps) {
    const cards = [
        {
            label: 'Total de Likes',
            value: formatNumber(summary.totalLikes),
            sub: `Média ${formatNumber(summary.avgLikesPerPost)}/post (todos os ${summary.totalPosts} posts)`,
            icon: Heart,
            gradient: 'from-pink-500/15 to-rose-500/5',
            iconColor: 'text-pink-400',
        },
        {
            label: 'Total de Comentários',
            value: formatNumber(summary.totalComments),
            sub: `Média ${formatNumber(summary.avgCommentsPerPost)}/post (todos os ${summary.totalPosts} posts)`,
            icon: MessageCircle,
            gradient: 'from-blue-500/15 to-indigo-500/5',
            iconColor: 'text-blue-400',
        },
        {
            label: 'Views (Reels/Vídeos)',
            value: summary.videosWithViews > 0 ? formatNumber(summary.totalViews) : 'N/D',
            sub: summary.videosWithViews > 0
                ? `De ${summary.videosWithViews} Reel${summary.videosWithViews !== 1 ? 's' : ''}/vídeo${summary.videosWithViews !== 1 ? 's' : ''} com dados`
                : 'Sem Reels/vídeos com dados de views',
            icon: Eye,
            gradient: 'from-purple-500/15 to-violet-500/5',
            iconColor: 'text-purple-400',
        },
        {
            label: 'Engajamento (Reels)',
            value: summary.videosWithViews > 0 ? `${summary.avgEngagementRate}%` : 'N/D',
            sub: summary.videosWithViews > 0
                ? `(likes+coments)/views em ${summary.videosWithViews} Reel${summary.videosWithViews !== 1 ? 's' : ''}`
                : 'Requer Reels com views para calcular',
            icon: TrendingUp,
            gradient: 'from-green-500/15 to-emerald-500/5',
            iconColor: 'text-green-400',
        },
        {
            label: 'Engajamento Qualificado',
            value: summary.qualifiedEngagement > 0 ? summary.qualifiedEngagement.toLocaleString('pt-BR') : 'N/D',
            sub: 'Engajamento médio ajustado pelo Fator de Positividade dos comentários',
            icon: Star,
            gradient: 'from-yellow-500/15 to-amber-500/5',
            iconColor: 'text-yellow-400',
        },
        {
            label: 'Sentimento',
            value: summary.commentSentiment.total > 0 ? `${summary.commentSentiment.pctPos}% Positivo` : 'N/D',
            sub: summary.commentSentiment.total > 0
                ? `${summary.commentSentiment.pctNeu}% Neutro • ${summary.commentSentiment.pctNeg}% Negativo (em ${summary.commentSentiment.total} coment.)`
                : 'Faltam comentários para análise',
            icon: Smile,
            gradient: 'from-emerald-500/15 to-teal-500/5',
            iconColor: 'text-emerald-400',
        },
    ];

    return (
        <div className="space-y-4">
            {/* Main KPI grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {cards.map((card) => (
                    <motion.div
                        key={card.label}
                        variants={item}
                        className={`rounded-xl border border-border bg-gradient-to-br ${card.gradient} p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{card.label}</span>
                            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                        </div>
                        <p className="mt-1.5 text-2xl font-bold">{card.value}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground leading-tight">{card.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Per-type breakdown mini cards */}
            {(summary.imageCount > 0 || summary.videoCount > 0 || summary.carouselCount > 0) && (
                <div className="grid gap-2 grid-cols-3">
                    {summary.imageCount > 0 && (
                        <div className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5">
                            <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold">{summary.imageCount} Post{summary.imageCount !== 1 ? 's' : ''}</p>
                                <p className="text-[10px] text-muted-foreground">~{formatNumber(summary.avgLikesImage)} likes/post</p>
                            </div>
                        </div>
                    )}
                    {summary.videoCount > 0 && (
                        <div className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5">
                            <Film className="h-4 w-4 text-pink-400 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold">{summary.videoCount} Reel{summary.videoCount !== 1 ? 's' : ''}</p>
                                <p className="text-[10px] text-muted-foreground">~{formatNumber(summary.avgLikesVideo)} likes/reel</p>
                            </div>
                        </div>
                    )}
                    {summary.carouselCount > 0 && (
                        <div className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5">
                            <Layers className="h-4 w-4 text-orange-400 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold">{summary.carouselCount} Carrossel{summary.carouselCount !== 1 ? 'éis' : ''}</p>
                                <p className="text-[10px] text-muted-foreground">~{formatNumber(summary.avgLikesCarousel)} likes/car.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
