'use client';

import { useEffect } from 'react';
import { useCollectionStore, useContentStore } from '@/stores';
import { CollectionList } from '@/features/collections/components/collection-list';

export default function CollectionsPage() {
    const { isLoaded: isCollectionsLoaded, loadCollections } = useCollectionStore();
    const { isLoaded: isContentsLoaded, loadContents } = useContentStore();

    useEffect(() => {
        if (!isCollectionsLoaded) loadCollections();
        if (!isContentsLoaded) loadContents();
    }, [isCollectionsLoaded, isContentsLoaded, loadCollections, loadContents]);

    return <CollectionList />;
}
