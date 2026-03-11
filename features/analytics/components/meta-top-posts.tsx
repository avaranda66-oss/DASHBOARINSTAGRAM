'use client';

import { useState } from 'react';
import { Eye, Heart, Bookmark, Share2, TrendingDown, ExternalLink, Image, Video, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetaPost {
    id: string;
    url: string;
    caption?: string;
    type: string;
    timestamp: string;
    likesCount: number;
    commentsCount: number;
    displayUrl?: string;
    reach?: number;
    saved?: number;
    shares?: number;
}

interface Props {
    posts: MetaPost[];
}

type MetricKey = 'reach' | 'saved' | 'shares' | 'likesCount';

const TABS: { key: MetricKey; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'reach', label: 'Alcance', icon: Eye, color: 'text-blue-400' },
    { key: 'saved', label: 'Saves', icon: Bookmark, color: 'text-amber-400' },
    { key: 'shares', label: 'Shares', icon: Share2, color: 'text-emerald-400' },
    { key: 'likesCount', label: 'Likes', icon: Heart, color: 'text-pink-400' },
];

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

function TypeIcon({ type }: { type: string }) {
    if (type === 'Video') return <Video className="h-3 w-3 text-purple-400" />;
    if (type === 'Sidecar') return <Layers className="h-3 w-3 text-blue-400" />;
    return <Image className="h-3 w-3 text-emerald-400" />;
}

function PostCard({
    post,
    rank,
    metricKey,
    metricColor,
    metricIcon: MetricIcon,
}: {
    post: MetaPost;
    rank: number;
    metricKey: MetricKey;
    metricColor: string;
    metricIcon: React.ElementType;
}) {
    const value = (post as any)[metricKey] ?? 0;
    return (
        <div className="flex items-start gap-3 rounded-lg v2-glass v2-glass-hover p-3 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--v2-bg-surface)] text-xs font-bold text-muted-foreground">
                {rank}
            </div>
            {post.displayUrl && (
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden bg-muted">
                    <img src={post.displayUrl} alt="" className="h-full w-full object-cover" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <TypeIcon type={post.type} />
                    <span className="text-[10px] text-muted-foreground">
                        {post.timestamp ? format(parseISO(post.timestamp), 'dd/MM/yy', { locale: ptBR }) : '—'}
                    </span>
                </div>
                <p className="text-xs line-clamp-2 text-muted-foreground">
                    {post.caption?.slice(0, 100) || '(sem legenda)'}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-sm font-bold ${metricColor}`}>
                        <MetricIcon className="h-3 w-3 inline mr-0.5" />
                        {fmt(value)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        <Heart className="h-2.5 w-2.5 inline mr-0.5" />{fmt(post.likesCount)}
                        <Eye className="h-2.5 w-2.5 inline ml-2 mr-0.5" />{fmt(post.reach ?? 0)}
                    </span>
                </div>
            </div>
            {post.url && (
                <a href={post.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
        </div>
    );
}

export function MetaTopPosts({ posts }: Props) {
    const [activeTab, setActiveTab] = useState<MetricKey>('reach');
    const [showWorst, setShowWorst] = useState(false);

    const tab = TABS.find((t) => t.key === activeTab)!;

    // Apenas posts que têm dados reais para a métrica ativa
    // (reach = 0 geralmente significa que o post é anterior à conversão para conta Business
    //  e a Meta API não retorna insights históricos nesses casos)
    const postsWithData = posts.filter((p) => ((p as any)[activeTab] ?? 0) > 0);
    const postsWithoutData = posts.filter((p) => ((p as any)[activeTab] ?? 0) === 0);

    const sorted = [...postsWithData].sort((a, b) => {
        const va = (a as any)[activeTab] ?? 0;
        const vb = (b as any)[activeTab] ?? 0;
        return vb - va;
    });

    const top5 = sorted.slice(0, 5);
    // Piores só entre os que têm dados — evita mostrar posts sem insight como "piores"
    const worst3 = sorted.length >= 3 ? [...sorted].reverse().slice(0, 3) : [];

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex v2-glass rounded-xl overflow-hidden w-fit">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === t.key
                            ? 'bg-[var(--v2-accent)]/15 text-[var(--v2-text-primary)]'
                            : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-primary)]'
                            }`}
                    >
                        <t.icon className={`h-3 w-3 ${activeTab === t.key ? t.color : ''}`} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Top 5 */}
            <div className="space-y-2">
                <h4 className="v2-label">
                    Top 5 — Maior {tab.label}
                </h4>
                {top5.map((post, idx) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        rank={idx + 1}
                        metricKey={activeTab}
                        metricColor={tab.color}
                        metricIcon={tab.icon}
                    />
                ))}
            </div>

            {/* Worst 3 */}
            {worst3.length >= 3 && (
                <div>
                    <button
                        onClick={() => setShowWorst((v) => !v)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        {showWorst ? 'Ocultar' : 'Mostrar'} 3 Posts com Menor Desempenho
                        <span className="text-[10px] text-muted-foreground/50">(aprenda o que evitar)</span>
                    </button>
                    {showWorst && (
                        <div className="space-y-2">
                            {worst3.map((post, idx) => (
                                <div key={post.id} className="opacity-70">
                                    <PostCard
                                        post={post}
                                        rank={idx + 1}
                                        metricKey={activeTab}
                                        metricColor="text-red-400"
                                        metricIcon={tab.icon}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Posts sem dados de insight (anteriores à conversão para conta Business) */}
            {postsWithoutData.length > 0 && (
                <div className="rounded-lg border-[var(--v2-warning)]/20 bg-[var(--v2-warning)]/5 border px-3 py-2.5 text-xs text-[var(--v2-warning)]/80">
                    <span className="font-semibold text-[var(--v2-warning)]">⚠ {postsWithoutData.length} post{postsWithoutData.length > 1 ? 's' : ''} sem dados de {tab.label.toLowerCase()}.</span>{' '}
                    Isso ocorre porque a Meta API só armazena insights para posts publicados <em>após</em> a conta ser convertida para Comercial ou Criador. Posts anteriores à conversão não têm histórico disponível.
                </div>
            )}
        </div>
    );
}
