'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { InstagramPostMetrics } from '@/types/analytics';

interface TopEngagersProps {
    posts: InstagramPostMetrics[];
}

interface EngagerStats {
    username: string;
    totalComments: number;
    totalLikes: number;
    posts: number; // unique posts they commented on
    sampleComments: string[];
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function TopEngagers({ posts }: TopEngagersProps) {
    const engagers = useMemo(() => {
        const map = new Map<string, EngagerStats>();
        const ownerUsername = posts[0]?.ownerUsername?.toLowerCase() ?? '';

        for (const post of posts) {
            if (!post.latestComments) continue;
            const seenInPost = new Set<string>();

            for (const comment of post.latestComments) {
                const username = (comment.ownerUsername ?? '').toLowerCase().trim();
                if (!username || username === ownerUsername) continue;

                const existing = map.get(username) ?? {
                    username: comment.ownerUsername,
                    totalComments: 0,
                    totalLikes: 0,
                    posts: 0,
                    sampleComments: [],
                };

                existing.totalComments++;
                existing.totalLikes += comment.likesCount ?? 0;
                if (!seenInPost.has(username)) {
                    existing.posts++;
                    seenInPost.add(username);
                }
                if (existing.sampleComments.length < 3 && comment.text) {
                    existing.sampleComments.push(comment.text.slice(0, 80));
                }

                map.set(username, existing);
            }
        }

        return Array.from(map.values())
            .sort((a, b) => b.totalComments - a.totalComments)
            .slice(0, 10);
    }, [posts]);

    const totalComments = posts.reduce((sum, p) => sum + (p.latestComments?.length ?? 0), 0);

    if (totalComments === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
                <span className="mx-auto text-muted-foreground/40 font-mono text-2xl mb-2">◐</span>
                <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum dado de comentários disponível.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    Os comentários são carregados quando disponíveis no scraper.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-blue-400 font-mono text-xs mr-1">◐</span>
                    <span className="font-semibold">{totalComments}</span>
                    <span className="text-muted-foreground text-xs">comentários analisados</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-purple-400 font-mono text-xs mr-1">◎</span>
                    <span className="font-semibold">{engagers.length}</span>
                    <span className="text-muted-foreground text-xs">comentaristas únicos</span>
                </div>
            </div>

            {/* Ranking */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                    <span className="text-amber-400 font-mono text-xs mr-1">◆</span>
                    <h4 className="text-sm font-semibold">Top Engajadores</h4>
                </div>
                <div className="divide-y divide-border">
                    {engagers.map((engager, i) => (
                        <motion.div
                            key={engager.username}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
                        >
                            {/* Rank */}
                            <span className="w-6 text-center text-sm">
                                {i < 3 ? MEDAL[i] : <span className="text-muted-foreground text-xs">{i + 1}</span>}
                            </span>

                            {/* Avatar placeholder */}
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                    i === 1 ? 'bg-slate-400/20 text-slate-400' :
                                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-muted text-muted-foreground'
                                }`}>
                                {engager.username.slice(0, 2).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                        @{engager.username}
                                    </span>
                                </div>
                                {engager.sampleComments.length > 0 && (
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                        &quot;{engager.sampleComments[0]}&quot;
                                    </p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3 text-xs shrink-0">
                                <div className="text-center">
                                    <p className="font-semibold text-blue-400">{engager.totalComments}</p>
                                    <p className="text-[9px] text-muted-foreground">coment.</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-purple-400">{engager.posts}</p>
                                    <p className="text-[9px] text-muted-foreground">posts</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Note about data */}
            <p className="text-[10px] text-muted-foreground/60 text-center">
                ⓘ Baseado nos comentários mais recentes de cada post capturados pelo scraper
            </p>
        </div>
    );
}
