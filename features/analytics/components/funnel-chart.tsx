'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import type { MetaPostMetrics } from '@/types/analytics';

interface FunnelChartProps {
    posts: MetaPostMetrics[];
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

export function FunnelChart({ posts }: FunnelChartProps) {
    const funnelData = useMemo(() => {
        if (posts.length === 0) return null;

        const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0);
        const totalInteractions = posts.reduce((s, p) => s + p.likesCount + p.commentsCount, 0);
        const totalSaves = posts.reduce((s, p) => s + (p.saved ?? 0), 0);
        const totalShares = posts.reduce((s, p) => s + (p.shares ?? 0), 0);

        if (totalReach === 0) return null;

        const stages = [
            { label: 'Alcance', value: totalReach, color: 'bg-sky-500', pct: 100 },
            { label: 'Engajamento', value: totalInteractions, color: 'bg-violet-500', pct: (totalInteractions / totalReach) * 100 },
            { label: 'Saves', value: totalSaves, color: 'bg-emerald-500', pct: (totalSaves / totalReach) * 100 },
            { label: 'Shares', value: totalShares, color: 'bg-amber-500', pct: (totalShares / totalReach) * 100 },
        ];

        return stages;
    }, [posts]);

    if (!funnelData) return null;

    const maxWidth = 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <div className="flex items-center gap-2 mb-5">
                <Filter className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Funil de Engajamento</h3>
            </div>

            <div className="space-y-3">
                {funnelData.map((stage, i) => {
                    // Scale widths: first stage is 100%, rest proportional but min 8%
                    const width = i === 0 ? maxWidth : Math.max(8, (stage.value / funnelData[0].value) * maxWidth);

                    return (
                        <div key={stage.label} className="flex items-center gap-3">
                            <div className="w-24 text-right">
                                <p className="text-xs text-zinc-300">{stage.label}</p>
                                <p className="text-[10px] text-zinc-500">{formatNumber(stage.value)}</p>
                            </div>
                            <div className="flex-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${width}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    className={`h-8 ${stage.color} rounded-lg flex items-center justify-end pr-2 relative`}
                                    style={{ opacity: 0.7 + (0.3 * (1 - i / funnelData.length)) }}
                                >
                                    <span className="text-[10px] text-white font-medium">
                                        {i === 0 ? '100%' : `${stage.pct.toFixed(2)}%`}
                                    </span>
                                </motion.div>
                            </div>
                            {i > 0 && (
                                <div className="w-12 text-right">
                                    <p className="text-[10px] text-zinc-500">
                                        {((stage.value / funnelData[i - 1].value) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-zinc-500">
                    Taxa de conversão total: {((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(3)}% (Alcance → Shares)
                </p>
            </div>
        </motion.div>
    );
}
