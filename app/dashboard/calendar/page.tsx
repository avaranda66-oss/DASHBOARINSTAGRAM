'use client';

import { MonthView } from '@/features/calendar/components/month-view';
import { WeekView } from '@/features/calendar/components/week-view';
import { DayView } from '@/features/calendar/components/day-view';
import { useCalendarStore } from '@/stores/calendar-slice';
import { FilterPanel, ActiveFiltersBar } from '@/design-system/molecules';
import { motion } from 'framer-motion';
import { cn } from '@/design-system/utils/cn';

export default function CalendarPage() {
    const { calendarView, setView } = useCalendarStore();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 flex flex-col h-full"
        >
            <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[CAL_SYNC_V2]</span>
                        <h1 className="text-[2rem] font-bold tracking-tight text-[#F5F5F5]">Content Timeline</h1>
                    </div>
                    <p className="text-[14px] text-[#4A4A4A] tracking-tight">Sequenciamento temporal de ativos e janelas de publicação.</p>
                </div>
                
                {/* View toggle rebuild */}
                <div className="flex bg-[#0A0A0A] border rounded p-0.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {(['month', 'week', 'day'] as const).map((view) => (
                        <button
                            key={view}
                            onClick={() => setView(view)}
                            className={cn(
                                "px-4 py-1.5 font-mono text-[9px] tracking-widest uppercase transition-all rounded-[2px]",
                                calendarView === view 
                                    ? "bg-[#A3E635] text-black font-bold" 
                                    : "text-[#4A4A4A] hover:text-[#8A8A8A]"
                            )}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>

            <ActiveFiltersBar />

            <div className="flex-1">
                {calendarView === 'month' && <MonthView />}
                {calendarView === 'week' && <WeekView />}
                {calendarView === 'day' && <DayView />}
            </div>

            <FilterPanel />
        </motion.div>
    );
}
