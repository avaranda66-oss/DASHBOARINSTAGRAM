'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Heart,
    MessageCircle,
    Eye,
    ExternalLink,
    Image as ImageIcon,
    Film,
    Layers,
    Calendar,
    Hash,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InstagramPostMetrics } from '@/types/analytics';

interface PostCardsProps {
    posts: InstagramPostMetrics[];
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    Image: { icon: ImageIcon, label: 'Post', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    Video: { icon: Film, label: 'Reels/Vídeo', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    Sidecar: { icon: Layers, label: 'Carrossel', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

function PostImage({ src, alt }: { src: string; alt: string }) {
    const [error, setError] = useState(false);
    const proxiedSrc = src ? `/api/image-proxy?url=${encodeURIComponent(src)}` : '';

    if (!src || error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
        );
    }

    return (
        <img
            src={proxiedSrc}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
            loading="lazy"
        />
    );
}

export function PostCards({ posts }: PostCardsProps) {
    return (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post, i) => {
                const config = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.Image;
                const TypeIcon = config.icon;

                // Only show real engagement when we have video views
                const hasViews = post.videoViewCount != null && post.videoViewCount > 0;
                const engagement = hasViews
                    ? Math.round(((post.likesCount + post.commentsCount) / post.videoViewCount!) * 100 * 100) / 100
                    : null;

                return (
                    <motion.div
                        key={post.id || post.shortCode || i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.25 }}
                        className="group rounded-lg border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-border/80"
                    >
                        {/* Image — 4:5 aspect ratio (Instagram standard) */}
                        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                            <PostImage src={post.displayUrl} alt={post.caption?.slice(0, 60) || 'Post'} />

                            {/* Overlay on hover */}
                            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="flex items-center gap-1 text-white text-sm font-semibold">
                                    <Heart className="h-4 w-4 fill-white" />
                                    {formatNumber(post.likesCount)}
                                </div>
                                <div className="flex items-center gap-1 text-white text-sm font-semibold">
                                    <MessageCircle className="h-4 w-4 fill-white" />
                                    {formatNumber(post.commentsCount)}
                                </div>
                                {hasViews && (
                                    <div className="flex items-center gap-1 text-white text-sm font-semibold">
                                        <Eye className="h-4 w-4" />
                                        {formatNumber(post.videoViewCount!)}
                                    </div>
                                )}
                            </div>

                            {/* Type badge */}
                            <span className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm ${config.color}`}>
                                <TypeIcon className="h-2.5 w-2.5" />
                                {config.label}
                            </span>

                            {/* External link */}
                            <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                                title="Abrir no Instagram"
                            >
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>

                        {/* Compact metrics row */}
                        <div className="flex items-center justify-around py-2 border-b border-border text-[11px]">
                            <span className="flex items-center gap-1 text-pink-400 font-semibold">
                                <Heart className="h-3 w-3" /> {formatNumber(post.likesCount)}
                            </span>
                            <span className="flex items-center gap-1 text-blue-400 font-semibold">
                                <MessageCircle className="h-3 w-3" /> {formatNumber(post.commentsCount)}
                            </span>
                            {hasViews ? (
                                <span className="flex items-center gap-1 text-purple-400 font-semibold">
                                    <Eye className="h-3 w-3" /> {formatNumber(post.videoViewCount!)}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </div>

                        {/* Caption & meta */}
                        <div className="px-2.5 py-2 space-y-1.5">
                            <p className="text-xs leading-relaxed line-clamp-2 text-foreground/90">
                                {post.caption || '(sem legenda)'}
                            </p>

                            {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex items-start gap-1">
                                    <Hash className="h-2.5 w-2.5 mt-0.5 text-muted-foreground shrink-0" />
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                                        {post.hashtags.slice(0, 4).join(' ')}
                                        {post.hashtags.length > 4 && ` +${post.hashtags.length - 4}`}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {post.timestamp
                                        ? format(parseISO(post.timestamp), 'dd MMM yy', { locale: ptBR })
                                        : '—'}
                                </span>
                                {engagement != null && (
                                    <span className="text-green-400 font-medium">
                                        {engagement}% eng.
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
