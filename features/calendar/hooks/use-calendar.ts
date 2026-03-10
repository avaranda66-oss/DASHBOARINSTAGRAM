'use client';

import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    format,
    parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Content } from '@/types/content';

export function useCalendar(currentDate: Date) {
    // Month view
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR });

    // Week view
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekLabel = `${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM', { locale: ptBR })}`;

    // Day view
    const dayLabel = format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

    return {
        days, monthStart, monthEnd, monthLabel,
        weekDays, weekLabel, weekStart, weekEnd,
        dayLabel
    };
}

export function getContentsForDay(day: Date, contents: Content[]) {
    return contents.filter((c) => {
        if (!c.scheduledAt) return false;
        return isSameDay(parseISO(c.scheduledAt), day);
    });
}

export { isSameMonth, isToday, format, parseISO };
