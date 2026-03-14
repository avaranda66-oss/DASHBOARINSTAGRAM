'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from '@/stores';
import { useCalendarStore } from '@/stores/calendar-slice';
import {
    useCalendar,
    getContentsForDay,
    isToday,
    format,
    parseISO,
} from '../hooks/use-calendar';
import { ptBR } from 'date-fns/locale';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { Button } from '@/design-system/atoms/Button';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { cn } from '@/design-system/utils/cn';

const TYPE_GLYPHS: Record<string, string> = {
    post: '◆',
    story: '◎',
    reel: '▶',
    carousel: '◫',
    campaign: '▲',
};

export function WeekView() {
    const { isLoaded, loadContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { currentDate, navigateMonth, goToToday } = useCalendarStore();
    const { weekDays, weekLabel } = useCalendar(currentDate);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [defaultDate, setDefaultDate] = useState<string | undefined>();

    useEffect(() => {
        if (!isLoaded) loadContents();
    }, [isLoaded, loadContents]);

    const handleSlotClick = (day: Date, hour: number) => {
        const d = new Date(day);
        d.setHours(hour, 0, 0, 0);
        setEditingContent(null);
        setDefaultDate(d.toISOString().slice(0, 16));
        setEditorOpen(true);
    };

    const handleContentClick = (content: Content, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingContent(content);
        setDefaultDate(undefined);
        setEditorOpen(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] w-full rounded-lg border border-white/10 overflow-hidden bg-[#0A0A0A]/30">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0A0A]/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-[#050505] border border-white/10 rounded overflow-hidden">
                        <button onClick={() => navigateMonth('prev')} className="px-3 py-1.5 hover:bg-white/5 border-r border-white/10 text-[#4A4A4A] transition-colors font-mono text-xs">‹</button>
                        <button onClick={() => navigateMonth('next')} className="px-3 py-1.5 hover:bg-white/5 text-[#4A4A4A] transition-colors font-mono text-xs">›</button>
                    </div>
                    <h3 className="text-[13px] font-bold text-[#F5F5F5] uppercase tracking-widest">{weekLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday} className="font-mono text-[10px] tracking-widest uppercase">TODAY_SYNC</Button>
            </div>

            {/* Week Grid Header */}
            <div className="flex border-b border-white/5 bg-[#0A0A0A]/20">
                {weekDays.map((day, i) => {
                    const today = isToday(day);
                    return (
                        <div key={i} className="flex-1 py-3 text-center border-r border-white/5 last:border-r-0">
                            <div className="text-[9px] font-mono tracking-[0.2em] text-[#4A4A4A] uppercase">
                                {format(day, 'eee', { locale: ptBR })}
                            </div>
                            <div className={cn(
                                "text-[12px] font-mono mt-1 inline-flex items-center justify-center w-7 h-7 rounded",
                                today ? "bg-[#A3E635] text-black font-bold" : "text-[#8A8A8A]"
                            )}>
                                {format(day, 'd').padStart(2, '0')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Flex Agenda Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="flex min-h-full">
                    {weekDays.map((day, dayIndex) => {
                        const dayContents = getContentsForDay(day, filteredContents).sort((a, b) => {
                            if (!a.scheduledAt || !b.scheduledAt) return 0;
                            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                        });
                        const today = isToday(day);

                        return (
                            <div key={dayIndex} className={cn(
                                "flex-1 flex flex-col gap-2 p-2 border-r border-white/5 min-h-full last:border-r-0",
                                today ? "bg-[#A3E635]/[0.02]" : ""
                            )}>

                                {dayContents.map((content) => {
                                    if (!content.scheduledAt) return null;
                                    const d = parseISO(content.scheduledAt);

                                    return (
                                        <div
                                            key={content.id}
                                            onClick={(e) => handleContentClick(content, e)}
                                            className="group cursor-pointer rounded border border-white/5 bg-white/[0.03] p-2 hover:border-[#A3E635]/30 hover:bg-white/[0.05] transition-all flex flex-col gap-1.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-[9px] text-[#A3E635] opacity-80">
                                                    {format(d, 'HH:mm')}
                                                </span>
                                                <span className="font-mono text-[10px] text-[#4A4A4A] group-hover:text-[#A3E635] transition-colors">{TYPE_GLYPHS[content.type] || '◆'}</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-[#F5F5F5] leading-tight line-clamp-2 uppercase tracking-wide">
                                                {content.title}
                                            </p>
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => handleSlotClick(day, 12)}
                                    className="mt-auto py-2 text-[9px] font-mono tracking-widest text-[#4A4A4A] border border-dashed border-white/5 rounded hover:bg-white/5 hover:text-[#8A8A8A] transition-all uppercase"
                                >
                                    + ADD_SLOT
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ContentEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                content={editingContent}
                defaultStatus="scheduled"
            />
        </div>
    );
}
