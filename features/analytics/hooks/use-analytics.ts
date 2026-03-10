'use client';

import { useAnalyticsStore } from '@/stores';

/**
 * Convenience hook wrapping the analytics Zustand store.
 * Provides the store state plus helper booleans.
 */
export function useAnalytics() {
    const store = useAnalyticsStore();

    return {
        ...store,
        hasData: store.posts.length > 0,
        isEmpty: !store.isLoading && !store.error && store.posts.length === 0,
    };
}
