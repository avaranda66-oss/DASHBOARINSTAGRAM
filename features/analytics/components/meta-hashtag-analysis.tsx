'use client';

import { useMemo } from 'react';
import { Hash, TrendingUp, Flame, Zap } from 'lucide-react';

interface MetaPost {
    caption?: string;
    reach?: number;
    saved?: number;
    likesCount: number;
}

interface Props {
    posts: MetaPost[];
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

function extractHashtags(caption?: string): string[] {
    if (!caption) return [];
    const matches = caption.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
    return matches ? matches.map((t) => t.toLowerCase()) : [];
}

function PerformanceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
    if (level === 'high') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <Flame className="h-2.5 w-2.5" /> Alta
            </span>
        );
    }
    if (level === 'medium') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                <Zap className="h-2.5 w-2.5" /> Média
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            💤 Baixa
        </span>
    );
}

export function MetaHashtagAnalysis({ posts }: Props) {
    const { rows, avgReachOverall, topInsight } = useMemo(() => {
        const map: Record<string, { reach: number[]; saves: number[]; likes: number[] }> = {};

        posts.forEach((p) => {
            const tags = extractHashtags(p.caption);
            tags.forEach((tag) => {
                if (!map[tag]) map[tag] = { reach: [], saves: [], likes: [] };
                map[tag].reach.push(p.reach ?? 0);
                map[tag].saves.push(p.saved ?? 0);
                map[tag].likes.push(p.likesCount);
            });
        });

        const avg = (arr: number[]) =>
            arr.length > 0 ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;

        const overallAvgReach =
            posts.length > 0
                ? Math.round(posts.reduce((s, p) => s + (p.reach ?? 0), 0) / posts.length)
                : 0;

        const sorted = Object.entries(map)
            .filter(([, d]) => d.reach.length >= 1)
            .map(([tag, d]) => ({
                tag,
                posts: d.reach.length,
                avgReach: avg(d.reach),
                avgSaves: avg(d.saves),
                avgLikes: avg(d.likes),
            }))
            .sort((a, b) => b.avgReach - a.avgReach);

        const p75 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.25)]?.avgReach ?? 0 : 0;
        const p25 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.75)]?.avgReach ?? 0 : 0;

        const withLevel = sorted.slice(0, 20).map((row) => ({
            ...row,
            level: row.avgReach >= p75 ? 'high' : row.avgReach >= p25 ? 'medium' : ('low' as 'high' | 'medium' | 'low'),
        }));

        const top = withLevel[0];
        const insight =
            top && overallAvgReach > 0
                ? `${top.tag} tem ${(top.avgReach / overallAvgReach).toFixed(1)}x mais alcance que a média dos seus posts.`
                : null;

        return { rows: withLevel, avgReachOverall: overallAvgReach, topInsight: insight };
    }, [posts]);

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <Hash className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma hashtag encontrada nas legendas.</p>
                <p className="text-xs text-muted-foreground/60">Certifique-se de que os posts têm legendas com #hashtags.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Insight highlight */}
            {topInsight && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-300">{topInsight}</p>
                </div>
            )}

            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{rows.length} hashtags únicas encontradas</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Alcance médio geral: <strong className="text-foreground">{fmt(avgReachOverall)}</strong></span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-7">#</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Hashtag</th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Posts</th>
                                <th className="text-right px-3 py-2 font-medium text-blue-400">Avg Alcance</th>
                                <th className="text-right px-3 py-2 font-medium text-amber-400">Avg Saves</th>
                                <th className="text-right px-3 py-2 font-medium text-pink-400">Avg Likes</th>
                                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Perfomance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr
                                    key={row.tag}
                                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-3 py-2.5 text-muted-foreground/40 font-mono">{idx + 1}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="font-medium text-foreground">{row.tag}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{row.posts}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-blue-400">{fmt(row.avgReach)}</td>
                                    <td className="px-3 py-2.5 text-right text-amber-400">{fmt(row.avgSaves)}</td>
                                    <td className="px-3 py-2.5 text-right text-pink-400">{fmt(row.avgLikes)}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <PerformanceBadge level={row.level} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-right">
                Performance calculada comparando alcance médio de cada hashtag com o restante
            </p>
        </div>
    );
}
