'use client';

import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Image, Circle, Film, Layers, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TYPE_BADGE_COLORS } from '@/lib/constants';
import type { Content } from '@/types/content';
import { useCollectionStore } from '@/stores';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_ICONS: Record<string, React.ElementType> = {
    post: Image,
    story: Circle,
    reel: Film,
    carousel: Layers,
};

const TYPE_LABELS: Record<string, string> = {
    post: 'Post',
    story: 'Story',
    reel: 'Reel',
    carousel: 'Carrossel',
};

interface ContentCardProps {
    content: Content;
    onClick?: () => void;
    isDragOverlay?: boolean;
}

export function ContentCard({ content, onClick, isDragOverlay }: ContentCardProps) {
    const { collections } = useCollectionStore();
    const primaryCollection = collections.find(c => content.collectionIds?.includes(c.id));
    const TypeIcon = TYPE_ICONS[content.type] ?? Image;
    const badgeColor = TYPE_BADGE_COLORS[content.type] ?? '';

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
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={isDragging ? undefined : onClick}
            className={`group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md hover:border-border/80 backdrop-blur-sm ${isDragOverlay ? 'shadow-xl rotate-2 scale-105' : ''}`}
        >
            {/* Header row */}
            <div className="mb-2 flex items-center justify-between">
                <Badge variant="outline" className={`text-xs ${badgeColor}`}>
                    <TypeIcon className="mr-1 h-3 w-3" />
                    {TYPE_LABELS[content.type]}
                </Badge>
                <div className="flex items-center gap-1.5">
                    {primaryCollection && (
                        <div
                            className="h-2 w-2 rounded-full shadow-sm"
                            style={{ backgroundColor: primaryCollection.color }}
                            title={primaryCollection.name}
                        />
                    )}
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing rounded p-0.5 hover:bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Arrastar card"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-medium leading-snug line-clamp-2">
                {content.title}
            </h4>

            {/* Scheduled date */}
            {content.scheduledAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                    📅{' '}
                    {format(parseISO(content.scheduledAt), "dd MMM, HH:mm", {
                        locale: ptBR,
                    })}
                </p>
            )}

            {/* Hashtags preview */}
            {content.hashtags.length > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground truncate">
                    {content.hashtags.slice(0, 3).join(' ')}
                    {content.hashtags.length > 3 && ` +${content.hashtags.length - 3}`}
                </p>
            )}
        </div>
    );
}
