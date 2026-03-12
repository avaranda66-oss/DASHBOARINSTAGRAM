'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowUpDown,
    ExternalLink,
    Heart,
    MessageCircle,
    Eye,
    Image,
    Film,
    Layers,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InstagramPostMetrics } from '@/types/analytics';

interface PostsTableProps {
    posts: InstagramPostMetrics[];
}

type SortKey = 'likesCount' | 'commentsCount' | 'videoViewCount' | 'timestamp';
type SortDir = 'asc' | 'desc';

const TYPE_ICONS: Record<string, React.ElementType> = {
    Image: Image,
    Video: Film,
    Sidecar: Layers,
};

const TYPE_LABELS: Record<string, string> = {
    Image: 'Post',
    Video: 'Reels/Vídeo',
    Sidecar: 'Carrossel',
};

const TYPE_COLORS: Record<string, string> = {
    Image: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Video: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Sidecar: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

export function PostsTable({ posts }: PostsTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('likesCount');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = useMemo(() => {
        return [...posts].sort((a, b) => {
            const valA = a[sortKey] ?? 0;
            const valB = b[sortKey] ?? 0;

            if (sortKey === 'timestamp') {
                const tA = new Date(valA as string).getTime();
                const tB = new Date(valB as string).getTime();
                return sortDir === 'asc' ? tA - tB : tB - tA;
            }

            return sortDir === 'asc'
                ? (valA as number) - (valB as number)
                : (valB as number) - (valA as number);
        });
    }, [posts, sortKey, sortDir]);

    const SortButton = ({ field, children }: { field: SortKey; children: React.ReactNode }) => (
        <button
            onClick={() => toggleSort(field)}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
            {children}
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    return (
        <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Post
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Tipo
                        </th>
                        <th className="px-4 py-3 text-right">
                            <SortButton field="likesCount">Likes</SortButton>
                        </th>
                        <th className="px-4 py-3 text-right">
                            <SortButton field="commentsCount">Comentários</SortButton>
                        </th>
                        <th className="px-4 py-3 text-right">
                            <SortButton field="videoViewCount">Views</SortButton>
                        </th>
                        <th className="px-4 py-3 text-right">
                            <SortButton field="timestamp">Data</SortButton>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Link
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((post, i) => {
                        const TypeIcon = TYPE_ICONS[post.type] ?? Image;
                        const typeColor = TYPE_COLORS[post.type] ?? TYPE_COLORS.Image;
                        const typeLabel = TYPE_LABELS[post.type] ?? post.type;

                        return (
                            <motion.tr
                                key={post.id || i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                            >
                                {/* Post info */}
                                <td className="px-4 py-3 max-w-[300px]">
                                    <div className="flex items-center gap-3">
                                        {post.displayUrl ? (
                                            <img
                                                src={`/api/image-proxy?url=${encodeURIComponent(post.displayUrl)}`}
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-lg object-cover border border-border"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                                <Image className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <p className="truncate text-sm">{post.caption || '(sem legenda)'}</p>
                                    </div>
                                </td>

                                {/* Type */}
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                                        <TypeIcon className="h-3 w-3" />
                                        {typeLabel}
                                    </span>
                                </td>

                                {/* Likes */}
                                <td className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center gap-1 text-pink-400">
                                        <Heart className="h-3.5 w-3.5" />
                                        {formatNumber(post.likesCount)}
                                    </span>
                                </td>

                                {/* Comments */}
                                <td className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center gap-1 text-blue-400">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        {formatNumber(post.commentsCount)}
                                    </span>
                                </td>

                                {/* Views */}
                                <td className="px-4 py-3 text-right">
                                    {post.videoViewCount != null ? (
                                        <span className="inline-flex items-center gap-1 text-purple-400">
                                            <Eye className="h-3.5 w-3.5" />
                                            {formatNumber(post.videoViewCount)}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </td>

                                {/* Date */}
                                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                    {post.timestamp
                                        ? format(parseISO(post.timestamp), 'dd MMM yyyy', { locale: ptBR })
                                        : '—'}
                                </td>

                                {/* Link */}
                                <td className="px-4 py-3 text-center">
                                    <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
                                        title="Abrir no Instagram"
                                    >
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
