'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from '@/stores';
import { TYPE_HEX_COLORS } from '@/lib/constants';
import { useCalendarStore } from '@/stores/calendar-slice';
import {
    useCalendar,
    getContentsForDay,
    isToday,
    format,
    parseISO,
} from '../hooks/use-calendar';
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

export function DayView() {
    const { isLoaded, loadContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { currentDate, navigateMonth, goToToday } = useCalendarStore();
    const { dayLabel } = useCalendar(currentDate);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [defaultDate, setDefaultDate] = useState<string | undefined>();

    const dayContents = getContentsForDay(currentDate, filteredContents);
    const today = isToday(currentDate);

    useEffect(() => {
        if (!isLoaded) loadContents();
    }, [isLoaded, loadContents]);

    const handleSlotClick = (hour: number, halfHour: boolean) => {
        const d = new Date(currentDate);
        d.setHours(hour, halfHour ? 30 : 0, 0, 0);
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
                    <h3 className="text-[13px] font-bold text-[#F5F5F5] uppercase tracking-widest">{dayLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday} className="font-mono text-[10px] tracking-widest uppercase">TODAY_SYNC</Button>
            </div>

            {/* Scrollable Vertical Agenda */}
            <div className="flex-1 overflow-y-auto bg-transparent p-6 scrollbar-none">
                <div className="max-w-3xl mx-auto space-y-3">
                    {/* Content Cards (Sorted) */}
                    {dayContents
                        .sort((a, b) => {
                            if (!a.scheduledAt || !b.scheduledAt) return 0;
                            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                        })
                        .map((content) => {
                            if (!content.scheduledAt) return null;
                            const d = parseISO(content.scheduledAt);

                            return (
                                <div
                                    key={content.id}
                                    onClick={(e) => handleContentClick(content, e)}
                                    className="group relative border border-white/5 bg-[#0A0A0A] p-5 rounded-lg hover:border-[#A3E635]/30 hover:bg-white/[0.02] transition-all cursor-pointer"
                                >
                                    <div className="flex items-start gap-6">
                                        <div className="font-mono text-[#A3E635] flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[14px] font-bold leading-none">{format(d, 'HH:mm')}</span>
                                            <span className="text-[10px] tracking-widest opacity-40">MST</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span
                                                    className="font-mono text-[10px] px-2 py-0.5 rounded tracking-[0.2em] uppercase"
                                                    style={{ color: TYPE_HEX_COLORS[content.type] ?? '#8A8A8A', backgroundColor: `${TYPE_HEX_COLORS[content.type] ?? '#8A8A8A'}14` }}
                                                >
                                                    {content.type}
                                                </span>
                                                <span className="font-mono text-[12px]" style={{ color: TYPE_HEX_COLORS[content.type] ?? '#4A4A4A' }}>{TYPE_GLYPHS[content.type] || '◆'}</span>
                                            </div>
                                            
                                            <h4 className="text-[16px] font-bold text-[#F5F5F5] uppercase tracking-tight mb-2 group-hover:text-[#A3E635] transition-colors">
                                                {content.title}
                                            </h4>
                                            
                                            {content.description && (
                                                <p className="text-[12px] text-[#8A8A8A] line-clamp-2 leading-relaxed opacity-60">
                                                    {content.description}
                                                </p>
                                            )}

                                            {content.hashtags.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {content.hashtags.map((h, i) => (
                                                        <span key={i} className="font-mono text-[9px] text-[#4A4A4A] lowercase italic">#{h}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="font-mono text-[9px] text-[#4A4A4A] tracking-widest uppercase writing-vertical-lr opacity-30 mt-1">
                                            ITEM_RECORD_{content.id.slice(0, 4)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                    {/* Empty State */}
                    {dayContents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-lg bg-white/[0.01]">
                            <span className="font-mono text-xl text-[#4A4A4A] mb-2">∅</span>
                            <p className="font-mono text-[9px] tracking-[0.3em] text-[#4A4A4A] uppercase">Zero_Agenda_Activity</p>
                        </div>
                    )}

                    {/* Add Button */}
                    <button
                        onClick={() => handleSlotClick(12, false)}
                        className="w-full py-4 mt-4 border border-dashed border-white/10 rounded-lg font-mono text-[10px] tracking-[0.2em] text-[#4A4A4A] hover:bg-white/5 hover:text-[#8A8A8A] transition-all uppercase"
                    >
                        + INJECT_NEW_CONTENT_NODE
                    </button>
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
