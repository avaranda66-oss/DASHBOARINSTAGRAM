'use client';

import { useState, memo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InstagramPostMetrics } from '@/types/analytics';

interface PostCardsProps {
    posts: InstagramPostMetrics[];
}

const TYPE_CONFIG: Record<string, { glyph: string; label: string; color: string }> = {
    Image: { glyph: '◫', label: 'Post', color: 'bg-[#3E63DD]/20 text-[#60A5FA] border-[#3E63DD]/30' },
    Video: { glyph: '▶', label: 'Reels/Vídeo', color: 'bg-[#F472B6]/20 text-[#F472B6] border-[#F472B6]/30' },
    Sidecar: { glyph: '⊞', label: 'Carrossel', color: 'bg-[#F59E0B]/20 text-[#FB923C] border-[#FB923C]/30' },
};

const PAGE_SIZE = 12;

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
            <div className="flex h-full w-full items-center justify-center bg-[#0A0A0A]">
                <span className="font-mono text-xl text-[#3A3A3A]">◫</span>
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
            decoding="async"
        />
    );
}

// Memoized individual card to prevent re-renders when parent updates
const PostCard = memo(function PostCard({ post }: { post: InstagramPostMetrics }) {
    const config = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.Image;
    const hasViews = post.videoViewCount != null && post.videoViewCount > 0;
    const engagement = hasViews
        ? Math.round(((post.likesCount + post.commentsCount) / post.videoViewCount!) * 100 * 100) / 100
        : null;

    return (
        <div className="group rounded-lg border border-white/[0.08] bg-[#141414] overflow-hidden hover:border-white/[0.12] transition-colors">
            {/* Image — 4:5 aspect ratio (Instagram standard) */}
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0A0A0A]">
                <PostImage src={post.displayUrl} alt={post.caption?.slice(0, 60) || 'Post'} />

                {/* Overlay on hover — CSS only, no JS */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-1 text-[#F5F5F5] text-sm font-semibold font-mono">
                        <span className="text-xs">▲</span>
                        {formatNumber(post.likesCount)}
                    </div>
                    <div className="flex items-center gap-1 text-[#F5F5F5] text-sm font-semibold font-mono">
                        <span className="text-xs">◐</span>
                        {formatNumber(post.commentsCount)}
                    </div>
                    {hasViews && (
                        <div className="flex items-center gap-1 text-[#F5F5F5] text-sm font-semibold font-mono">
                            <span className="text-xs">◎</span>
                            {formatNumber(post.videoViewCount!)}
                        </div>
                    )}
                </div>

                {/* Type badge */}
                <span className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm ${config.color}`}>
                    <span className="font-mono text-[10px]">{config.glyph}</span>
                    {config.label}
                </span>

                {/* External link */}
                <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/40 backdrop-blur-sm text-[#F5F5F5]/80 hover:text-[#F5F5F5] hover:bg-black/60 transition-colors"
                    title="Abrir no Instagram"
                >
                    <span className="font-mono text-sm leading-none">↗</span>
                </a>
            </div>

            {/* Compact metrics row */}
            <div className="flex items-center justify-around py-2 border-b border-white/[0.08] text-[11px]">
                <span className="flex items-center gap-1 text-[#A3E635] font-bold font-mono">
                    <span className="text-[10px]">▲</span> {formatNumber(post.likesCount)}
                </span>
                <span className="flex items-center gap-1 text-[#3E63DD] font-bold font-mono">
                    <span className="text-[10px]">◐</span> {formatNumber(post.commentsCount)}
                </span>
                {hasViews ? (
                    <span className="flex items-center gap-1 text-[#D4D4D4] font-bold font-mono">
                        <span className="text-[10px]">◎</span> {formatNumber(post.videoViewCount!)}
                    </span>
                ) : (
                    <span className="text-[#8A8A8A]">—</span>
                )}
            </div>

            {/* Caption & meta */}
            <div className="px-2.5 py-2 space-y-1.5">
                <p className="text-xs leading-relaxed line-clamp-2 text-[#F5F5F5]">
                    {post.caption || '(sem legenda)'}
                </p>

                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex items-start gap-1">
                        <span className="text-[10px] text-[#4A4A4A] mr-1 font-mono">#</span>
                        <p className="text-[10px] text-[#4A4A4A] line-clamp-1">
                            {post.hashtags.slice(0, 4).join(' ')}
                            {post.hashtags.length > 4 && ` +${post.hashtags.length - 4}`}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#8A8A8A]">
                    <span className="flex items-center gap-1 font-mono">
                        <span className="text-[10px]">◫</span>
                        {post.timestamp
                            ? format(parseISO(post.timestamp), 'dd MMM yy', { locale: ptBR })
                            : '—'}
                    </span>
                    {engagement != null && (
                        <span className="text-[#10B981] font-medium">
                            {engagement}% eng.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

export const PostCards = memo(function PostCards({ posts }: PostCardsProps) {
    const [visible, setVisible] = useState(PAGE_SIZE);
    const shown = posts.slice(0, visible);
    const hasMore = visible < posts.length;

    return (
        <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((post, i) => (
                    <PostCard key={post.id || post.shortCode || i} post={post} />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={() => setVisible(v => v + PAGE_SIZE)}
                        className="font-mono text-[10px] uppercase tracking-[0.15em] px-6 py-2 border border-white/[0.08] text-[#8A8A8A] hover:border-white/[0.12] hover:text-[#D4D4D4] transition-colors rounded"
                    >
                        CARREGAR_MAIS [{shown.length}/{posts.length}]
                    </button>
                </div>
            )}
        </div>
    );
});
