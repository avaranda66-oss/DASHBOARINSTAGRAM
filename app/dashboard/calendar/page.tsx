'use client';

import { MonthView } from '@/features/calendar/components/month-view';
import { WeekView } from '@/features/calendar/components/week-view';
import { DayView } from '@/features/calendar/components/day-view';
import { useCalendarStore } from '@/stores/calendar-slice';
import { FilterPanel } from '@/components/shared/filter-panel';
import { ActiveFiltersBar } from '@/components/shared/active-filters-bar';
import { Button } from '@/components/ui/button';
import { AccountFilter } from '@/features/accounts/components/account-filter';

export default function CalendarPage() {
    const { calendarView, setView } = useCalendarStore();

    return (
        <div className="space-y-4 flex flex-col h-full">
            <ActiveFiltersBar />

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
                {(['month', 'week', 'day'] as const).map((view) => (
                    <Button
                        key={view}
                        variant={calendarView === view ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView(view)}
                        className="text-xs capitalize"
                    >
                        {view === 'month' ? 'Mensal' : view === 'week' ? 'Semanal' : 'Diário'}
                    </Button>
                ))}
            </div>

            {calendarView === 'month' && <MonthView />}
            {calendarView === 'week' && <WeekView />}
            {calendarView === 'day' && <DayView />}

            <FilterPanel />
        </div>
    );
}
