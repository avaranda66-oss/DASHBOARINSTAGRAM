'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/design-system/atoms/Button';
import type { Ad } from '@/types/ads';
// [ZERO_LUCIDE_PURGE]
import type { CreativeScore } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

interface Props {
    ads: Ad[];
    currency: string;
    isLoading: boolean;
    error: string | null;
    onFetchCreatives: () => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'spend' | 'impressions' | 'ctr' | 'cpc' | 'name';

const GLYPHS = {
    MEDIA: '◎',
    EYE: '◎',
    CLICK: '◈',
    MONEY: '＄',
    TREND: '↗',
    LINK: '↗',
    SEARCH: '◎',
    SPARK: '◆',
    CLOSE: '✕',
    GRID: '◫',
    LIST: '▤',
    ALERT: '▲',
    LOADING: '◑'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

function formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; classes: string }> = {
        ACTIVE: { label: 'Ativo', classes: 'bg-green-500/10 text-green-500 border-green-500/20' },
        PAUSED: { label: 'Pausado', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        CAMPAIGN_PAUSED: { label: 'Campanha Pausada', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        ADSET_PAUSED: { label: 'Conjunto Pausado', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        ARCHIVED: { label: 'Arquivado', classes: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
        DISAPPROVED: { label: 'Reprovado', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
        PENDING_REVIEW: { label: 'Em Análise', classes: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    };
    const info = map[status] || { label: status, classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    return (
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border", info.classes)}>
            {info.label}
        </span>
    );
}

function getMetric(ad: Ad, key: string): number {
    const i = ad.insights;
    if (!i) return 0;
    const val = (i as unknown as Record<string, string | undefined>)[key];
    return parseFloat(val || '0') || 0;
}

function CreativeCard({ ad, currency, viewMode, score, isAnalyzing, onAnalyze, onShowScore }: {
    ad: Ad; currency: string; viewMode: ViewMode;
    score?: CreativeScore; isAnalyzing?: boolean;
    onAnalyze?: () => void; onShowScore?: (s: CreativeScore) => void;
}) {
    const imageUrl = ad.creative?.image_url || ad.creative?.thumbnail_url;
    const spend = getMetric(ad, 'spend');
    const impressions = getMetric(ad, 'impressions');
    const clicks = getMetric(ad, 'clicks');
    const ctr = getMetric(ad, 'ctr');
    const cpc = getMetric(ad, 'cpc');

    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-white/10 rounded-lg hover:bg-white/[0.03] transition-colors font-mono">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded overflow-hidden bg-white/5 shrink-0 flex items-center justify-center border border-white/5 grayscale">
                    {imageUrl ? (
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                            alt={ad.creative?.title || ad.name}
                            className="w-full h-full object-cover opacity-80"
                        />
                    ) : (
                        <span className="text-xl text-[#4A4A4A]">{wrap(GLYPHS.MEDIA)}</span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#F5F5F5] truncate uppercase tracking-tight">{ad.name}</p>
                    {ad.creative?.title && (
                        <p className="text-[10px] text-[#4A4A4A] truncate uppercase tracking-widest mt-0.5">{ad.creative.title}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                        {statusBadge(ad.effective_status)}
                        {score && (
                            <button onClick={() => onShowScore?.(score)}>
                                <ScoreBadge score={score} />
                            </button>
                        )}
                        {!score && (ad.creative?.image_url || ad.creative?.thumbnail_url) && (
                            <button
                                onClick={() => onAnalyze?.()}
                                disabled={isAnalyzing}
                                className="text-[10px] text-[#A3E635] hover:opacity-100 opacity-60 flex items-center gap-1 disabled:opacity-30"
                                title="Analisar criativo"
                            >
                                {isAnalyzing ? <span className="animate-spin">{wrap(GLYPHS.LOADING)}</span> : wrap(GLYPHS.SPARK)}
                                <span className="text-[8px] font-bold">ANALYZE_AI</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-8 shrink-0 border-l border-white/5 pl-8">
                    <div className="text-right">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">Spend</p>
                        <p className="text-xs font-bold text-[#F5F5F5]">{formatCurrency(spend, currency)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">Impr</p>
                        <p className="text-xs font-bold text-[#F5F5F5]">{formatNumber(impressions)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">Clicks</p>
                        <p className="text-xs font-bold text-[#F5F5F5]">{formatNumber(clicks)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">CTR</p>
                        <p className="text-xs font-bold text-[#A3E635]">{ctr.toFixed(2)}%</p>
                    </div>
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div className="group bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden hover:border-[#A3E635]/40 transition-all font-mono">
            {/* Image */}
            <div className="aspect-square bg-white/5 relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                {imageUrl ? (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                        alt={ad.creative?.title || ad.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#4A4A4A]">
                        <span className="text-3xl">{wrap(GLYPHS.MEDIA)}</span>
                        <span className="text-[8px] uppercase tracking-widest font-bold">No_Signal</span>
                    </div>
                )}

                {/* Status overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {statusBadge(ad.effective_status)}
                    {score && (
                        <button onClick={() => onShowScore?.(score)}>
                            <ScoreBadge score={score} />
                        </button>
                    )}
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                     <div className="flex items-center justify-between">
                        {!score && (ad.creative?.image_url || ad.creative?.thumbnail_url) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyze?.(); }}
                                disabled={isAnalyzing}
                                className="h-8 px-3 rounded border border-[#A3E635]/40 bg-[#A3E635]/10 text-[#A3E635] text-[10px] font-bold flex items-center gap-2 hover:bg-[#A3E635]/20 disabled:opacity-50"
                            >
                                {isAnalyzing ? <span className="animate-spin">{wrap(GLYPHS.LOADING)}</span> : wrap(GLYPHS.SPARK)}
                                EXEC_ANALYSIS
                            </button>
                        )}
                        {ad.creative?.link_url && (
                            <a
                                href={ad.creative.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 flex items-center justify-center rounded border border-white/20 bg-black/40 text-white text-sm hover:border-[#A3E635]/60 hover:text-[#A3E635]"
                                onClick={e => e.stopPropagation()}
                            >
                                {wrap(GLYPHS.LINK)}
                            </a>
                        )}
                     </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-4">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-[#F5F5F5] truncate uppercase tracking-tight" title={ad.name}>{ad.name}</p>
                    {ad.creative?.title && (
                        <p className="text-[10px] text-[#4A4A4A] truncate uppercase tracking-widest leading-none">{ad.creative.title}</p>
                    )}
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    <div className="space-y-0.5">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest block">Cost_Unit</span>
                        <span className="text-[11px] font-bold text-[#F5F5F5]">{formatCurrency(spend, currency)}</span>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest block">Visual_Imp</span>
                        <span className="text-[11px] font-bold text-[#F5F5F5]">{formatNumber(impressions)}</span>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest block">Interaction</span>
                        <span className="text-[11px] font-bold text-[#F5F5F5]">{formatNumber(clicks)}</span>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest block">Yield_Rate</span>
                        <span className="text-[11px] font-bold text-[#A3E635]">{ctr.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreBadge({ score }: { score: CreativeScore }) {
    const color = score.total >= 80 ? 'text-[#A3E635] bg-[#A3E635]/10 border-[#A3E635]/30'
        : score.total >= 60 ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
        : score.total >= 40 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30';
    return (
        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border uppercase tracking-tighter", color)}>
            {wrap(GLYPHS.SPARK)} {score.total}/100
        </span>
    );
}

function ScoreModal({ score, onClose }: { score: CreativeScore; onClose: () => void }) {
    const bars = [
        { label: 'COMPOSITION', value: score.composition, max: 25 },
        { label: 'CONTRAST', value: score.contrast, max: 25 },
        { label: 'TEXT_RATIO', value: score.textRatio, max: 25 },
        { label: 'HIERARCHY', value: score.hierarchy, max: 25 },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono" onClick={onClose}>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-8 w-full max-w-sm space-y-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[#A3E635] text-lg">{wrap(GLYPHS.SPARK)}</span>
                        <h3 className="font-bold uppercase tracking-widest text-[#F5F5F5]">Creative_Audit</h3>
                    </div>
                    <button onClick={onClose} className="text-[#4A4A4A] hover:text-[#F5F5F5]">{wrap(GLYPHS.CLOSE)}</button>
                </div>
                
                <div className="text-center py-4">
                    <span className="text-5xl font-black text-[#F5F5F5] tracking-tighter">{score.total}</span>
                    <span className="text-lg text-[#4A4A4A]">.HUB</span>
                    <p className="text-[10px] mt-3 font-bold text-[#A3E635] uppercase tracking-[0.3em]">{score.label}</p>
                </div>

                <div className="space-y-4">
                    {bars.map(b => (
                        <div key={b.label} className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                                <span className="text-[#4A4A4A]">{b.label}</span>
                                <span className="text-[#F5F5F5]">{b.value}/{b.max}</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#A3E635]" style={{ width: `${(b.value / b.max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {score.suggestions.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-white/5">
                        <p className="text-[9px] font-bold text-[#4A4A4A] uppercase tracking-widest">Protocol_Suggestions:</p>
                        <div className="space-y-2">
                            {score.suggestions.map((s, i) => (
                                <p key={i} className="text-[10px] text-[#8A8A8A] leading-tight uppercase font-bold">• {s}</p>
                            ))}
                        </div>
                    </div>
                )}

                <Button onClick={onClose} variant="outline" className="w-full text-[10px] tracking-widest uppercase">DISMISS_REPORT</Button>
            </div>
        </div>
    );
}

export function CreativesGallery({ ads, currency, isLoading, error, onFetchCreatives }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortBy>('spend');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [scores, setScores] = useState<Record<string, CreativeScore>>({});
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedScore, setSelectedScore] = useState<CreativeScore | null>(null);

    const analyzeCreative = async (ad: Ad) => {
        const imageUrl = ad.creative?.image_url || ad.creative?.thumbnail_url;
        if (!imageUrl) return;
        setAnalyzingId(ad.id);
        try {
            const res = await fetch('/api/ads-creative-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl, adName: ad.name }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success && data.score) {
                const s: CreativeScore = { ...data.score, creativeId: ad.id };
                setScores(prev => ({ ...prev, [ad.id]: s }));
            }
        } catch (e) {
            console.error('[CreativesGallery] analyzeCreative error:', e);
        } finally {
            setAnalyzingId(null);
        }
    };

    const adsWithCreatives = useMemo(() => {
        let filtered = ads.filter(a => a.creative);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.creative?.title?.toLowerCase().includes(q) ||
                a.creative?.body?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => a.effective_status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return getMetric(b, sortBy) - getMetric(a, sortBy);
        });

        return filtered;
    }, [ads, searchQuery, statusFilter, sortBy]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 font-mono">
                <span className="text-3xl text-[#A3E635] animate-spin mb-4">{wrap(GLYPHS.LOADING)}</span>
                <span className="text-[10px] text-[#4A4A4A] uppercase tracking-[0.4em]">Establishing_Meta_Link...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-lg flex flex-col items-center gap-4 text-center font-mono">
                <span className="text-2xl text-red-500">{wrap(GLYPHS.ALERT)}</span>
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Protocol_Interrupted</p>
                    <p className="text-[10px] text-[#4A4A4A] uppercase max-w-xs">{error}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2 text-[10px] tracking-widest uppercase" onClick={onFetchCreatives}>RETRY_HANDSHAKE</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-mono">
            {/* Header controls */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[#A3E635] font-bold">{wrap(GLYPHS.MEDIA)}</span>
                        <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-widest">{adsWithCreatives.length}</span>
                        <span className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em]">Active_Creatives</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#4A4A4A] group-focus-within:text-[#A3E635]">{wrap(GLYPHS.SEARCH)}</span>
                        <input
                            type="text"
                            placeholder="QUERY_CORE..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-4 bg-[#050505] border border-white/10 rounded font-mono text-[10px] text-[#F5F5F5] w-48 focus:border-[#A3E635]/40 outline-none uppercase placeholder:text-[#2A2A2A]"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-9 px-3 bg-[#050505] border border-white/10 rounded font-mono text-[10px] text-[#F5F5F5] focus:border-[#A3E635]/40 outline-none uppercase cursor-pointer"
                    >
                        <option value="all">ALL_STATUS</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAUSED">PAUSED</option>
                    </select>

                    <div className="flex border border-white/10 rounded overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("h-9 w-9 flex items-center justify-center transition-all", viewMode === 'grid' ? "bg-[#A3E635] text-black" : "bg-[#050505] text-[#4A4A4A] hover:text-[#F5F5F5]")}
                        >
                            {wrap(GLYPHS.GRID)}
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("h-9 w-9 flex items-center justify-center transition-all", viewMode === 'list' ? "bg-[#A3E635] text-black" : "bg-[#050505] text-[#4A4A4A] hover:text-[#F5F5F5]")}
                        >
                            {wrap(GLYPHS.LIST)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            {adsWithCreatives.length === 0 ? (
                <div className="py-24 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-4 text-center grayscale opacity-40">
                    <span className="text-4xl">{wrap(GLYPHS.MEDIA)}</span>
                    <p className="text-[10px] text-[#F5F5F5] uppercase tracking-[0.4em]">No_Data_In_Current_Scope</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {adsWithCreatives.map(ad => (
                        <CreativeCard
                            key={ad.id} ad={ad} currency={currency} viewMode="grid"
                            score={scores[ad.id]} isAnalyzing={analyzingId === ad.id}
                            onAnalyze={() => analyzeCreative(ad)}
                            onShowScore={setSelectedScore}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {adsWithCreatives.map(ad => (
                        <CreativeCard
                            key={ad.id} ad={ad} currency={currency} viewMode="list"
                            score={scores[ad.id]} isAnalyzing={analyzingId === ad.id}
                            onAnalyze={() => analyzeCreative(ad)}
                            onShowScore={setSelectedScore}
                        />
                    ))}
                </div>
            )}

            {/* Score Modal */}
            {selectedScore && (
                <ScoreModal score={selectedScore} onClose={() => setSelectedScore(null)} />
            )}
        </div>
    );
}
