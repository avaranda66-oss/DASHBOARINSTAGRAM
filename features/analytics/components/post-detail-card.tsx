'use client';

import { useState, useRef, useEffect } from 'react';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics } from '@/types/analytics';

function formatNum(n: number): string {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(n);
}

const TYPE_MAP: Record<string, { label: string; glyph: string; color: string }> = {
    Video: { label: 'Reel', glyph: '▶', color: '#8b5cf6' },
    Sidecar: { label: 'Carrossel', glyph: '⊞', color: '#3b82f6' },
    Image: { label: 'Imagem', glyph: '◫', color: '#ec4899' },
};

/** Image with onError fallback to type icon */
export function PostImage({ src, className, post }: { src: string; className: string; post: InstagramPostMetrics }) {
    const [broken, setBroken] = useState(false);
    const typeInfo = TYPE_MAP[post.type] ?? TYPE_MAP.Image;

    if (broken || !src) {
        return (
            <div className={`${className} bg-zinc-800 flex items-center justify-center`}>
                <span className="font-mono text-xl" style={{ color: typeInfo.color, opacity: 0.5 }}>{typeInfo.glyph}</span>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            className={`${className} object-cover`}
            loading="lazy"
            onError={() => setBroken(true)}
        />
    );
}

/** Standalone card showing full post details */
export function PostDetailCard({ post }: { post: InstagramPostMetrics }) {
    const typeInfo = TYPE_MAP[post.type] ?? TYPE_MAP.Image;
    const eng = post.likesCount + post.commentsCount;
    const dateStr = post.timestamp
        ? new Date(post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    return (
        <div className="w-[280px] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden">
            {/* Thumbnail */}
            <div className="relative w-full h-[160px] bg-zinc-800">
                <PostImage src={post.displayUrl} className="w-full h-full" post={post} />
                <span
                    className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono backdrop-blur-sm"
                    style={{ background: typeInfo.color + '30', color: typeInfo.color }}
                >
                    <span className="font-mono text-[10px]">{typeInfo.glyph}</span>
                    {typeInfo.label}
                </span>
                {dateStr && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-zinc-300 backdrop-blur-sm">
                        {dateStr}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
                {/* Caption */}
                <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3">
                    {post.caption || <span className="italic text-zinc-600">Sem legenda</span>}
                </p>

                {/* Metrics row */}
                <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-rose-400">▲</span>
                        <span className="text-xs font-mono text-zinc-300">{formatNum(post.likesCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-sky-400">◐</span>
                        <span className="text-xs font-mono text-zinc-300">{formatNum(post.commentsCount)}</span>
                    </div>
                    {post.videoViewCount != null && post.videoViewCount > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-violet-400">◎</span>
                            <span className="text-xs font-mono text-zinc-300">{formatNum(post.videoViewCount)}</span>
                        </div>
                    )}
                    <span className="text-[10px] font-mono ml-auto text-zinc-500">{formatNum(eng)} eng</span>
                </div>

                {/* Link */}
                <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <span className="font-mono text-[10px]">↳</span>
                    Ver no Instagram
                </a>
            </div>
        </div>
    );
}

/** Wrapper that shows PostDetailCard on hover as a floating tooltip */
export function PostTooltip({
    post,
    children,
}: {
    post: InstagramPostMetrics;
    children: React.ReactNode;
}) {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const triggerRef = useRef<HTMLSpanElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setPosition(spaceBelow < 400 ? 'top' : 'bottom');
        }
        timeoutRef.current = setTimeout(() => setShow(true), 200);
    };

    const handleLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setShow(false), 150);
    };

    return (
        <span
            ref={triggerRef}
            className="relative inline-block cursor-pointer"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {children}
            {show && (
                <div
                    className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2`}
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                >
                    <PostDetailCard post={post} />
                </div>
            )}
        </span>
    );
}

/** Inline mini-card for post reference (compact, no hover needed) */
export function PostMiniCard({ post, rank }: { post: InstagramPostMetrics; rank?: number }) {
    const typeInfo = TYPE_MAP[post.type] ?? TYPE_MAP.Image;
    const dateStr = post.timestamp
        ? new Date(post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : '';

    return (
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors group">
            {rank != null && (
                <span className="text-[10px] font-mono w-4 text-zinc-500">{rank}</span>
            )}
            {/* Thumbnail mini with fallback */}
            <PostImage src={post.displayUrl} className="h-9 w-9 rounded-md shrink-0 border border-white/10" post={post} />
            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-300 truncate leading-tight">
                    {post.caption?.slice(0, 60) || post.shortCode}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                    <span className="text-[9px] text-zinc-600">{dateStr}</span>
                </div>
            </div>
            {/* Metrics */}
            <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-rose-400/60">▲</span>
                    <span className="text-[10px] font-mono text-zinc-400">{formatNum(post.likesCount)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-sky-400/60">◐</span>
                    <span className="text-[10px] font-mono text-zinc-400">{formatNum(post.commentsCount)}</span>
                </div>
            </div>
            {/* Link icon on hover */}
            <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
                <span className="font-mono text-[10px] text-zinc-500 hover:text-blue-400">↳</span>
            </a>
        </div>
    );
}

/** Info tooltip for explaining metrics — used in Intelligence Panel */
export function InfoTooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState<'bottom' | 'top'>('bottom');
    const ref = useRef<HTMLSpanElement>(null);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (timeout.current) clearTimeout(timeout.current); };
    }, []);

    return (
        <span
            ref={ref}
            className="relative inline-flex cursor-help"
            onMouseEnter={() => {
                if (timeout.current) clearTimeout(timeout.current);
                if (ref.current) {
                    const r = ref.current.getBoundingClientRect();
                    setPos(window.innerHeight - r.bottom < 120 ? 'top' : 'bottom');
                }
                timeout.current = setTimeout(() => setShow(true), 150);
            }}
            onMouseLeave={() => {
                if (timeout.current) clearTimeout(timeout.current);
                timeout.current = setTimeout(() => setShow(false), 100);
            }}
        >
            <span className="font-mono text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">◎</span>
            {show && (
                <div
                    className={`absolute z-50 ${pos === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-1/2 -translate-x-1/2 w-[220px] px-3 py-2 rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-xl`}
                >
                    <p className="text-[10px] leading-relaxed text-zinc-300">{text}</p>
                </div>
            )}
        </span>
    );
}
