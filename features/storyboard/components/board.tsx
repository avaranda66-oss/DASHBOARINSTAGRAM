'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
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
import { FilterPanel } from '@/components/shared/filter-panel';
import { ActiveFiltersBar } from '@/components/shared/active-filters-bar';
import { ImportMdButton } from './import-md-button';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { useFilteredContents } from '@/hooks/use-filtered-contents';
import { Button } from '@/components/ui/button';
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

        // Configurar auto-refresh a cada 30 segundos
        const interval = setInterval(() => {
            refreshContents();
        }, 30000);

        return () => clearInterval(interval);
    }, [isLoaded, loadContents, refreshContents]);

    return (
        <div className="relative h-full flex flex-col">
            <ActiveFiltersBar />

            <div className="flex-1 min-h-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                >
                    {/* Board grid — todas as colunas visíveis sem scroll */}
                    <div className="grid grid-cols-6 gap-3 pb-4 h-full">
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

                    {/* Drag overlay */}
                    <DragOverlay>
                        {activeCard ? (
                            <ContentCard content={activeCard} isDragOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Action Buttons */}
                <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
                    <ImportMdButton />
                    <Button
                        size="lg"
                        className="h-14 w-14 rounded-full shadow-lg instagram-gradient text-white border-0 hover:opacity-90"
                        onClick={() => onAddContent?.()}
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>

                <FilterPanel />
            </div>
        </div>
    );
}
