'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from '@/stores';
import { useCalendarStore } from '@/stores/calendar-slice';
import {
    useCalendar,
    getContentsForDay,
    isSameMonth,
    isToday,
    format,
} from '../hooks/use-calendar';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { Button } from '@/design-system/atoms/Button';
import { Badge } from '@/design-system/atoms/Badge';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { cn } from '@/design-system/utils/cn';

const WEEKDAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const TYPE_GLYPHS: Record<string, string> = {
    post: '◆',
    story: '◎',
    reel: '▶',
    carousel: '◫',
    campaign: '▲',
};

const STATUS_MAP = {
    idea: { intent: 'info', variant: 'subtle' },
    draft: { intent: 'default', variant: 'subtle' },
    approved: { intent: 'success', variant: 'subtle' },
    scheduled: { intent: 'warning', variant: 'subtle' },
    published: { intent: 'success', variant: 'solid' },
    failed: { intent: 'error', variant: 'subtle' },
} as const;

export function MonthView() {
    const { isLoaded, loadContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { currentDate, navigateMonth, goToToday } = useCalendarStore();
    const { days, monthLabel } = useCalendar(currentDate);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [defaultDate, setDefaultDate] = useState<string | undefined>();

    useEffect(() => {
        if (!isLoaded) loadContents();
    }, [isLoaded, loadContents]);

    const handleDayClick = (day: Date) => {
        setEditingContent(null);
        setDefaultDate(day.toISOString().slice(0, 16));
        setEditorOpen(true);
    };

    const handleContentClick = (content: Content, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingContent(content);
        setDefaultDate(undefined);
        setEditorOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-[#0A0A0A] border border-white/10 rounded overflow-hidden">
                        <button onClick={() => navigateMonth('prev')} className="px-3 py-1.5 hover:bg-white/5 border-r border-white/10 text-[#4A4A4A] transition-colors font-mono text-xs">‹</button>
                        <button onClick={() => navigateMonth('next')} className="px-3 py-1.5 hover:bg-white/5 text-[#4A4A4A] transition-colors font-mono text-xs">›</button>
                    </div>
                    <h3 className="text-[14px] font-bold text-[#F5F5F5] uppercase tracking-[0.1em]">{monthLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday} className="font-mono text-[10px] tracking-widest uppercase">TODAY_SYNC</Button>
            </div>

            {/* Calendar grid */}
            <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0A0A0A]/30">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-white/10 bg-[#0A0A0A]/50">
                    {WEEKDAY_NAMES.map((name) => (
                        <div key={name} className="px-2 py-3 text-[9px] font-mono tracking-[0.2em] text-[#4A4A4A] text-center uppercase">
                            {name}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {days.map((day, i) => {
                        const dayContents = getContentsForDay(day, filteredContents);
                        const inMonth = isSameMonth(day, currentDate);
                        const today = isToday(day);
                        const visibleContents = dayContents.slice(0, 3);
                        const extraCount = dayContents.length - 3;

                        return (
                            <div
                                key={i}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "min-h-[120px] border-b border-r last:border-r-0 border-white/5 p-2 cursor-pointer transition-all duration-150 relative group",
                                    !inMonth ? "opacity-20" : "opacity-100",
                                    "hover:bg-white/[0.02]"
                                )}
                            >
                                {/* Day number */}
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className={cn(
                                            "font-mono text-[11px] w-6 h-6 flex items-center justify-center rounded",
                                            today ? "bg-[#A3E635] text-black font-bold" : "text-[#8A8A8A]"
                                        )}
                                    >
                                        {format(day, 'd').padStart(2, '0')}
                                    </span>
                                    {dayContents.length > 0 && (
                                        <span className="font-mono text-[9px] text-[#4A4A4A] tracking-tighter">[{dayContents.length.toString().padStart(2, '0')}]</span>
                                    )}
                                </div>

                                {/* Content chips */}
                                <div className="space-y-1">
                                    {visibleContents.map((content) => {
                                        const statusCfg = STATUS_MAP[content.status as keyof typeof STATUS_MAP] || STATUS_MAP.draft;
                                        return (
                                            <div
                                                key={content.id}
                                                onClick={(e) => handleContentClick(content, e)}
                                                className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-white/5 border border-white/5 hover:border-[#A3E635]/30 transition-all group/chip"
                                            >
                                                <span className="font-mono text-[10px] text-[#A3E635]">{TYPE_GLYPHS[content.type] || '◆'}</span>
                                                <span className="truncate text-[9px] text-[#F5F5F5] uppercase tracking-tight opacity-70 group-hover/chip:opacity-100">{content.title}</span>
                                            </div>
                                        );
                                    })}
                                    {extraCount > 0 && (
                                        <div className="font-mono text-[8px] text-[#4A4A4A] px-1 pt-1 tracking-widest">
                                            +{extraCount} MORE_RECORDS
                                        </div>
                                    )}
                                </div>

                                {/* Add overlay on hover */}
                                <div className="absolute inset-0 border border-[#A3E635]/0 group-hover:border-[#A3E635]/10 pointer-events-none transition-colors" />
                            </div>
                        );
                    })}
                </div>
            </div>

            <ContentEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                content={editingContent}
            />
        </div>
    );
}
