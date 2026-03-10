'use client';

import {
    Lightbulb,
    FileEdit,
    CheckCircle2,
    Clock,
    Send,
    Plus,
    Inbox,
    AlertCircle,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentCard } from './content-card';
import type { Content } from '@/types/content';

const COLUMN_ICONS: Record<string, React.ElementType> = {
    idea: Lightbulb,
    draft: FileEdit,
    approved: CheckCircle2,
    scheduled: Clock,
    published: Send,
    failed: AlertCircle,
};

interface BoardColumnProps {
    column: {
        id: string;
        label: string;
        color: string;
    };
    cards: Content[];
    onAddContent?: () => void;
    onCardClick?: (content: Content) => void;
}

export function BoardColumn({ column, cards, onAddContent, onCardClick }: BoardColumnProps) {
    const Icon = COLUMN_ICONS[column.id] ?? Lightbulb;

    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.id}`,
        data: { type: 'column', column: column.id },
    });

    const sortedCards = [...cards].sort((a, b) => a.order - b.order);

    return (
        <div className={`flex w-full min-w-[12rem] flex-col rounded-xl bg-muted/30 border transition-colors ${isOver ? 'border-primary/50 bg-muted/50' : 'border-border/50'}`}>
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${column.color}20` }}
                    >
                        <Icon className="h-3.5 w-3.5" style={{ color: column.color }} />
                    </div>
                    <span className="text-sm font-medium">{column.label}</span>
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                        {cards.length}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md"
                    onClick={onAddContent}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Cards area — droppable + sortable */}
            <SortableContext items={sortedCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div
                    ref={setNodeRef}
                    className="flex-1 space-y-2 overflow-y-auto px-2 pb-2"
                    style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '80px' }}
                >
                    {sortedCards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-8 px-4">
                            <Inbox className="h-8 w-8 text-muted-foreground/50" />
                            <p className="mt-2 text-xs text-muted-foreground/70 text-center">
                                Nenhum conteúdo
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-xs"
                                onClick={onAddContent}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Adicionar
                            </Button>
                        </div>
                    ) : (
                        sortedCards.map((card) => (
                            <ContentCard
                                key={card.id}
                                content={card}
                                onClick={() => onCardClick?.(card)}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    );
}
