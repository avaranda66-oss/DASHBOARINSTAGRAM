'use client';

import { create } from 'zustand';
import type { ContentType, ContentStatus } from '@/types/content';

export interface Filters {
    search: string;
    types: ContentType[];
    statuses: ContentStatus[];
    accountId: string | null;
    collectionId: string | null;
    hashtag: string;
    dateRange: {
        start: string | null;
        end: string | null;
    };
}

const defaultFilters: Filters = {
    search: '',
    types: [],
    statuses: [],
    accountId: null,
    collectionId: null,
    hashtag: '',
    dateRange: { start: null, end: null },
};

interface UISlice {
    filters: Filters;
    filterPanelOpen: boolean;
    commandPaletteOpen: boolean;
    sidebarCollapsed: boolean;
    theme: 'dark' | 'light';
    isLoaded: boolean;
    loadSettings: () => Promise<void>;
    setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
    clearFilters: () => void;
    setFilterPanelOpen: (open: boolean) => void;
    setCommandPaletteOpen: (open: boolean) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
}

import { getSettingAction, saveSettingAction } from '@/app/actions/settings.actions';

export const useUIStore = create<UISlice>()((set) => ({
    filters: defaultFilters,
    filterPanelOpen: false,
    commandPaletteOpen: false,
    sidebarCollapsed: false,
    theme: 'dark',
    isLoaded: false,

    loadSettings: async () => {
        const [theme, sidebar] = await Promise.all([
            getSettingAction('ui_theme'),
            getSettingAction('ui_sidebar_collapsed')
        ]);
        set({
            theme: (theme === 'light' || theme === 'dark') ? theme : 'dark',
            sidebarCollapsed: sidebar === 'true',
            isLoaded: true
        });
    },

    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),

    clearFilters: () => set({ filters: defaultFilters }),

    setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
        saveSettingAction('ui_sidebar_collapsed', String(collapsed)).catch(console.error);
    },
    toggleSidebar: () => set((state) => {
        const collapsed = !state.sidebarCollapsed;
        saveSettingAction('ui_sidebar_collapsed', String(collapsed)).catch(console.error);
        return { sidebarCollapsed: collapsed };
    }),
    setTheme: (theme) => {
        set({ theme });
        saveSettingAction('ui_theme', theme).catch(console.error);
    },
}));
