'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContentStore } from '@/stores';
import { useCalendarStore } from '@/stores/calendar-slice';
import {
    useCalendar,
    getContentsForDay,
    isToday,
    format,
    parseISO,
} from '../hooks/use-calendar';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { TYPE_BADGE_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { Image, Circle, Film, Layers, Megaphone } from 'lucide-react';



const TYPE_ICONS: Record<string, React.ElementType> = {
    post: Image,
    story: Circle,
    reel: Film,
    carousel: Layers,
    campaign: Megaphone,
};

const TYPE_CARD_COLORS: Record<string, string> = {
    post: 'bg-blue-500 text-white',
    story: 'bg-purple-500 text-white',
    reel: 'bg-pink-500 text-white',
    carousel: 'bg-orange-500 text-white',
    campaign: 'bg-emerald-500 text-white',
};

export function DayView() {
    const { isLoaded, loadContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { currentDate, navigateMonth, goToToday } = useCalendarStore();
    const { dayLabel } = useCalendar(currentDate);
    const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="flex flex-col h-[calc(100vh-12rem)] w-full rounded-xl border border-border overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold capitalize">{dayLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoje
                </Button>
            </div>

            {/* Scrollable Vertical Agenda */}
            <div className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    {/* Content Cards (Sorted) */}
                    {dayContents
                        .sort((a, b) => {
                            if (!a.scheduledAt || !b.scheduledAt) return 0;
                            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                        })
                        .map((content) => {
                            if (!content.scheduledAt) return null;
                            const TypeIcon = TYPE_ICONS[content.type] ?? Image;
                            const bgClass = TYPE_CARD_COLORS[content.type] ?? 'bg-muted';
                            const d = parseISO(content.scheduledAt);

                            return (
                                <div
                                    key={content.id}
                                    onClick={(e) => handleContentClick(content, e)}
                                    className={`rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${bgClass} opacity-95`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-black/10 shrink-0">
                                                <TypeIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold tracking-widest uppercase bg-black/10 px-2 py-0.5 rounded-full">
                                                        {format(d, 'HH:mm')}
                                                    </span>
                                                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">
                                                        {content.type}
                                                    </span>
                                                </div>
                                                <p className="text-base font-semibold leading-tight">
                                                    {content.title}
                                                </p>
                                                {content.description && (
                                                    <p className="text-sm mt-1.5 opacity-90 line-clamp-2">
                                                        {content.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {content.hashtags.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-black/10">
                                            <p className="text-xs opacity-75 truncate">
                                                {content.hashtags.join(' ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    {/* Empty State */}
                    {dayContents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-background/50">
                            <p className="text-sm font-medium mb-3">Nenhum conteúdo agendado para este dia.</p>
                        </div>
                    )}

                    {/* Add Button */}
                    <button
                        onClick={() => handleSlotClick(12, false)}
                        className="mt-2 flex items-center justify-center p-4 text-sm font-semibold text-muted-foreground border-2 border-dashed border-border rounded-xl hover:bg-accent/50 hover:text-accent-foreground transition-all"
                    >
                        + Agendar Novo Conteúdo
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
