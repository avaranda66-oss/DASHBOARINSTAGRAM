'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollectionStore, useContentStore } from '@/stores';
import { CollectionDetail } from '@/features/collections/components/collection-detail';

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { isLoaded: collectionsLoaded, loadCollections } = useCollectionStore();
    const { isLoaded: contentsLoaded, loadContents } = useContentStore();

    useEffect(() => {
        if (!collectionsLoaded) loadCollections();
        if (!contentsLoaded) loadContents();
    }, [collectionsLoaded, contentsLoaded, loadCollections, loadContents]);

    return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/collections')} className="text-muted-foreground -ml-2 hover:text-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar para Coleções
            </Button>

            <CollectionDetail id={id} />
        </div>
    );
}
