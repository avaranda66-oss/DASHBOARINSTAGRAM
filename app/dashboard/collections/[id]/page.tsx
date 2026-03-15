'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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
            <button
                onClick={() => router.push('/dashboard/collections')}
                className="flex items-center gap-2 -ml-1"
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4A4A4A',
                    transition: 'color 100ms',
                    padding: '4px 8px',
                    borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F5F5F5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A4A4A')}
            >
                <span className="font-mono text-[11px]">←</span>
                <span className="text-[13px]">Voltar para Coleções</span>
            </button>

            <CollectionDetail id={id} />
        </div>
    );
}
