'use client';

import { useUIStore, useAccountStore, useCollectionStore } from '@/stores';
import { Button } from '@/design-system/atoms/Button';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/design-system/utils/cn';

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
            label: `T:${label.toUpperCase()}`,
            onRemove: () => setFilter('types', filters.types.filter((xt) => xt !== t)),
        });
    });

    // Statuses
    filters.statuses.forEach((s) => {
        const label = CONTENT_STATUSES.find((cs) => cs.value === s)?.label || s;
        activeChips.push({
            label: `S:${label.toUpperCase()}`,
            onRemove: () => setFilter('statuses', filters.statuses.filter((xs) => xs !== s)),
        });
    });

    // Account
    if (filters.accountId) {
        const acc = accounts.find((a) => a.id === filters.accountId);
        activeChips.push({
            label: `A:${acc ? acc.handle.toUpperCase() : '??'}`,
            onRemove: () => setFilter('accountId', null),
        });
    }

    // Collection
    if (filters.collectionId) {
        const col = collections.find((c) => c.id === filters.collectionId);
        activeChips.push({
            label: `C:${col ? col.name.toUpperCase() : '??'}`,
            onRemove: () => setFilter('collectionId', null),
        });
    }

    // Hashtag
    if (filters.hashtag) {
        activeChips.push({
            label: `#${filters.hashtag.replace('#', '').toUpperCase()}`,
            onRemove: () => setFilter('hashtag', ''),
        });
    }

    // Date Range
    if (filters.dateRange.start || filters.dateRange.end) {
        let lbl = 'T:';
        if (filters.dateRange.start) lbl += format(parseISO(filters.dateRange.start), 'dd/MM');
        if (filters.dateRange.start && filters.dateRange.end) lbl += '>';
        if (filters.dateRange.end) lbl += format(parseISO(filters.dateRange.end), 'dd/MM');

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
                className="flex-shrink-0 relative font-mono text-[9px] tracking-widest uppercase border-white/10"
                onClick={() => setFilterPanelOpen(true)}
            >
                [ ◎_FILTERS ]
                {activeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded bg-[#A3E635] text-black text-[8px] font-bold flex items-center justify-center">
                        {activeCount.toString().padStart(2, '0')}
                    </span>
                )}
            </Button>

            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    <div className="h-4 w-[1px] bg-white/10 mx-2 hidden sm:block" />

                    {activeChips.map((chip, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-[#0A0A0A] text-[#F5F5F5] px-2 py-0.5 rounded border border-white/5 transition-colors hover:border-[#A3E635]/30 group"
                        >
                            <span className="font-mono text-[9px] tracking-tight">{chip.label}</span>
                            <button
                                onClick={chip.onRemove}
                                className="text-[#4A4A4A] hover:text-[#EF4444] transition-colors font-mono text-[8px]"
                            >
                                [X]
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={clearFilters}
                        className="font-mono text-[9px] tracking-widest text-[#4A4A4A] hover:text-[#A3E635] ml-2 transition-colors uppercase"
                    >
                        SHRED_ALL
                    </button>
                </div>
            )}
        </div>
    );
}
