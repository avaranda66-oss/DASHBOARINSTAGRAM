'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';
import type { AdCreative } from '@/types/ads';
import { AdsCreativeAnalysis } from './ads-creative-analysis';

// ─── Glyphs (ZERO Lucide) ────────────────────────────────────────────────────

const G = {
    MEDIA: '◎',
    SEARCH: '◈',
    GRID: '◫',
    ALERT: '▲',
    LOADING: '◑',
    SPARK: '◆',
    EYE: '◉',
    EMPTY: '⊘',
} as const;

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    token: string;
    accountId: string;
    campaignId?: string;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function classificationBadge(classification: string) {
    const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
        TOP_PERFORMER: { label: 'TOP', color: '#A3E635', bg: 'rgba(163,230,53,0.08)', border: 'rgba(163,230,53,0.25)' },
        'MÉDIO': { label: 'MED', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
        UNDERPERFORM: { label: 'LOW', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    };
    const info = map[classification] || map.UNDERPERFORM;
    return (
        <span
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] font-black uppercase tracking-widest border"
            style={{ color: info.color, backgroundColor: info.bg, borderColor: info.border }}
        >
            {info.label}
        </span>
    );
}

function statusBadge(status: string) {
    const isActive = status === 'ACTIVE';
    const isPaused = status === 'PAUSED' || status === 'CAMPAIGN_PAUSED' || status === 'ADSET_PAUSED';
    const color = isActive ? '#A3E635' : isPaused ? '#FBBF24' : '#4A4A4A';
    const label = isActive ? 'ATIVO' : isPaused ? 'PAUSADO' : status;
    return (
        <span
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] uppercase tracking-widest border"
            style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`,
            }}
        >
            {label}
        </span>
    );
}

// ─── Creative Card ───────────────────────────────────────────────────────────

function CreativeCard({
    creative,
    currency,
    onAnalyze,
}: {
    creative: AdCreative;
    currency: string;
    onAnalyze: () => void;
}) {
    const imageUrl = creative.creative.imageUrl || creative.creative.thumbnailUrl;
    const { ctr, cpc, spend } = creative.metrics;

    return (
        <div className="group bg-[#0A0A0A] border border-white/8 rounded-lg overflow-hidden hover:border-[#A3E635]/30 transition-all font-mono">
            {/* Thumbnail */}
            <div className="aspect-[4/3] bg-white/[0.02] relative overflow-hidden">
                {imageUrl ? (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                        alt={creative.creative.title || creative.adName}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#2A2A2A]">
                        <span className="text-4xl font-mono">{G.MEDIA}</span>
                        <span className="text-[8px] uppercase tracking-[0.3em] font-bold">SEM_VISUAL</span>
                    </div>
                )}

                {/* Status + Classification overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {statusBadge(creative.effectiveStatus)}
                    {classificationBadge(creative.classification)}
                </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
                <p
                    className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-tight truncate leading-tight"
                    title={creative.adName}
                >
                    {creative.adName}
                </p>

                {/* Metrics inline */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                    <div className="space-y-0.5">
                        <span className="text-[7px] text-[#4A4A4A] uppercase tracking-widest block">CTR</span>
                        <span className="text-[10px] font-black text-[#A3E635]">{ctr.toFixed(2)}%</span>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[7px] text-[#4A4A4A] uppercase tracking-widest block">CPC</span>
                        <span className="text-[10px] font-black text-[#F5F5F5]">{formatCurrency(cpc, currency)}</span>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[7px] text-[#4A4A4A] uppercase tracking-widest block">SPEND</span>
                        <span className="text-[10px] font-black text-[#F5F5F5]">{formatCurrency(spend, currency)}</span>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={onAnalyze}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-white/8 text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] hover:border-[#A3E635]/40 hover:text-[#A3E635] transition-all"
                >
                    <span>{G.EYE}</span>
                    VER_ANÁLISE
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsCreativeLibrary({ token, accountId, campaignId }: Props) {
    const [creatives, setCreatives] = useState<AdCreative[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null);

    const fetchCreatives = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                token,
                accountId,
                ...(campaignId ? { campaignId } : {}),
            });
            const res = await fetch(`/api/ads/creatives?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setCreatives(data.creatives || []);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Erro ao buscar criativos.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [token, accountId, campaignId]);

    useEffect(() => {
        if (token && accountId) {
            fetchCreatives();
        }
    }, [fetchCreatives, token, accountId]);

    const filtered = useMemo(() => {
        let result = creatives;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.adName.toLowerCase().includes(q) ||
                c.creative.title?.toLowerCase().includes(q) ||
                c.creative.body?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'ALL') {
            result = result.filter(c => {
                if (statusFilter === 'ACTIVE') return c.effectiveStatus === 'ACTIVE';
                return c.effectiveStatus === 'PAUSED' || c.effectiveStatus === 'CAMPAIGN_PAUSED' || c.effectiveStatus === 'ADSET_PAUSED';
            });
        }
        return result;
    }, [creatives, searchQuery, statusFilter]);

    // ─── Loading ─────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 font-mono">
                <span className="text-3xl text-[#A3E635] animate-spin mb-4">{G.LOADING}</span>
                <span className="text-[10px] text-[#4A4A4A] uppercase tracking-[0.4em]">Indexing_Creative_Assets...</span>
            </div>
        );
    }

    // ─── Error ───────────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-lg flex flex-col items-center gap-4 text-center font-mono">
                <span className="text-2xl text-red-500">{G.ALERT}</span>
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Creative_Index_Failed</p>
                    <p className="text-[10px] text-[#4A4A4A] uppercase max-w-xs">{error}</p>
                </div>
                <button
                    onClick={fetchCreatives}
                    className="mt-2 px-4 py-2 rounded border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] hover:border-[#A3E635]/40 hover:text-[#A3E635] transition-all font-mono"
                >
                    RETRY_INDEX
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-mono relative">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] text-sm">{G.MEDIA}</span>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-[#F5F5F5]">
                        Creative_Library
                    </h3>
                    <span className="px-2 py-0.5 rounded border border-white/10 text-[9px] font-black text-[#4A4A4A] uppercase tracking-widest">
                        {filtered.length}_CRIATIVOS
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#4A4A4A]">{G.SEARCH}</span>
                        <input
                            type="text"
                            placeholder="BUSCAR..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-3 bg-[#050505] border border-white/10 rounded font-mono text-[10px] text-[#F5F5F5] w-44 focus:border-[#A3E635]/40 outline-none uppercase placeholder:text-[#2A2A2A]"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex border border-white/10 rounded overflow-hidden">
                        {(['ALL', 'ACTIVE', 'PAUSED'] as StatusFilter[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all",
                                    statusFilter === s
                                        ? "bg-[#A3E635] text-black"
                                        : "bg-transparent text-[#4A4A4A] hover:text-[#8A8A8A]"
                                )}
                            >
                                {s === 'ALL' ? 'TODOS' : s === 'ACTIVE' ? 'ATIVOS' : 'PAUSADOS'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Grid ───────────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="py-24 border border-dashed border-white/8 rounded-lg flex flex-col items-center justify-center gap-4 text-center">
                    <span className="text-4xl text-[#2A2A2A]">{G.EMPTY}</span>
                    <p className="text-[10px] text-[#4A4A4A] uppercase tracking-[0.3em]">
                        {creatives.length === 0
                            ? 'Nenhum criativo encontrado nesta conta'
                            : 'Nenhum criativo corresponde aos filtros'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map(c => (
                        <CreativeCard
                            key={c.adId}
                            creative={c}
                            currency="BRL"
                            onAnalyze={() => setSelectedCreative(c)}
                        />
                    ))}
                </div>
            )}

            {/* ─── Analysis Panel (US-68) ─────────────────────────────────── */}
            {selectedCreative && (
                <AdsCreativeAnalysis
                    creative={selectedCreative}
                    currency="BRL"
                    onClose={() => setSelectedCreative(null)}
                />
            )}
        </div>
    );
}
