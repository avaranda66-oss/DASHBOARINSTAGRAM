'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchBar() {
    const { filters, setFilter } = useUIStore();
    const [localSearch, setLocalSearch] = useState(filters.search);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.search) {
                setFilter('search', localSearch);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localSearch, filters.search, setFilter]);

    // Sync external clear
    useEffect(() => {
        if (filters.search !== localSearch && filters.search === '') {
            setLocalSearch('');
        }
    }, [filters.search]);

    return (
        <div className="relative w-full max-w-sm hidden md:flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Buscar conteúdos... (Cmd+K)"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 pr-9 h-9 w-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background transition-all"
            />
            {localSearch && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        setLocalSearch('');
                        setFilter('search', '');
                    }}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}
