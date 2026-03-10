'use client';

import { create } from 'zustand';

interface CalendarSlice {
    currentDate: Date;
    calendarView: 'month' | 'week' | 'day';
    isLoaded: boolean;
    loadSettings: () => Promise<void>;
    navigateMonth: (direction: 'prev' | 'next') => void;
    goToToday: () => void;
    setView: (view: 'month' | 'week' | 'day') => void;
    setCurrentDate: (date: Date) => void;
}

import { getSettingAction, saveSettingAction } from '@/app/actions/settings.actions';

export const useCalendarStore = create<CalendarSlice>()((set, get) => ({
    currentDate: new Date(),
    calendarView: 'month',
    isLoaded: false,

    loadSettings: async () => {
        const view = await getSettingAction('calendar_view');
        if (view === 'month' || view === 'week' || view === 'day') {
            set({ calendarView: view, isLoaded: true });
        } else {
            set({ isLoaded: true });
        }
    },

    navigateMonth: (direction) =>
        set((state) => {
            const d = new Date(state.currentDate);
            if (state.calendarView === 'month') {
                d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
            } else if (state.calendarView === 'week') {
                d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
            } else {
                d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
            }
            return { currentDate: d };
        }),
    goToToday: () => set({ currentDate: new Date() }),
    setView: (view) => {
        set({ calendarView: view });
        saveSettingAction('calendar_view', view).catch(console.error);
    },
    setCurrentDate: (date) => set({ currentDate: date }),
}));
