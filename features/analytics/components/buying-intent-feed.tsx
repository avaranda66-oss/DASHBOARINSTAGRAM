'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics } from '@/types/analytics';
import { detectBuyingIntent } from '@/lib/utils/sentiment';

interface BuyingIntentFeedProps {
    posts: InstagramPostMetrics[];
}

export function BuyingIntentFeed({ posts }: BuyingIntentFeedProps) {
    const intentData = useMemo(() => {
        const allComments: { id: string; text: string; ownerUsername: string; postCaption: string; postShortCode: string }[] = [];

        for (const post of posts) {
            for (const comment of post.latestComments ?? []) {
                if (comment.ownerUsername !== post.ownerUsername) {
                    allComments.push({
                        id: comment.id,
                        text: comment.text,
                        ownerUsername: comment.ownerUsername,
                        postCaption: post.caption?.slice(0, 50) || 'Post',
                        postShortCode: post.shortCode,
                    });
                }
            }
        }

        const result = detectBuyingIntent(allComments);
        return {
            ...result,
            enrichedComments: result.intentComments.map(ic => {
                const original = allComments.find(c => c.id === ic.id);
                return { ...ic, postCaption: original?.postCaption ?? '', postShortCode: original?.postShortCode ?? '' };
            }),
        };
    }, [posts]);

    if (intentData.intentCount === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-emerald-400">◎</span>
                    <h3 className="text-sm font-semibold text-zinc-200">Intenção de Compra</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                        {intentData.intentCount}
                    </span>
                </div>
                <span className="text-xs text-zinc-500">
                    {intentData.intentRate}% dos comentários
                </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {intentData.enrichedComments.slice(0, 20).map((comment, i) => (
                    <div key={comment.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.04] bg-zinc-800/30">
                        <span className="font-mono text-sm mt-0.5 text-emerald-400 flex-shrink-0">◐</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-300">@{comment.ownerUsername}</span>
                                <span className="text-[10px] text-zinc-600">em "{comment.postCaption}..."</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">{comment.text}</p>
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                                {comment.keywords.map(kw => (
                                    <span key={kw} className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">
                                        <span className="font-mono text-[10px]">#</span>
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
