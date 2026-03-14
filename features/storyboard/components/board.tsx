'use client';

import { useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useContentStore } from '@/stores';
import { BOARD_COLUMNS } from '@/lib/constants';
import { BoardColumn } from './board-column';
import { ContentCard } from './content-card';
import { FilterPanel, ActiveFiltersBar } from '@/design-system/molecules';
import { ImportMdButton } from './import-md-button';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { Button } from '@/design-system/atoms/Button';
import type { Content } from '@/types/content';

interface BoardProps {
    onAddContent?: (status?: string) => void;
    onEditContent?: (content: Content) => void;
}

export function Board({ onAddContent, onEditContent }: BoardProps) {
    const { isLoaded, loadContents, refreshContents } = useContentStore();
    const filteredContents = useFilteredContents();
    const { activeCard, onDragStart, onDragEnd } = useBoardDnd();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        if (!isLoaded) loadContents();

        const interval = setInterval(() => {
            refreshContents();
        }, 30000);

        return () => clearInterval(interval);
    }, [isLoaded, loadContents, refreshContents]);

    return (
        <div className="relative h-full flex flex-col space-y-4">
            <ActiveFiltersBar />

            <div className="flex-1 min-h-0 overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-4 h-full">
                        {BOARD_COLUMNS.map((column) => (
                            <BoardColumn
                                key={column.id}
                                column={column}
                                cards={filteredContents.filter((c) => c.status === column.id)}
                                onAddContent={() => onAddContent?.(column.id)}
                                onCardClick={(content) => onEditContent?.(content)}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeCard ? (
                            <ContentCard content={activeCard} isDragOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
                    <ImportMdButton />
                    <Button
                        onClick={() => onAddContent?.()}
                        variant="solid"
                        className="h-14 w-14 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.3)] !p-0"
                    >
                        <span className="text-2xl font-light">+</span>
                    </Button>
                </div>

                <FilterPanel />
            </div>
        </div>
    );
}
