'use client';

import { useMemo, memo } from 'react';
import type { InstagramPostMetrics } from '@/types/analytics';

interface EngagementHeatmapProps {
    posts: InstagramPostMetrics[];
    weeks?: number;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getCellColor(intensity: number): string {
    if (intensity === 0) return 'rgba(255,255,255,0.03)';   // vazio — quase invisível
    if (intensity < 0.25) return 'rgba(163,230,53,0.12)';  // nível 1 — traço
    if (intensity < 0.5)  return 'rgba(163,230,53,0.35)';  // nível 2 — leve
    if (intensity < 0.75) return 'rgba(163,230,53,0.65)';  // nível 3 — médio
    return 'rgba(163,230,53,0.92)';                         // nível 4 — pico
}

export const EngagementHeatmap = memo(function EngagementHeatmap({ posts, weeks = 26 }: EngagementHeatmapProps) {
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

    const cellMap = useMemo(() => {
        const map = new Map<string, typeof grid[0]>();
        for (const cell of grid) {
            map.set(`${cell.weekIndex}_${cell.dayOfWeek}`, cell);
        }
        return map;
    }, [grid]);

    const totalWeeks = Math.ceil(grid.length / 7);
    const postCount = posts.filter(p => p.likesCount + p.commentsCount > 0).length;

    return (
        <div
            className="rounded-[8px] border p-4"
            style={{ backgroundColor: '#141414', borderColor: 'rgba(255,255,255,0.08)' }}
        >
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">
                        Mapa de Engajamento
                    </span>
                    <span className="font-mono text-[10px] text-[#A3E635] opacity-80">
                        [{postCount.toString().padStart(2, '0')} posts]
                    </span>
                </div>
                <span className="font-mono text-[10px] text-[#3A3A3A]">
                    {weeks}w
                </span>
            </div>

            {/* Month labels */}
            <div className="relative mb-1 ml-6 h-4">
                {monthLabels.map((m, i) => (
                    <span
                        key={i}
                        className="absolute font-mono text-[9px] text-[#3A3A3A] whitespace-nowrap"
                        style={{ left: `${(m.weekIndex / totalWeeks) * 100}%` }}
                    >
                        {m.label}
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] mr-2 justify-stretch">
                    {DAYS.map((day, i) => (
                        <span
                            key={i}
                            className="font-mono text-[9px] text-[#3A3A3A] flex-1 flex items-center"
                            style={{ minHeight: 0 }}
                        >
                            {i % 2 === 1 ? day : ''}
                        </span>
                    ))}
                </div>

                {/* Grid container: flex sem overflow-x */}
                <div className="flex-1 flex gap-[2px] min-w-0">
                    {Array.from({ length: totalWeeks }).map((_, weekIdx) => (
                        <div key={weekIdx} className="flex-1 min-w-0 flex flex-col gap-[2px]">
                            {Array.from({ length: 7 }).map((_, dayIdx) => {
                                const cell = cellMap.get(`${weekIdx}_${dayIdx}`);
                                if (!cell) return <div key={dayIdx} className="w-full aspect-square" />;

                                const intensity = maxEng > 0 ? cell.engagement / maxEng : 0;
                                const d = new Date(cell.date);
                                const isToday = cell.date === new Date().toISOString().slice(0, 10);

                                return (
                                    <div
                                        key={dayIdx}
                                        className="w-full aspect-square rounded-[2px] cursor-pointer transition-opacity hover:opacity-80"
                                        style={{ 
                                            backgroundColor: getCellColor(intensity),
                                            outline: isToday ? '1px solid rgba(163,230,53,0.5)' : 'none',
                                            outlineOffset: '1px',
                                        }}
                                        title={`${d.toLocaleDateString('pt-BR')} — ${cell.engagement > 0 ? `${cell.engagement.toLocaleString()} interações` : 'Sem posts'}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3">
                <span className="font-mono text-[9px] text-[#4A4A4A]">Menos</span>
                {[0, 0.12, 0.35, 0.65, 0.92].map((alpha, i) => (
                    <div
                        key={i}
                        className="w-[10px] h-[10px] rounded-[2px]"
                        style={{ backgroundColor: alpha === 0 ? 'rgba(255,255,255,0.03)' : `rgba(163,230,53,${alpha})` }}
                    />
                ))}
                <span className="font-mono text-[9px] text-[#4A4A4A]">Mais</span>
            </div>
        </div>
    );
});
