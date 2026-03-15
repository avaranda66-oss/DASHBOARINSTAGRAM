'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { FeedPost } from './feed-preview-tab';

interface ProfileData {
    username: string;
    name?: string;
    biography?: string;
    picture?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    website?: string;
}

interface HighlightData {
    name: string;
    coverUrl: string;
}

interface Props {
    profile: ProfileData;
    posts: FeedPost[];
    selectedPostIndex?: number | null;
    onSelectPost?: (index: number) => void;
    highlightedIndices?: number[];
    highlightNames?: string[];
    realHighlights?: HighlightData[];
    highlightsScreenshot?: string;
}

function formatCount(n: number | undefined | null): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

function isVideoUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('/video/');
}

function resolveImageUrl(url: string, fallback?: string): string {
    // Se a URL principal é video, tenta fallback (thumbnailUrl)
    if (isVideoUrl(url)) {
        if (fallback && !isVideoUrl(fallback)) return resolveImageUrl(fallback);
        return '';
    }
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (!url.startsWith('http') && !url.startsWith('/api/')) {
        return `/${url.replace(/^\//, '')}`;
    }
    if (url.startsWith('/')) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function FeedPreviewPhone({ profile, posts, selectedPostIndex, onSelectPost, highlightedIndices, highlightNames, realHighlights, highlightsScreenshot }: Props) {
    const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

    const handleImgError = (index: number) => {
        setImgErrors(prev => new Set(prev).add(index));
    };

    const gridPosts = posts.slice(0, 30);

    return (
        <div className="flex flex-col items-center">
            {/* Phone frame — proporção iPhone 14 (375×812) */}
            <div className="relative w-[375px] h-[812px] rounded-[36px] border-[3px] border-zinc-700 bg-black shadow-2xl overflow-hidden flex flex-col">
                {/* Dynamic Island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />

                {/* Status bar */}
                <div className="h-8 bg-black flex items-end justify-between px-6 pb-0.5 shrink-0">
                    <span className="text-[11px] text-white/70 font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-2.5 border border-white/70 rounded-sm relative">
                            <div className="absolute inset-[1px] right-[2px] bg-white/70 rounded-[1px]" />
                        </div>
                    </div>
                </div>

                {/* Instagram content area — flex-1 + min-h-0 para scroll funcionar dentro do flex */}
                <div className="bg-black overflow-y-auto scrollbar-hide flex-1 min-h-0">
                    {/* IG Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
                        <div className="flex items-center gap-1">
                            <span className="text-white text-[15px] font-semibold">{profile.username}</span>
                            <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 10l5 5 5-5z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-4">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M12 4v16m8-8H4" />
                            </svg>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </div>
                    </div>

                    {/* Profile section */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="flex items-center gap-5">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2.5px] shrink-0">
                                <div className="w-full h-full rounded-full bg-black p-[2px]">
                                    {profile.picture ? (
                                        <img
                                            src={resolveImageUrl(profile.picture)}
                                            alt={profile.username}
                                            className="w-full h-full rounded-full object-cover"
                                            onError={(e) => {
                                                const el = e.target as HTMLImageElement;
                                                el.style.display = 'none';
                                                el.parentElement!.classList.add('bg-zinc-800');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">
                                            <span className="text-xl text-zinc-400 font-bold">
                                                {profile.username?.[0]?.toUpperCase() ?? '?'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex-1 flex justify-around">
                                {[
                                    { value: profile.media_count, label: 'posts' },
                                    { value: profile.followers_count, label: 'seguidores' },
                                    { value: profile.follows_count, label: 'seguindo' },
                                ].map((stat) => (
                                    <div key={stat.label} className="text-center">
                                        <span className="text-white text-[15px] font-bold block">
                                            {formatCount(stat.value)}
                                        </span>
                                        <span className="text-zinc-400 text-[11px]">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Name + Bio */}
                        <div className="mt-2">
                            {profile.name && (
                                <p className="text-white text-[13px] font-semibold">{profile.name}</p>
                            )}
                            {profile.biography ? (
                                <p className="text-zinc-300 text-xs leading-[16px] mt-0.5 whitespace-pre-line line-clamp-4">
                                    {profile.biography}
                                </p>
                            ) : (
                                <p className="text-zinc-600 text-xs mt-0.5 italic">Bio não disponível</p>
                            )}
                            {profile.website && (
                                <p className="text-blue-400 text-xs mt-0.5 truncate">{profile.website}</p>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1.5 mt-3">
                            <div className="flex-1 bg-[#0095F6] rounded-lg py-[7px] text-center">
                                <span className="text-white text-xs font-semibold">Seguir</span>
                            </div>
                            <div className="flex-1 bg-zinc-800 rounded-lg py-[7px] text-center">
                                <span className="text-white text-xs font-semibold">Mensagem</span>
                            </div>
                            <div className="bg-zinc-800 rounded-lg px-3 py-[7px] flex items-center">
                                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Highlights — prioriza dados reais (Playwright), screenshot fallback, depois IA/posts */}
                    <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
                        {(() => {
                            // Prioridade 1: Highlights reais extraídos do DOM via Playwright
                            if (realHighlights && realHighlights.length > 0) {
                                return (
                                    <div className="flex gap-3">
                                        {realHighlights.slice(0, 6).map((hl, i) => (
                                            <div key={`rhl-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                                                <div className="w-16 h-16 rounded-full border-2 border-zinc-600 p-[2px] overflow-hidden">
                                                    <img
                                                        src={hl.coverUrl}
                                                        alt={hl.name}
                                                        className="w-full h-full rounded-full object-cover"
                                                        onError={(e) => {
                                                            const el = e.target as HTMLImageElement;
                                                            el.style.display = 'none';
                                                            el.parentElement!.classList.add('bg-zinc-800');
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-zinc-400 text-[10px] max-w-16 truncate">{hl.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }

                            // Prioridade 2: Screenshot da seção de highlights (fallback visual)
                            if (highlightsScreenshot) {
                                return (
                                    <img
                                        src={highlightsScreenshot}
                                        alt="Destaques do Instagram"
                                        className="w-full h-auto rounded"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                );
                            }

                            // Prioridade 3: Nomes da IA + imagens dos posts
                            const imagePosts = posts.filter(p => !p.isScheduled && ((!isVideoUrl(p.displayUrl) && p.displayUrl) || p.thumbnailUrl));
                            const defaultNames = ['Destaque', 'Novidades', 'Promo', 'Mais'];
                            const names = highlightNames && highlightNames.length > 0 ? highlightNames : defaultNames;
                            const count = Math.max(names.length, imagePosts.length > 0 ? Math.min(imagePosts.length, 5) : 0);

                            if (count === 0) {
                                return (
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-16 h-16 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                                            <span className="text-zinc-500 text-xs">+</span>
                                        </div>
                                        <span className="text-zinc-400 text-[10px]">Novo</span>
                                    </div>
                                );
                            }

                            return Array.from({ length: Math.min(count, 5) }).map((_, i) => {
                                const post = imagePosts[i];
                                const imgUrl = post ? resolveImageUrl(post.displayUrl, post.thumbnailUrl) : '';
                                const name = names[i] ?? defaultNames[i % defaultNames.length];
                                return (
                                    <div key={`hl-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-16 h-16 rounded-full border-2 border-zinc-600 p-[2px] overflow-hidden">
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt=""
                                                    className="w-full h-full rounded-full object-cover"
                                                    onError={(e) => {
                                                        const el = e.target as HTMLImageElement;
                                                        el.style.display = 'none';
                                                        el.parentElement!.classList.add('bg-zinc-800');
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <span className="text-zinc-500 text-lg">{name[0]?.toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-zinc-400 text-[10px] max-w-16 truncate">{name}</span>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Tab bar (Grid / Reels / Tagged) */}
                    <div className="flex border-t border-zinc-800">
                        <div className="flex-1 py-2.5 flex justify-center border-b-2 border-white">
                            <span className="font-mono text-sm text-white">⊟</span>
                        </div>
                        <div className="flex-1 py-2.5 flex justify-center">
                            <span className="font-mono text-sm text-zinc-500">▶</span>
                        </div>
                        <div className="flex-1 py-2.5 flex justify-center">
                            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0" />
                            </svg>
                        </div>
                    </div>

                    {/* Feed Grid */}
                    <div className="grid grid-cols-3 gap-[1px] pb-8">
                        {gridPosts.map((post, idx) => {
                            const isSelected = selectedPostIndex === idx;
                            const isHighlighted = highlightedIndices?.includes(idx);
                            const hasError = imgErrors.has(idx);
                            const isScheduled = !!post.isScheduled;
                            // Prioridade: thumbnailUrl (Playwright/grid real) > displayUrl (Meta API)
                            // Para vídeos, o Meta API retorna thumbnail auto-gerado (primeiro frame, pode ser preto)
                            // O Playwright captura a capa real que aparece no grid do Instagram
                            const primaryUrl = post.thumbnailUrl || post.displayUrl;
                            const fallbackUrl = post.thumbnailUrl ? post.displayUrl : undefined;
                            const resolvedUrl = resolveImageUrl(primaryUrl, fallbackUrl);
                            const isVideo = !resolvedUrl && (isVideoUrl(post.displayUrl) || post.type === 'Video');

                            return (
                                <motion.button
                                    key={post.id}
                                    onClick={() => onSelectPost?.(idx)}
                                    className={`relative aspect-square overflow-hidden group ${
                                        isSelected ? 'ring-2 ring-[var(--v2-accent)] z-10' : ''
                                    } ${isHighlighted ? 'ring-2 ring-red-500/70 z-10' : ''}`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isVideo || hasError || !resolvedUrl ? (
                                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                            {isVideo || post.type === 'Video' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-mono text-xl text-zinc-400">▶</span>
                                                    <span className="text-[8px] text-zinc-500">Reel/Vídeo</span>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-sm text-zinc-600">◫</span>
                                            )}
                                        </div>
                                    ) : (
                                        <img
                                            src={resolvedUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={() => handleImgError(idx)}
                                        />
                                    )}

                                    {/* Type overlay */}
                                    {post.type !== 'Image' && (
                                        <div className="absolute top-1.5 right-1.5">
                                            {post.type === 'Video' && <span className="font-mono text-xs text-white drop-shadow-lg">▶</span>}
                                            {post.type === 'Sidecar' && <span className="font-mono text-xs text-white drop-shadow-lg">⊞</span>}
                                        </div>
                                    )}

                                    {/* Scheduled badge */}
                                    {isScheduled && (
                                        <div className="absolute top-1 left-1">
                                            <div className="bg-blue-500/90 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                                                <span className="font-mono text-[8px] text-white">◷</span>
                                                <span className="text-[8px] text-white font-bold">AGENDADO</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pinned badge */}
                                    {post.isPinned && (
                                        <div className="absolute top-1 left-1">
                                            <div className="bg-white/90 rounded px-1 py-0.5 flex items-center gap-0.5">
                                                <span className="font-mono text-[8px] text-black">◆</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Hover overlay with metrics */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        {isScheduled ? (
                                            <span className="text-white text-[11px] font-bold text-center px-2">
                                                {post.title ?? 'Agendado'}
                                            </span>
                                        ) : (
                                            <>
                                                <span className="flex items-center gap-1 text-white text-xs font-bold">
                                                    <span className="font-mono text-[10px]">▲</span>
                                                    {formatCount(post.likesCount)}
                                                </span>
                                                <span className="flex items-center gap-1 text-white text-xs font-bold">
                                                    <span className="font-mono text-[10px]">◐</span>
                                                    {formatCount(post.commentsCount)}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Problematic indicator */}
                                    {isHighlighted && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 py-0.5 text-center">
                                            <span className="text-[9px] text-white font-bold">AJUSTAR</span>
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="h-5 bg-black flex items-center justify-center shrink-0">
                    <div className="w-28 h-1 bg-zinc-600 rounded-full" />
                </div>
            </div>
        </div>
    );
}
