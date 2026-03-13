'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useContentStore } from '@/stores';
import { useCalendarStore } from '@/stores/calendar-slice';
import {
    useCalendar,
    getContentsForDay,
    isSameMonth,
    isToday,
    format,
    parseISO,
} from '../hooks/use-calendar';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { TYPE_BADGE_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { Image, Circle, Film, Layers, Megaphone } from 'lucide-react';

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TYPE_ICONS: Record<string, React.ElementType> = {
    post: Image,
    story: Circle,
    reel: Film,
    carousel: Layers,
    campaign: Megaphone,
};

const STATUS_CHIP_COLORS: Record<string, string> = {
    idea: 'bg-slate-500/20 text-slate-300',
    draft: 'bg-amber-500/20 text-amber-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    scheduled: 'bg-blue-500/20 text-blue-300',
    published: 'bg-violet-500/20 text-violet-300',
};

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold capitalize">{monthLabel}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoje
                </Button>
            </div>

            {/* Calendar grid */}
            <div className="rounded-xl border border-border overflow-hidden">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 bg-muted/50">
                    {WEEKDAY_NAMES.map((name) => (
                        <div
                            key={name}
                            className="px-2 py-2 text-xs font-medium text-muted-foreground text-center border-b border-border"
                        >
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
                                className={`min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer transition-colors hover:bg-accent/20 ${!inMonth ? 'opacity-40' : ''
                                    }`}
                            >
                                {/* Day number */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today
                                            ? 'instagram-gradient text-white'
                                            : 'text-foreground'
                                            }`}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                    {dayContents.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground">{dayContents.length}</span>
                                    )}
                                </div>

                                {/* Content chips */}
                                <div className="space-y-0.5">
                                    {visibleContents.map((content) => {
                                        const TypeIcon = TYPE_ICONS[content.type] ?? Image;
                                        const chipColor = TYPE_BADGE_COLORS[content.type] ?? STATUS_CHIP_COLORS[content.status] ?? '';
                                        return (
                                            <div
                                                key={content.id}
                                                onClick={(e) => handleContentClick(content, e)}
                                                className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80 transition-opacity ${chipColor}`}
                                            >
                                                <TypeIcon className="h-2.5 w-2.5 shrink-0" />
                                                <span className="truncate">{content.title}</span>
                                            </div>
                                        );
                                    })}
                                    {extraCount > 0 && (
                                        <div className="text-[10px] text-muted-foreground px-1">
                                            +{extraCount} mais
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Editor dialog */}
            <ContentEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                content={editingContent}
            />
        </div>
    );
}
