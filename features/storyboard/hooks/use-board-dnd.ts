'use client';

import { useState, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { toast } from 'sonner';
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

    // Called continuously while dragging — gives live cross-column preview
    const onDragOver = useCallback(
        (event: DragOverEvent) => {
            const { active, over } = event;
            if (!over) return;

            const activeId = active.id as string;
            const overId = over.id as string;
            if (activeId === overId) return;

            const draggingCard = contents.find((c) => c.id === activeId);
            if (!draggingCard) return;

            const overData = over.data.current;
            let targetStatus: ContentStatus;

            if (overData?.type === 'column') {
                targetStatus = overData.column as ContentStatus;
            } else {
                // Hovering over another card — use that card's column
                const overCard = contents.find((c) => c.id === overId);
                if (!overCard) return;
                targetStatus = overCard.status;
            }

            // Only trigger optimistic move when crossing a column boundary
            if (draggingCard.status !== targetStatus) {
                const targetColumnCards = contents.filter(
                    (c) => c.status === targetStatus && c.id !== activeId,
                );
                moveContent(activeId, targetStatus, targetColumnCards.length);
            }
        },
        [contents, moveContent],
    );

    // Called once on drop — resolves final position within the column
    const onDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            const draggedCard = activeCard; // capture original card before clearing
            setActiveCard(null);

            if (!over) return;

            const activeId = active.id as string;
            const overId = over.id as string;
            const overData = over.data.current;

            let newStatus: ContentStatus;
            let newOrder: number;

            if (overData?.type === 'column') {
                newStatus = overData.column as ContentStatus;
                const colCards = contents.filter(
                    (c) => c.status === newStatus && c.id !== activeId,
                );
                newOrder = colCards.length;
            } else {
                const overCard = contents.find((c) => c.id === overId);
                if (!overCard) return;
                newStatus = overCard.status;
                newOrder = overCard.order;
            }

            // Guard: 'scheduled' requires scheduledAt to be set
            if (newStatus === 'scheduled') {
                const card = contents.find((c) => c.id === activeId);
                if (card && !card.scheduledAt) {
                    // Revert the optimistic move performed by onDragOver
                    if (draggedCard) {
                        moveContent(activeId, draggedCard.status, draggedCard.order);
                    }
                    toast.warning('Defina uma data de agendamento antes de mover para Agendado.');
                    return;
                }
            }

            const card = contents.find((c) => c.id === activeId);
            if (!card) return;

            // Persist final position (already in correct column from onDragOver)
            moveContent(activeId, newStatus, newOrder);
        },
        [activeCard, contents, moveContent],
    );

    return { activeCard, onDragStart, onDragOver, onDragEnd };
}
