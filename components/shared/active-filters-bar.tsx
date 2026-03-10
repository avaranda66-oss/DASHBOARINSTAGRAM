'use client';

import { useUIStore, useAccountStore, useCollectionStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { X, Filter, SlidersHorizontal } from 'lucide-react';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ActiveFiltersBar() {
    const { filters, setFilter, clearFilters, setFilterPanelOpen } = useUIStore();
    const { accounts } = useAccountStore();
    const { collections } = useCollectionStore();

    const activeChips: { label: string; onRemove: () => void }[] = [];

    // Filter Active Count
    let activeCount = 0;
    if (filters.search) activeCount++;
    if (filters.accountId) activeCount++;
    if (filters.collectionId) activeCount++;
    if (filters.hashtag) activeCount++;
    if (filters.dateRange.start || filters.dateRange.end) activeCount++;
    activeCount += filters.types.length;
    activeCount += filters.statuses.length;

    // Types
    filters.types.forEach((t) => {
        const label = CONTENT_TYPES.find((ct) => ct.value === t)?.label || t;
        activeChips.push({
            label: `Tipo: ${label}`,
            onRemove: () => setFilter('types', filters.types.filter((xt) => xt !== t)),
        });
    });

    // Statuses
    filters.statuses.forEach((s) => {
        const label = CONTENT_STATUSES.find((cs) => cs.value === s)?.label || s;
        activeChips.push({
            label: `Status: ${label}`,
            onRemove: () => setFilter('statuses', filters.statuses.filter((xs) => xs !== s)),
        });
    });

    // Account
    if (filters.accountId) {
        const acc = accounts.find((a) => a.id === filters.accountId);
        activeChips.push({
            label: `Conta: ${acc ? acc.handle : 'Desconhecida'}`,
            onRemove: () => setFilter('accountId', null),
        });
    }

    // Collection
    if (filters.collectionId) {
        const col = collections.find((c) => c.id === filters.collectionId);
        activeChips.push({
            label: `Coleção: ${col ? col.name : 'Desconhecida'}`,
            onRemove: () => setFilter('collectionId', null),
        });
    }

    // Hashtag
    if (filters.hashtag) {
        activeChips.push({
            label: `Tag: #${filters.hashtag.replace('#', '')}`,
            onRemove: () => setFilter('hashtag', ''),
        });
    }

    // Date Range
    if (filters.dateRange.start || filters.dateRange.end) {
        let lbl = 'Período: ';
        if (filters.dateRange.start) lbl += format(parseISO(filters.dateRange.start), 'dd/MM', { locale: ptBR });
        if (filters.dateRange.start && filters.dateRange.end) lbl += ' até ';
        if (filters.dateRange.end) lbl += format(parseISO(filters.dateRange.end), 'dd/MM', { locale: ptBR });

        activeChips.push({
            label: lbl,
            onRemove: () => setFilter('dateRange', { start: null, end: null }),
        });
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
            <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 relative"
                onClick={() => setFilterPanelOpen(true)}
            >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros
                {activeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {activeCount}
                    </span>
                )}
            </Button>

            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

                    {activeChips.map((chip, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 bg-accent text-accent-foreground px-2.5 py-1 rounded-md text-xs font-medium border border-border"
                        >
                            <span>{chip.label}</span>
                            <button
                                onClick={chip.onRemove}
                                className="text-muted-foreground hover:text-foreground rounded-full hover:bg-background/80 p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={clearFilters}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2 transition-colors"
                    >
                        Limpar tudo
                    </button>
                </div>
            )}
        </div>
    );
}
