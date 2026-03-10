'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores';

export function useTheme() {
    const theme = useUIStore((s) => s.theme);
    const setTheme = useUIStore((s) => s.setTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark', 'light');
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return { theme, setTheme, toggleTheme };
}
