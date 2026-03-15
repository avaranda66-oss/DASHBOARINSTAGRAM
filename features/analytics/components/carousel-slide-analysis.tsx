'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics } from '@/types/analytics';

interface CarouselSlideAnalysisProps {
    posts: InstagramPostMetrics[];
    metaToken?: string | null;
}

interface SlideData {
    id: string;
    media_type: string;
    media_url?: string;
}

export function CarouselSlideAnalysis({ posts, metaToken }: CarouselSlideAnalysisProps) {
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [slides, setSlides] = useState<Record<string, SlideData[]>>({});
    const [loading, setLoading] = useState<string | null>(null);

    const carousels = posts.filter(p => p.type === 'Sidecar');

    if (carousels.length === 0) return null;

    const fetchChildren = async (mediaId: string) => {
        if (slides[mediaId] || !metaToken) return;
        setLoading(mediaId);
        try {
            const res = await fetch('/api/meta-carousel-children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: metaToken, mediaId }),
            });
            const json = await res.json();
            if (json.success && json.data) {
                setSlides(prev => ({ ...prev, [mediaId]: json.data }));
            }
        } catch { /* ignore */ }
        setLoading(null);
    };

    const togglePost = (postId: string) => {
        if (expandedPost === postId) {
            setExpandedPost(null);
        } else {
            setExpandedPost(postId);
            fetchChildren(postId);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm text-violet-400">⊞</span>
                <h3 className="text-sm font-semibold text-zinc-200">Análise de Carrosséis</h3>
                <span className="text-xs text-zinc-500">({carousels.length} posts)</span>
            </div>

            <div className="space-y-2">
                {carousels.slice(0, 10).map(post => (
                    <div key={post.id} className="rounded-xl border border-white/[0.04] bg-zinc-800/40">
                        <button
                            onClick={() => togglePost(post.id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
                        >
                            {post.displayUrl ? (
                                <img src={`/api/image-proxy?url=${encodeURIComponent(post.displayUrl)}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                                    <span className="font-mono text-sm text-zinc-500">⊞</span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-300 truncate">{post.caption?.slice(0, 60) || 'Sem legenda'}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    {post.likesCount.toLocaleString()} likes · {post.commentsCount.toLocaleString()} comments
                                </p>
                            </div>
                            <span className={`font-mono text-xs text-zinc-500 transition-transform ${expandedPost === post.id ? 'rotate-90' : ''}`}>›</span>
                        </button>

                        {expandedPost === post.id && (
                            <div className="px-3 pb-3 border-t border-white/[0.04]">
                                {loading === post.id ? (
                                    <p className="text-xs text-zinc-500 py-2">Carregando slides...</p>
                                ) : slides[post.id] ? (
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                        {slides[post.id].map((slide, idx) => (
                                            <div key={slide.id} className="flex-shrink-0 text-center">
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-700">
                                                    {slide.media_url ? (
                                                        <img src={`/api/image-proxy?url=${encodeURIComponent(slide.media_url)}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            {slide.media_type === 'VIDEO' ? (
                                                                <span className="font-mono text-xs text-zinc-500">▶</span>
                                                            ) : (
                                                                <span className="font-mono text-xs text-zinc-500">◫</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <span className="absolute top-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
                                                        #{idx + 1}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-zinc-500 mt-1">{slide.media_type === 'VIDEO' ? 'Vídeo' : 'Imagem'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : !metaToken ? (
                                    <p className="text-xs text-zinc-500 py-2">Conecte a Meta API para ver os slides</p>
                                ) : (
                                    <p className="text-xs text-zinc-500 py-2">Sem dados de slides disponíveis</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
