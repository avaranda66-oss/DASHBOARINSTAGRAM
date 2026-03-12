'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, TrendingDown, Zap, Calendar } from 'lucide-react';
import type { InstagramPostMetrics } from '@/types/analytics';
import { detectOutliers, periodComparison, linearTrend, bestTimeToPost } from '@/lib/utils/statistics';

interface AlertAnomalyPanelProps {
    posts: InstagramPostMetrics[];
}

interface Alert {
    id: string;
    type: 'viral' | 'drop' | 'trend_change' | 'best_day_change' | 'info';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    icon: typeof AlertTriangle;
    color: string;
}

export function AlertAnomalyPanel({ posts }: AlertAnomalyPanelProps) {
    const alerts = useMemo(() => {
        if (posts.length < 5) return [];
        const result: Alert[] = [];

        // 1. Viral posts detection
        const engagements = posts.map(p => p.likesCount + p.commentsCount);
        const outlierResult = detectOutliers(engagements);
        const viralCount = outlierResult.outliers.filter(o => o.type === 'high').length;
        if (viralCount > 0) {
            const viralPosts = outlierResult.outliers
                .filter(o => o.type === 'high')
                .map(o => posts[o.index])
                .filter(Boolean);
            result.push({
                id: 'viral',
                type: 'viral',
                severity: 'high',
                title: `${viralCount} post${viralCount > 1 ? 's' : ''} viral detectado${viralCount > 1 ? 's' : ''}`,
                description: viralPosts.length > 0
                    ? `"${viralPosts[0].caption?.slice(0, 50) || 'Post'}..." com ${viralPosts[0].likesCount + viralPosts[0].commentsCount} interações (acima do limite ${Math.round(outlierResult.bounds.upper)})`
                    : `Engajamento acima do limite superior de ${Math.round(outlierResult.bounds.upper)} interações`,
                icon: Zap,
                color: 'text-emerald-400',
            });
        }

        // 2. Engagement trend
        if (posts.length >= 10) {
            const half = Math.floor(posts.length / 2);
            const sorted = [...posts].sort((a, b) => {
                const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return tA - tB;
            });
            const olderHalf = sorted.slice(0, half).map(p => p.likesCount + p.commentsCount);
            const newerHalf = sorted.slice(half).map(p => p.likesCount + p.commentsCount);
            const comparison = periodComparison(newerHalf, olderHalf);

            if (comparison.significance === 'significant') {
                if (comparison.direction === 'down') {
                    result.push({
                        id: 'drop',
                        type: 'drop',
                        severity: 'high',
                        title: 'Queda significativa de engajamento',
                        description: `Engajamento caiu ${Math.abs(Math.round(comparison.changePercent))}% nos posts recentes vs anteriores (estatisticamente significativo)`,
                        icon: TrendingDown,
                        color: 'text-red-400',
                    });
                } else if (comparison.direction === 'up') {
                    result.push({
                        id: 'growth',
                        type: 'trend_change',
                        severity: 'low',
                        title: 'Crescimento significativo de engajamento',
                        description: `Engajamento cresceu ${Math.round(comparison.changePercent)}% nos posts recentes (estatisticamente significativo)`,
                        icon: TrendingUp,
                        color: 'text-emerald-400',
                    });
                }
            }

            // 3. Trend direction
            const trend = linearTrend(sorted.map(p => p.likesCount + p.commentsCount));
            if (trend.direction === 'falling' && trend.r2 > 0.4) {
                result.push({
                    id: 'trend_falling',
                    type: 'trend_change',
                    severity: 'medium',
                    title: 'Tendência de queda detectada',
                    description: `A linha de tendência está em queda com R²=${(trend.r2 * 100).toFixed(0)}% de confiança`,
                    icon: TrendingDown,
                    color: 'text-orange-400',
                });
            }
        }

        // 4. Best day analysis
        if (posts.length >= 7) {
            const postsForDay = posts
                .filter(p => p.timestamp)
                .map(p => ({ date: p.timestamp, engagement: p.likesCount + p.commentsCount }));
            const bestDay = bestTimeToPost(postsForDay);
            if (bestDay.bestDay !== '-' && bestDay.dayBreakdown.length >= 3) {
                result.push({
                    id: 'best_day',
                    type: 'info',
                    severity: 'low',
                    title: `Melhor dia: ${bestDay.bestDay}`,
                    description: `Engajamento médio de ${Math.round(bestDay.bestDayAvg)} interações. Considere concentrar publicações neste dia.`,
                    icon: Calendar,
                    color: 'text-sky-400',
                });
            }
        }

        return result;
    }, [posts]);

    if (alerts.length === 0) return null;

    const severityOrder = { high: 0, medium: 1, low: 2 };
    const sortedAlerts = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Alertas & Anomalias</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                    {alerts.length}
                </span>
            </div>

            <div className="space-y-2">
                {sortedAlerts.map(alert => {
                    const Icon = alert.icon;
                    return (
                        <div
                            key={alert.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border ${
                                alert.severity === 'high'
                                    ? 'border-red-500/20 bg-red-500/5'
                                    : alert.severity === 'medium'
                                    ? 'border-orange-500/20 bg-orange-500/5'
                                    : 'border-zinc-700/30 bg-zinc-800/30'
                            }`}
                        >
                            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.color}`} />
                            <div>
                                <p className="text-sm font-medium text-zinc-200">{alert.title}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{alert.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
