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
import { ptBR } from 'date-fns/locale';
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

export function WeekView() {
    const { isLoaded, loadContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { currentDate, navigateMonth, goToToday } = useCalendarStore();
    const { weekDays, weekLabel } = useCalendar(currentDate);
    const containerRef = useRef<HTMLDivElement>(null);

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
                    <h3 className="text-lg font-semibold capitalize">{weekLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoje
                </Button>
            </div>

            {/* Week Grid Header */}
            <div className="flex border-b border-border bg-muted/50">
                {weekDays.map((day, i) => {
                    const today = isToday(day);
                    return (
                        <div key={i} className="flex-1 py-3 text-center border-r border-border last:border-r-0">
                            <div className="text-xs font-medium text-muted-foreground uppercase">
                                {format(day, 'eee', { locale: ptBR })}
                            </div>
                            <div className={`text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full ${today ? 'instagram-gradient text-white' : ''}`}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Flex Agenda Grid */}
            <div className="flex-1 overflow-y-auto bg-muted/10">
                <div className="flex min-h-full">
                    {/* Days columns */}
                    {weekDays.map((day, dayIndex) => {
                        const dayContents = getContentsForDay(day, filteredContents).sort((a, b) => {
                            if (!a.scheduledAt || !b.scheduledAt) return 0;
                            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                        });
                        const today = isToday(day);

                        return (
                            <div key={dayIndex} className={`flex-1 flex flex-col gap-2 p-2 border-r border-border min-h-full last:border-r-0 ${today ? 'bg-primary/5' : ''}`}>

                                {/* Content Cards (Sorted) */}
                                {dayContents.map((content) => {
                                    if (!content.scheduledAt) return null;
                                    const TypeIcon = TYPE_ICONS[content.type] ?? Image;
                                    const bgClass = TYPE_CARD_COLORS[content.type] ?? 'bg-muted';
                                    const d = parseISO(content.scheduledAt);

                                    return (
                                        <div
                                            key={content.id}
                                            onClick={(e) => handleContentClick(content, e)}
                                            className={`rounded-md p-2 shadow-sm cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md ${bgClass} opacity-95 flex flex-col gap-1`}
                                        >
                                            <div className="flex items-center gap-1.5 opacity-90">
                                                <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="text-[10px] font-bold tracking-wider uppercase">
                                                    {format(d, 'HH:mm')}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold leading-tight line-clamp-2 mt-0.5">
                                                {content.title}
                                            </p>
                                        </div>
                                    );
                                })}

                                {/* Add Button Slot */}
                                <button
                                    onClick={() => handleSlotClick(day, 12)}
                                    className="mt-auto flex items-center justify-center py-2 text-xs font-medium text-muted-foreground border border-dashed border-border rounded-md hover:bg-accent/50 transition-colors"
                                >
                                    + Adicionar
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
