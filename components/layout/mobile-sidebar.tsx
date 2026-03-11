'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Kanban,
    Calendar,
    FolderOpen,
    Users,
    Settings,
    Menu,
    Instagram,
    BarChart3,
    Radar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AccountFilter } from '@/features/accounts/components/account-filter';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/storyboard', label: 'Storyboard', icon: Kanban },
    { href: '/dashboard/calendar', label: 'Calendário', icon: Calendar },
    { href: '/dashboard/collections', label: 'Coleções', icon: FolderOpen },
    { href: '/dashboard/accounts', label: 'Contas', icon: Users },
    { href: '/dashboard/analytics', label: 'Métricas', icon: BarChart3 },
    { href: '/dashboard/intelligence', label: 'Inteligência', icon: Radar },
    { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
] as const;

export function MobileSidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Mobile header with menu button */}
            <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Menu className="h-5 w-5" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>

                        {/* Logo */}
                        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg instagram-gradient">
                                <Instagram className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-semibold">Dashboard IG</span>
                        </div>

                        {/* Nav items */}
                        <nav className="space-y-1 px-3 py-4">
                            {NAV_ITEMS.map((item) => {
                                const isActive =
                                    item.href === '/dashboard'
                                        ? pathname === '/dashboard'
                                        : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-accent text-accent-foreground'
                                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                                        )}
                                    >
                                        <item.icon className="h-5 w-5 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Account Filter for Mobile */}
                        <div className="px-4 py-4 border-t border-border">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                                Cliente Atual
                            </p>
                            <AccountFilter />
                        </div>
                    </SheetContent>
                </Sheet>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg instagram-gradient">
                    <Instagram className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold">Dashboard IG</span>
            </div>

            {/* Spacer for mobile header */}
            <div className="h-14 md:hidden" />
        </>
    );
}
