'use client';

import { usePathname } from 'next/navigation';
import { UserCircle } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/shared/search-bar';
import { AccountFilter } from '@/features/accounts/components/account-filter';
import { ApiStatusIndicator } from '@/components/shared/api-status-indicator';

const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/storyboard': 'Storyboard',
    '/dashboard/calendar': 'Calendário Editorial',
    '/dashboard/collections': 'Coleções',
    '/dashboard/accounts': 'Contas',
    '/dashboard/settings': 'Configurações',
};

export function AppHeader() {
    const pathname = usePathname();

    const title =
        Object.entries(PAGE_TITLES).find(([path]) =>
            path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path),
        )?.[1] ?? 'Dashboard';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md gap-4">
            {/* Dynamic page title */}
            <h1 className="text-lg font-semibold whitespace-nowrap hidden sm:block w-48">{title}</h1>

            <div className="flex-1 flex items-center justify-center max-w-2xl px-4 gap-4">
                <SearchBar />
                <div className="hidden md:block">
                    <AccountFilter />
                </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
                <ApiStatusIndicator />
                <div className="h-6 w-px bg-border hidden sm:block"></div>
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <UserCircle className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
