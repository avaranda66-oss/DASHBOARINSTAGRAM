'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Kanban,
    Calendar,
    FolderOpen,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    Instagram,
    BarChart3,
    Radar,
    Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/storyboard', label: 'Storyboard', icon: Kanban },
    { href: '/dashboard/calendar', label: 'Calendário', icon: Calendar },
    { href: '/dashboard/collections', label: 'Coleções', icon: FolderOpen },
    { href: '/dashboard/accounts', label: 'Contas', icon: Users },
    { href: '/dashboard/analytics', label: 'Métricas Instagram', icon: BarChart3 },
    { href: '/dashboard/ads', label: 'Métricas Campanhas', icon: Megaphone },
    { href: '/dashboard/intelligence', label: 'Métricas Google Maps', icon: Radar },
    { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
] as const;

export function AppSidebar() {
    const pathname = usePathname();
    const collapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);

    return (
        <motion.aside
            className={cn(
                'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground',
            )}
            animate={{ width: collapsed ? 72 : 240 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-border px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg instagram-gradient">
                    <Instagram className="h-5 w-5 text-white" />
                </div>
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.span
                            className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            Dashboard IG
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {NAV_ITEMS.map((item) => {
                    const isActive =
                        item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full instagram-gradient"
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                            )}

                            <item.icon className="h-5 w-5 shrink-0" />

                            <AnimatePresence mode="wait">
                                {!collapsed && (
                                    <motion.span
                                        className="whitespace-nowrap overflow-hidden"
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <div className="border-t border-border p-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="w-full h-9 rounded-lg"
                    aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </motion.aside>
    );
}
