'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { MobileSidebar } from './mobile-sidebar';
import { CommandPalette } from '@/components/shared/command-palette';
import { useUIStore, useAccountStore } from '@/stores';
import { useTheme } from '@/hooks/use-theme';
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const collapsed = useUIStore((s) => s.sidebarCollapsed);
    const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
    const loadUISettings = useUIStore((s) => s.loadSettings);
    const loadAccounts = useAccountStore((s) => s.loadAccounts);
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();

    // Initialize theme and load settings on mount
    useTheme();

    useEffect(() => {
        loadUISettings();
        loadAccounts();
    }, [loadUISettings, loadAccounts]);

    // Auto-collapse on tablet, hide on mobile
    useEffect(() => {
        if (isTablet) {
            setSidebarCollapsed(true);
        }
    }, [isTablet, setSidebarCollapsed]);

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile: bottom sheet sidebar */}
            {isMobile ? (
                <MobileSidebar />
            ) : (
                <AppSidebar />
            )}

            {/* Main content area */}
            <motion.main
                className={isMobile ? '' : undefined}
                animate={{
                    marginLeft: isMobile ? 0 : collapsed ? 72 : 240,
                }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
                <AppHeader />
                <div className="p-6">{children}</div>
            </motion.main>

            <CommandPalette />
        </div>
    );
}
