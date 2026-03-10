'use client';

import { useState, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useContentStore } from '@/stores';
import type { Content, ContentStatus } from '@/types/content';

export function useBoardDnd() {
    const { contents, moveContent } = useContentStore();
    const [activeCard, setActiveCard] = useState<Content | null>(null);

    const onDragStart = useCallback(
        (event: DragStartEvent) => {
            const card = contents.find((c) => c.id === event.active.id);
            setActiveCard(card ?? null);
        },
        [contents],
    );

    const onDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveCard(null);

            if (!over) return;

            const activeId = active.id as string;
            const overId = over.id as string;

            // Determine target column
            const overData = over.data.current;
            let newStatus: ContentStatus;
            let newOrder: number;

            if (overData?.type === 'column') {
                // Dropped directly on a column
                newStatus = overData.column as ContentStatus;
                const columnCards = contents.filter((c) => c.status === newStatus && c.id !== activeId);
                newOrder = columnCards.length;
            } else {
                // Dropped on another card — take the card's column and position
                const overCard = contents.find((c) => c.id === overId);
                if (!overCard) return;
                newStatus = overCard.status;
                newOrder = overCard.order;
            }

            const card = contents.find((c) => c.id === activeId);
            if (!card || (card.status === newStatus && card.order === newOrder)) return;

            moveContent(activeId, newStatus, newOrder);
        },
        [contents, moveContent],
    );

    return { activeCard, onDragStart, onDragEnd };
}
