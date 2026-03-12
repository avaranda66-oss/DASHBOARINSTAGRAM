'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { InstagramPostMetrics } from '@/types/analytics';

interface EngagementHeatmapProps {
    posts: InstagramPostMetrics[];
    weeks?: number;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getColorClass(intensity: number): string {
    if (intensity === 0) return 'bg-zinc-800/50';
    if (intensity < 0.25) return 'bg-emerald-900/60';
    if (intensity < 0.5) return 'bg-emerald-700/60';
    if (intensity < 0.75) return 'bg-emerald-500/70';
    return 'bg-emerald-400/80';
}

export function EngagementHeatmap({ posts, weeks = 26 }: EngagementHeatmapProps) {
    const { grid, maxEng, monthLabels } = useMemo(() => {
        // Build a map of date -> total engagement
        const engMap = new Map<string, number>();
        for (const post of posts) {
            if (!post.timestamp) continue;
            const d = new Date(post.timestamp);
            if (isNaN(d.getTime())) continue;
            const key = d.toISOString().slice(0, 10);
            engMap.set(key, (engMap.get(key) ?? 0) + post.likesCount + post.commentsCount);
        }

        // Generate grid for last N weeks
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (weeks * 7 - 1));
        // Align to Sunday
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const grid: { date: string; engagement: number; dayOfWeek: number; weekIndex: number }[] = [];
        let maxEng = 0;

        const current = new Date(startDate);
        while (current <= today) {
            const key = current.toISOString().slice(0, 10);
            const eng = engMap.get(key) ?? 0;
            if (eng > maxEng) maxEng = eng;

            const weekIndex = Math.floor((current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
            grid.push({
                date: key,
                engagement: eng,
                dayOfWeek: current.getDay(),
                weekIndex,
            });
            current.setDate(current.getDate() + 1);
        }

        // Month labels
        const monthLabels: { label: string; weekIndex: number }[] = [];
        let lastMonth = -1;
        for (const cell of grid) {
            const month = new Date(cell.date).getMonth();
            if (month !== lastMonth && cell.dayOfWeek === 0) {
                monthLabels.push({ label: MONTHS[month], weekIndex: cell.weekIndex });
                lastMonth = month;
            }
        }

        return { grid, maxEng, monthLabels };
    }, [posts, weeks]);

    const totalWeeks = Math.ceil(grid.length / 7);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <h3 className="mb-4 text-sm font-semibold text-zinc-200">Mapa de Engajamento</h3>

            {/* Month labels */}
            <div className="flex mb-1 ml-8">
                {monthLabels.map((m, i) => (
                    <span
                        key={i}
                        className="text-[10px] text-zinc-500"
                        style={{
                            position: 'relative',
                            left: `${(m.weekIndex / totalWeeks) * 100}%`,
                            width: 0,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {m.label}
                    </span>
                ))}
            </div>

            <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] mr-1">
                    {DAYS.map((day, i) => (
                        <span key={i} className="text-[10px] text-zinc-500 h-[13px] leading-[13px]">
                            {i % 2 === 1 ? day : ''}
                        </span>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex gap-[3px] overflow-x-auto">
                    {Array.from({ length: totalWeeks }).map((_, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-[3px]">
                            {Array.from({ length: 7 }).map((_, dayIdx) => {
                                const cell = grid.find(c => c.weekIndex === weekIdx && c.dayOfWeek === dayIdx);
                                if (!cell) return <div key={dayIdx} className="w-[13px] h-[13px]" />;

                                const intensity = maxEng > 0 ? cell.engagement / maxEng : 0;
                                const d = new Date(cell.date);
                                const isToday = cell.date === new Date().toISOString().slice(0, 10);

                                return (
                                    <div
                                        key={dayIdx}
                                        className={`w-[13px] h-[13px] rounded-sm ${getColorClass(intensity)} ${isToday ? 'ring-1 ring-sky-400/50' : ''} cursor-pointer transition-colors hover:ring-1 hover:ring-white/20`}
                                        title={`${d.toLocaleDateString('pt-BR')} — ${cell.engagement > 0 ? `${cell.engagement.toLocaleString()} interações` : 'Sem posts'}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-500">
                <span>Menos</span>
                <div className="w-[13px] h-[13px] rounded-sm bg-zinc-800/50" />
                <div className="w-[13px] h-[13px] rounded-sm bg-emerald-900/60" />
                <div className="w-[13px] h-[13px] rounded-sm bg-emerald-700/60" />
                <div className="w-[13px] h-[13px] rounded-sm bg-emerald-500/70" />
                <div className="w-[13px] h-[13px] rounded-sm bg-emerald-400/80" />
                <span>Mais</span>
            </div>
        </motion.div>
    );
}
