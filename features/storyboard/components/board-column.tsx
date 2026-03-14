'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ContentCard } from './content-card';
import type { Content } from '@/types/content';

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
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.id}`,
        data: { type: 'column', column: column.id },
    });

    const sortedCards = [...cards].sort((a, b) => a.order - b.order);

    return (
        <div 
            className={cn(
                "flex w-full min-w-[14rem] flex-col rounded-[8px] border transition-colors",
                isOver ? "bg-white/[0.04] border-[#A3E635]/30" : "bg-[#0A0A0A] border-white/10"
            )}
            style={{ 
                backgroundColor: '#0A0A0A',
                borderColor: isOver ? 'rgba(163,230,53,0.3)' : 'rgba(255,255,255,0.08)'
            }}
        >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 h-9 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-[#4A4A4A] uppercase">{column.label}</span>
                    <span className="font-mono text-[10px] text-[#A3E635] opacity-80">
                        [{cards.length.toString().padStart(2, '0')}]
                    </span>
                </div>
                <button
                    onClick={onAddContent}
                    className="p-1 hover:text-[#A3E635] transition-colors"
                >
                    <span className="font-mono text-[12px]">+</span>
                </button>
            </div>

            {/* Cards area */}
            <SortableContext items={sortedCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div
                    ref={setNodeRef}
                    className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-none"
                    style={{ maxHeight: 'calc(100vh - 220px)', minHeight: '100px' }}
                >
                    {sortedCards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <span className="font-mono text-[10px] text-[#4A4A4A] uppercase tracking-widest">Empty_Node</span>
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

import { cn } from '@/design-system/utils/cn';
