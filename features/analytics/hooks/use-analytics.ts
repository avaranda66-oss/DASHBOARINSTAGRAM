'use client';

import { useMemo } from 'react';
import { useAnalyticsStore } from '@/stores';
import type { InstagramPostMetrics } from '@/types/analytics';

function applyPeriodFilter(
    posts: InstagramPostMetrics[],
    period: string,
    customRange?: { start: string; end: string } | null
): InstagramPostMetrics[] {
    if (period === 'all') return posts;

    if (period === 'custom' && customRange?.start && customRange?.end) {
        const start = new Date(customRange.start).getTime();
        const end = new Date(customRange.end).getTime() + 86399999;
        return posts.filter(p => p.timestamp && new Date(p.timestamp).getTime() >= start && new Date(p.timestamp).getTime() <= end);
    }

    const days = parseInt(period);
    if (isNaN(days)) return posts;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return posts.filter(p => p.timestamp && new Date(p.timestamp).getTime() >= cutoff);
}

/**
 * Convenience hook wrapping the analytics Zustand store.
 * Provides the store state plus helper booleans and filtered posts.
 */
export function useAnalytics() {
    const store = useAnalyticsStore();

    const filteredPosts = useMemo(
        () => applyPeriodFilter(store.posts, store.filterPeriod, store.customDateRange),
        [store.posts, store.filterPeriod, store.customDateRange]
    );

    return {
        ...store,
        filteredPosts,
        hasData: store.posts.length > 0,
        isEmpty: !store.isLoading && !store.error && store.posts.length === 0,
    };
}
