'use client';

import { useMemo } from 'react';
import { useContentStore, useUIStore, useAccountStore } from '@/stores';
import type { Content } from '@/types/content';
import { isWithinInterval, parseISO } from 'date-fns';

export function useFilteredContents() {
    const { contents } = useContentStore();
    const { filters } = useUIStore();
    const { selectedAccountId } = useAccountStore();

    const filteredContents = useMemo(() => {
        return contents.filter((c) => {
            // Global Account Filter
            if (selectedAccountId !== 'all' && c.accountId !== selectedAccountId) {
                return false;
            }
            // Free text search
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const matchesSearch =
                    c.title.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }

            // Content Types
            if (filters.types.length > 0 && !filters.types.includes(c.type)) {
                return false;
            }

            // Content Statuses
            if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) {
                return false;
            }

            // Collection ID
            if (filters.collectionId && !c.collectionIds.includes(filters.collectionId)) {
                return false;
            }

            // Single Hashtag
            if (filters.hashtag) {
                const hq = filters.hashtag.toLowerCase().replace('#', '');
                const hasTag = c.hashtags.some((h) => h.toLowerCase().includes(hq));
                if (!hasTag) return false;
            }

            // Date Range
            if (filters.dateRange.start || filters.dateRange.end) {
                if (!c.scheduledAt) return false;

                const date = parseISO(c.scheduledAt);
                const start = filters.dateRange.start ? parseISO(filters.dateRange.start) : new Date(0);
                const end = filters.dateRange.end ? parseISO(filters.dateRange.end) : new Date('2100-01-01');

                if (!isWithinInterval(date, { start, end })) {
                    return false;
                }
            }

            return true;
        });
    }, [contents, filters, selectedAccountId]);

    return filteredContents;
}
