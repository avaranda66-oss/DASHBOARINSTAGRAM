'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Collection } from '@/types/collection';
import {
    getCollectionsAction,
    saveCollectionAction,
    deleteCollectionAction
} from '@/app/actions/collection.actions';

interface CollectionSlice {
    collections: Collection[];
    isLoaded: boolean;
    loadCollections: () => Promise<void>;
    addCollection: (data: Omit<Collection, 'id' | 'createdAt'>) => void;
    updateCollection: (id: string, data: Partial<Collection>) => void;
    deleteCollection: (id: string) => void;
}

export const useCollectionStore = create<CollectionSlice>()((set, get) => ({
    collections: [],
    isLoaded: false,

    loadCollections: async () => {
        const collections = await getCollectionsAction();
        set({ collections, isLoaded: true });
    },

    addCollection: (data) => {
        const now = new Date().toISOString();
        const collection: Collection = {
            ...data,
            id: nanoid(12),
            createdAt: now,
        };
        set((state) => ({ collections: [...state.collections, collection] }));
        saveCollectionAction(collection).catch(console.error);
    },

    updateCollection: (id, data) => {
        set((state) => ({
            collections: state.collections.map((c) =>
                c.id === id ? { ...c, ...data } : c,
            ),
        }));
        const updated = get().collections.find((c) => c.id === id);
        if (updated) saveCollectionAction(updated).catch(console.error);
    },

    deleteCollection: (id) => {
        set((state) => ({
            collections: state.collections.filter((c) => c.id !== id),
        }));
        deleteCollectionAction(id).catch(console.error);
    },
}));
