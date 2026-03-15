'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Content, ContentStatus } from '@/types/content';
import { MOCK_CONTENTS } from '@/lib/mock-data';
import {
    getContentsAction,
    saveContentAction,
    saveAllContentsAction,
    deleteContentAction
} from '@/app/actions/content.actions';

interface ContentSlice {
    contents: Content[];
    isLoaded: boolean;
    loadContents: () => Promise<void>;
    addContent: (data: Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void;
    updateContent: (id: string, data: Partial<Content>) => void;
    deleteContent: (id: string) => void;
    duplicateContent: (id: string) => void;
    moveContent: (id: string, newStatus: ContentStatus, newOrder: number) => void;
    refreshContents: () => Promise<void>;
}

export const useContentStore = create<ContentSlice>()((set, get) => ({
    contents: [],
    isLoaded: false,

    loadContents: async () => {
        try {
            let contents = await getContentsAction();
            if (contents.length === 0) {
                // Apenas em desenvolvimento — nunca popular produção com dados fictícios
                if (process.env.NODE_ENV === 'development') {
                    await saveAllContentsAction(MOCK_CONTENTS);
                    contents = MOCK_CONTENTS;
                }
                // Em produção: banco vazio = usuário novo, retorna [] sem seed automático
            }
            set({ contents, isLoaded: true });
        } catch (err) {
            console.error('[content-store] Erro ao carregar conteúdos:', err);
            set({ contents: [], isLoaded: true });
        }
    },

    addContent: (data) => {
        const now = new Date().toISOString();
        const content: Content = {
            ...data,
            id: nanoid(12),
            order: get().contents.length,
            createdAt: now,
            updatedAt: now,
        };
        set((state) => ({ contents: [...state.contents, content] }));
        saveContentAction(content).catch(console.error);
    },

    updateContent: (id, data) => {
        const now = new Date().toISOString();
        set((state) => ({
            contents: state.contents.map((c) =>
                c.id === id ? { ...c, ...data, updatedAt: now } : c,
            ),
        }));
        const updated = get().contents.find((c) => c.id === id);
        if (updated) saveContentAction(updated).catch(console.error);
    },

    deleteContent: (id) => {
        set((state) => ({
            contents: state.contents.filter((c) => c.id !== id),
        }));
        deleteContentAction(id).catch(console.error);
    },

    duplicateContent: (id) => {
        const original = get().contents.find((c) => c.id === id);
        if (!original) return;
        const now = new Date().toISOString();
        const duplicate: Content = {
            ...original,
            id: nanoid(12),
            title: `${original.title} (Cópia)`,
            status: 'draft',
            scheduledAt: null,
            order: get().contents.length,
            createdAt: now,
            updatedAt: now,
        };
        set((state) => ({ contents: [...state.contents, duplicate] }));
        saveContentAction(duplicate).catch(console.error);
    },

    moveContent: (id, newStatus, targetOrder) => {
        const now = new Date().toISOString();
        set((state) => {
            const movingCard = state.contents.find((c) => c.id === id);
            if (!movingCard) return state;

            // All other cards (not the moving one)
            const others = state.contents.filter((c) => c.id !== id);

            // Cards in the target column, sorted by current order
            const targetCol = others
                .filter((c) => c.status === newStatus)
                .sort((a, b) => a.order - b.order);

            // Insert the moving card at the clamped position
            const insertAt = Math.max(0, Math.min(targetOrder, targetCol.length));
            targetCol.splice(insertAt, 0, { ...movingCard, status: newStatus, updatedAt: now });

            // Reassign sequential orders 0, 1, 2… so there are never duplicates
            const reordered = targetCol.map((c, i) => ({ ...c, order: i }));

            // Cards in other columns remain untouched
            const otherCols = others.filter((c) => c.status !== newStatus);

            return { contents: [...otherCols, ...reordered] };
        });

        // Save only the moved card to DB (async, non-blocking)
        const updated = get().contents.find((c) => c.id === id);
        if (updated) saveContentAction(updated).catch(console.error);
    },

    refreshContents: async () => {
        try {
            const contents = await getContentsAction();
            if (contents.length > 0) {
                set({ contents });
            }
        } catch (e) {
            console.error('[ContentStore] Error refreshing contents:', e);
        }
    },
}));
