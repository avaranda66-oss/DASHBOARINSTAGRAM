'use client';

import { useCallback } from 'react';
// Lucide icons removed in favor of ASCII HUD glyphs
import type { InstagramPostMetrics, AnalyticsSummary } from '@/types/analytics';

interface ExportReportProps {
    posts: InstagramPostMetrics[];
    summary: AnalyticsSummary | null;
    accountHandle?: string;
}

export function ExportReport({ posts, summary, accountHandle }: ExportReportProps) {
    const exportCSV = useCallback(() => {
        if (posts.length === 0) return;

        const headers = [
            'ID', 'Tipo', 'Data', 'Likes', 'Comentários', 'Views',
            'Engagement Rate', 'Hashtags', 'Legenda (50 chars)', 'URL',
        ];

        const rows = posts.map(p => [
            p.shortCode,
            p.type,
            p.timestamp ? new Date(p.timestamp).toLocaleDateString('pt-BR') : '',
            p.likesCount,
            p.commentsCount,
            p.videoViewCount ?? 0,
            p.engagementRate ? `${p.engagementRate.toFixed(2)}%` : '',
            (p.hashtags ?? []).join(' '),
            `"${(p.caption ?? '').slice(0, 50).replace(/"/g, '""')}"`,
            p.url,
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${accountHandle || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [posts, accountHandle]);

    const exportJSON = useCallback(() => {
        if (posts.length === 0) return;

        const data = {
            exportDate: new Date().toISOString(),
            account: accountHandle,
            summary,
            postsCount: posts.length,
            posts: posts.map(p => ({
                id: p.shortCode,
                type: p.type,
                timestamp: p.timestamp,
                likes: p.likesCount,
                comments: p.commentsCount,
                views: p.videoViewCount,
                engagementRate: p.engagementRate,
                hashtags: p.hashtags,
                caption: p.caption?.slice(0, 200),
                url: p.url,
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${accountHandle || 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [posts, summary, accountHandle]);

    if (posts.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 rounded-lg border border-white/[0.06] bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
                <span className="font-mono text-[10px]">◎</span>
                CSV
            </button>
            <button
                onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 rounded-lg border border-white/[0.06] bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
                <span className="font-mono text-[10px]">◎</span>
                JSON
            </button>
        </div>
    );
}
