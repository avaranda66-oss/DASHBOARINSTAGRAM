'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/design-system/utils/cn';
import type { Content } from '@/types/content';
import { useCollectionStore } from '@/stores';
import { format, parseISO } from 'date-fns';
import { TYPE_HEX_COLORS, TYPE_ABBR } from '@/lib/constants';

interface ContentCardProps {
    content: Content;
    onClick?: () => void;
    isDragOverlay?: boolean;
}

export function ContentCard({ content, onClick, isDragOverlay }: ContentCardProps) {
    const { collections } = useCollectionStore();
    const primaryCollection = collections.find(c => content.collectionIds?.includes(c.id));

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: content.id,
        data: { type: 'card', card: content },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        backgroundColor: '#0A0A0A',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: '8px',
    };

    const typeKey = content.type?.toLowerCase() ?? '';
    const typeColor = TYPE_HEX_COLORS[typeKey] ?? '#8A8A8A';
    const typeLabel = TYPE_ABBR[typeKey] ?? content.type?.toUpperCase() ?? '???';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={isDragging ? undefined : onClick}
            className={cn(
                "group cursor-grab active:cursor-grabbing border p-3 transition-colors duration-100 select-none",
                isDragOverlay ? 'shadow-2xl border-[#A3E635]/40 rotate-1 scale-[1.02] z-50 cursor-grabbing' : ''
            )}
            onMouseEnter={(e) => {
                if (!isDragging) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
                if (!isDragging) e.currentTarget.style.backgroundColor = '#0A0A0A';
            }}
        >
            {/* Header row */}
            <div className="mb-3 flex items-center justify-between">
                <span
                    className="font-mono text-[10px] tracking-wider"
                    style={{ color: typeColor }}
                >
                    [{typeLabel}]
                </span>

                <div className="flex items-center gap-2">
                    {primaryCollection && (
                        <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: primaryCollection.color }}
                        />
                    )}
                    {/* Visual drag hint */}
                    <span className="font-mono text-[10px] text-[#3A3A3A] group-hover:text-[#4A4A4A] transition-colors select-none">
                        ⠿
                    </span>
                </div>
            </div>

            {/* Title */}
            <h4 className="text-[12px] font-bold text-[#F5F5F5] leading-snug line-clamp-2 uppercase tracking-wide">
                {content.title}
            </h4>

            {/* Metadata Footer */}
            <div className="mt-4 pt-3 flex items-center justify-between border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="font-mono text-[9px] text-[#4A4A4A] tracking-wider">
                    {content.scheduledAt ? (
                        <span className="flex items-center gap-1">
                            ◷ {format(parseISO(content.scheduledAt), "dd.MM | HH:mm")}
                        </span>
                    ) : (
                        'UNSCHEDULED'
                    )}
                </div>

                {content.hashtags.length > 0 && (
                    <div className="font-mono text-[9px] text-[#A3E635] opacity-60">
                        #{content.hashtags.length.toString().padStart(2, '0')}
                    </div>
                )}
            </div>
        </div>
    );
}
