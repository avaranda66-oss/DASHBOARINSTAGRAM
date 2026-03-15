'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics } from '@/types/analytics';

interface ContentCalendarProps {
    posts: InstagramPostMetrics[];
}

const DAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function ContentCalendar({ posts }: ContentCalendarProps) {
    const [currentDate, setCurrentDate] = useState(() => new Date());

    const { calendarDays, postsByDate } = useMemo(() => {
        // Build post map
        const postsByDate = new Map<string, InstagramPostMetrics[]>();
        for (const post of posts) {
            if (!post.timestamp) continue;
            const d = new Date(post.timestamp);
            if (isNaN(d.getTime())) continue;
            const key = d.toISOString().slice(0, 10);
            if (!postsByDate.has(key)) postsByDate.set(key, []);
            postsByDate.get(key)!.push(post);
        }

        // Build calendar grid
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPad = firstDay.getDay();

        const calendarDays: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

        // Padding from previous month
        for (let i = startPad - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            calendarDays.push({
                date: d.toISOString().slice(0, 10),
                day: d.getDate(),
                isCurrentMonth: false,
                isToday: false,
            });
        }

        // Current month
        const today = new Date().toISOString().slice(0, 10);
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const d = new Date(year, month, day);
            const dateStr = d.toISOString().slice(0, 10);
            calendarDays.push({
                date: dateStr,
                day,
                isCurrentMonth: true,
                isToday: dateStr === today,
            });
        }

        // Pad to complete last week
        const remaining = 7 - (calendarDays.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(year, month + 1, i);
                calendarDays.push({
                    date: d.toISOString().slice(0, 10),
                    day: d.getDate(),
                    isCurrentMonth: false,
                    isToday: false,
                });
            }
        }

        return { calendarDays, postsByDate };
    }, [posts, currentDate]);

    const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-violet-400">◷</span>
                    <h3 className="text-sm font-semibold text-zinc-200">Calendário de Conteúdo</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/[0.05]">
                        <span className="font-mono text-xs text-zinc-400">‹</span>
                    </button>
                    <span className="text-sm text-zinc-300 min-w-[140px] text-center">
                        {MONTHS_PT[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/[0.05]">
                        <span className="font-mono text-xs text-zinc-400">›</span>
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_HEADER.map(day => (
                    <div key={day} className="text-center text-[10px] text-zinc-500 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, i) => {
                    const dayPosts = postsByDate.get(cell.date) ?? [];
                    const totalEng = dayPosts.reduce((s, p) => s + p.likesCount + p.commentsCount, 0);
                    const hasPost = dayPosts.length > 0;

                    return (
                        <div
                            key={i}
                            className={`relative min-h-[48px] p-1 rounded-lg border transition-colors ${
                                cell.isToday
                                    ? 'border-sky-500/30 bg-sky-500/5'
                                    : hasPost
                                    ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30'
                                    : 'border-transparent hover:border-white/[0.04]'
                            } ${!cell.isCurrentMonth ? 'opacity-30' : ''}`}
                            title={hasPost ? `${dayPosts.length} post${dayPosts.length > 1 ? 's' : ''} · ${totalEng.toLocaleString()} interações` : ''}
                        >
                            <span className={`text-[10px] ${cell.isToday ? 'text-sky-400 font-bold' : 'text-zinc-500'}`}>
                                {cell.day}
                            </span>
                            {hasPost && (
                                <div className="mt-0.5">
                                    <div className="flex gap-0.5 flex-wrap">
                                        {dayPosts.slice(0, 3).map((p, j) => (
                                            <div
                                                key={j}
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    p.type === 'Video' ? 'bg-violet-400' : p.type === 'Sidecar' ? 'bg-amber-400' : 'bg-emerald-400'
                                                }`}
                                            />
                                        ))}
                                        {dayPosts.length > 3 && (
                                            <span className="text-[8px] text-zinc-500">+{dayPosts.length - 3}</span>
                                        )}
                                    </div>
                                    <p className="text-[8px] text-zinc-500 mt-0.5">{totalEng.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Imagem</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Vídeo</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Carrossel</span>
            </div>
        </motion.div>
    );
}
