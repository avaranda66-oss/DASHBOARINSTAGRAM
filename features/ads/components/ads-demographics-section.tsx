'use client';

// =============================================================================
// ads-demographics-section.tsx — US-69 (Age/Gender) + US-70 (Placement)
//
// Busca dados de /api/ads-demographics com breakdowns Meta API v25.
// Auto-fetch na montagem. Design: bg-[#0A0A0A], font-mono, #A3E635, ZERO Lucide.
// =============================================================================

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/design-system/utils/cn';
import type { DemographicBreakdown, PlacementBreakdown, AdsDatePreset } from '@/types/ads';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    token: string | null;
    accountId: string | null;
    datePreset?: AdsDatePreset;
    timeRange?: { since: string; until: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGE_ORDER = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const PLATFORM_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    audience_network: 'Audience Network',
    messenger: 'Messenger',
    unknown: 'Outros',
};
// Valores corretos de platform_position retornados pela Meta API v25
const PLACEMENT_LABELS: Record<string, string> = {
    // Facebook
    feed: 'Feed',
    right_hand_column: 'Coluna Direita',
    video_feeds: 'Video Feeds',
    marketplace: 'Marketplace',
    story: 'Stories',
    search: 'Search',
    instream_video: 'In-Stream Video',
    facebook_reels: 'Reels',
    facebook_reels_overlay: 'Reels Overlay',
    profile_feed: 'Profile Feed',
    groups_feed: 'Groups Feed',
    notification: 'Notification',
    // Instagram (field = platform_position, values differ from Facebook)
    stream: 'Feed',          // Instagram Feed usa "stream"
    reels: 'Reels',
    explore: 'Explore',
    explore_home: 'Explore Home',
    ig_search: 'Search',
    profile_reels: 'Profile Reels',
    // Audience Network
    classic: 'Classic',
    rewarded_video: 'Rewarded Video',
    // Messenger
    sponsored_messages: 'Sponsored Messages',
    // Threads
    threads_stream: 'Threads Feed',
    unknown: 'Outros',
};

// ─── Formatadores ─────────────────────────────────────────────────────────────

const fmt = {
    currency: (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    pct: (v: number) => `${v.toFixed(2)}%`,
    roas: (v: number) => v > 0 ? `${v.toFixed(2)}x` : '—',
    num: (v: number) => v.toLocaleString('pt-BR'),
};

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function Bar({ value, max, color = '#A3E635' }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-4 w-40 bg-white/5 rounded" />
            <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-10 bg-white/5 rounded" />
                ))}
            </div>
            <div className="h-4 w-48 bg-white/5 rounded mt-6" />
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 bg-white/5 rounded" />
                ))}
            </div>
        </div>
    );
}

// ─── Age × Gender Heatmap (US-69) ─────────────────────────────────────────────

interface HeatmapProps {
    data: DemographicBreakdown[];
    metric: 'roas' | 'spend' | 'ctr' | 'conversions';
}

function AgeGenderHeatmap({ data, metric }: HeatmapProps) {
    const ages = useMemo(() => {
        const found = [...new Set(data.map(d => d.age))];
        return AGE_ORDER.filter(a => found.includes(a)).concat(found.filter(a => !AGE_ORDER.includes(a)));
    }, [data]);

    const genders = useMemo(() => {
        const order = ['male', 'female', 'unknown'];
        const found = [...new Set(data.map(d => d.gender))];
        return order.filter(g => found.includes(g));
    }, [data]);

    const lookup = useMemo(() => {
        const m = new Map<string, DemographicBreakdown>();
        data.forEach(d => m.set(`${d.age}::${d.gender}`, d));
        return m;
    }, [data]);

    const values = data.map(d => d[metric] as number).filter(v => v > 0);
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    const genderLabel = (g: string) => g === 'male' ? 'Masc' : g === 'female' ? 'Fem' : 'NS';

    function cellColor(val: number): string {
        if (val <= 0) return 'bg-white/[0.03]';
        const pct = val / maxVal;
        if (pct >= 0.8) return 'bg-[#A3E635]/20 border-[#A3E635]/30';
        if (pct >= 0.5) return 'bg-[#A3E635]/10 border-[#A3E635]/10';
        if (pct >= 0.25) return 'bg-white/5 border-white/10';
        return 'bg-white/[0.03] border-white/5';
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                    <tr>
                        <th className="text-left text-[#4A4A4A] pb-2 pr-3 font-normal">FAIXA</th>
                        {genders.map(g => (
                            <th key={g} className="text-center text-[#4A4A4A] pb-2 px-2 font-normal">{genderLabel(g)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ages.map(age => (
                        <tr key={age}>
                            <td className="text-[#4A4A4A] pr-3 py-1 whitespace-nowrap">{age}</td>
                            {genders.map(gender => {
                                const cell = lookup.get(`${age}::${gender}`);
                                const val = cell ? (cell[metric] as number) : 0;
                                return (
                                    <td key={gender} className="px-1 py-0.5">
                                        <div className={cn(
                                            'text-center py-1.5 px-2 rounded border text-[10px] font-mono',
                                            cellColor(val),
                                        )}>
                                            {val > 0 ? (
                                                metric === 'roas' ? fmt.roas(val)
                                                    : metric === 'spend' ? fmt.currency(val)
                                                        : metric === 'ctr' ? fmt.pct(val)
                                                            : fmt.num(val)
                                            ) : '—'}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Golden Segment Badge (US-69) ─────────────────────────────────────────────

function GoldenSegment({ data }: { data: DemographicBreakdown[] }) {
    const best = useMemo(() => {
        const withRoas = data.filter(d => d.roas > 0);
        if (withRoas.length === 0) {
            // Fallback para menor CPC se não há ROAS
            const withCpc = data.filter(d => d.cpc > 0 && d.impressions > 100);
            if (!withCpc.length) return null;
            return withCpc.reduce((a, b) => a.cpc < b.cpc ? a : b);
        }
        return withRoas.reduce((a, b) => a.roas > b.roas ? a : b);
    }, [data]);

    if (!best) return null;

    const genderLabel = best.gender === 'male' ? 'Masculino' : best.gender === 'female' ? 'Feminino' : 'N/S';

    return (
        <div className="flex items-start gap-3 p-3 border border-[#A3E635]/20 bg-[#A3E635]/5 rounded-lg">
            <span className="text-[#A3E635] text-xs font-mono mt-0.5">◆</span>
            <div className="space-y-1 font-mono">
                <div className="text-[10px] text-[#A3E635] font-bold tracking-widest">SEGMENTO DE OURO</div>
                <div className="text-xs text-white">
                    {best.age} · {genderLabel}
                </div>
                <div className="flex gap-4 text-[10px] text-[#4A4A4A]">
                    {best.roas > 0 && <span className="text-[#A3E635]">ROAS {fmt.roas(best.roas)}</span>}
                    <span>CPC {fmt.currency(best.cpc)}</span>
                    <span>CTR {fmt.pct(best.ctr)}</span>
                    <span>{fmt.num(best.impressions)} imp</span>
                </div>
            </div>
        </div>
    );
}

// ─── Placement Table (US-70) ──────────────────────────────────────────────────

function PlacementTable({ data }: { data: PlacementBreakdown[] }) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => b.spend - a.spend),
        [data],
    );

    const maxSpend = sorted[0]?.spend || 1;
    const maxImpressions = Math.max(...sorted.map(p => p.impressions)) || 1;

    const platformColor = (p: string): string => {
        if (p === 'instagram') return '#E1306C';
        if (p === 'facebook') return '#1877F2';
        if (p === 'audience_network') return '#00D4AA';
        if (p === 'messenger') return '#0084FF';
        return '#4A4A4A';
    };

    return (
        <div className="space-y-2">
            {sorted.map((p, i) => {
                const placementLabel = PLACEMENT_LABELS[p.platform_position] ?? p.platform_position;
                const platformLabel = PLATFORM_LABELS[p.publisher_platform] ?? p.publisher_platform;
                const color = platformColor(p.publisher_platform);
                const isLowRoas = p.roas > 0 && p.roas < 1;

                return (
                    <div
                        key={`${p.publisher_platform}-${p.platform_position}-${i}`}
                        className={cn(
                            'p-3 rounded-lg border font-mono',
                            isLowRoas
                                ? 'border-[#EF4444]/20 bg-[#EF4444]/5'
                                : 'border-white/5 bg-white/[0.02]',
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ color, backgroundColor: `${color}20` }}
                                >
                                    {platformLabel.toUpperCase()}
                                </span>
                                <span className="text-[11px] text-white/80">{placementLabel}</span>
                                {isLowRoas && (
                                    <span className="text-[9px] text-[#EF4444] font-bold tracking-widest">▲ BAIXO ROAS</span>
                                )}
                            </div>
                            <span className="text-[11px] text-white font-bold">{fmt.currency(p.spend)}</span>
                        </div>

                        <Bar value={p.spend} max={maxSpend} color={color} />

                        <div className="flex gap-4 mt-2 text-[10px] text-[#4A4A4A]">
                            <span>IMP <span className="text-white/60">{fmt.num(p.impressions)}</span></span>
                            <span>CTR <span className="text-white/60">{fmt.pct(p.ctr)}</span></span>
                            <span>CPC <span className="text-white/60">{fmt.currency(p.cpc)}</span></span>
                            <span>CPM <span className="text-white/60">{fmt.currency(p.cpm)}</span></span>
                            {p.roas > 0 && (
                                <span>
                                    ROAS{' '}
                                    <span className={p.roas >= 1 ? 'text-[#A3E635]' : 'text-[#EF4444]'}>
                                        {fmt.roas(p.roas)}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type DemoMetric = 'roas' | 'spend' | 'ctr' | 'conversions';

const METRIC_LABELS: Record<DemoMetric, string> = {
    roas: 'ROAS',
    spend: 'SPEND',
    ctr: 'CTR',
    conversions: 'CONV',
};

export function AdsDemographicsSection({ token, accountId, datePreset, timeRange }: Props) {
    const [demographics, setDemographics] = useState<DemographicBreakdown[]>([]);
    const [placements, setPlacements] = useState<PlacementBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metric, setMetric] = useState<DemoMetric>('roas');
    const [activeTab, setActiveTab] = useState<'demographics' | 'placement'>('demographics');

    useEffect(() => {
        if (!token || !accountId) return;

        setIsLoading(true);
        setError(null);

        const body: Record<string, unknown> = { token, accountId };
        if (timeRange) body.timeRange = timeRange;
        else body.datePreset = datePreset || 'last_30d';

        fetch('/api/ads-demographics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then(r => r.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'Erro ao carregar demographics');
                setDemographics(data.demographics || []);
                setPlacements(data.placements || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setIsLoading(false));
    }, [token, accountId, datePreset, timeRange]);

    if (!token || !accountId) return null;

    return (
        <section className="space-y-6 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-[#A3E635] text-xs">◎</span>
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                        Inteligência de Audiência
                    </h3>
                </div>
                <div className="flex gap-1">
                    {(['demographics', 'placement'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'text-[9px] px-2 py-1 rounded border font-mono tracking-widest transition-all',
                                activeTab === tab
                                    ? 'border-[#A3E635]/40 bg-[#A3E635]/10 text-[#A3E635]'
                                    : 'border-white/10 text-[#4A4A4A] hover:text-white/60',
                            )}
                        >
                            {tab === 'demographics' ? 'DEMOG' : 'PLACEMENT'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <Skeleton />
            ) : error ? (
                <div className="border border-[#EF4444]/20 bg-[#EF4444]/5 rounded-lg p-4 text-[11px] text-[#EF4444]">
                    ▲ {error}
                </div>
            ) : (
                <>
                    {/* Demographics Tab (US-69) */}
                    {activeTab === 'demographics' && (
                        <div className="space-y-4">
                            {demographics.length === 0 ? (
                                <p className="text-[11px] text-[#4A4A4A]">Sem dados de breakdown por idade/gênero para este período.</p>
                            ) : (
                                <>
                                    {/* Metric selector */}
                                    <div className="flex gap-1">
                                        {(Object.keys(METRIC_LABELS) as DemoMetric[]).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setMetric(m)}
                                                className={cn(
                                                    'text-[9px] px-2 py-1 rounded border font-mono tracking-widest transition-all',
                                                    metric === m
                                                        ? 'border-[#A3E635]/40 bg-[#A3E635]/10 text-[#A3E635]'
                                                        : 'border-white/10 text-[#4A4A4A] hover:text-white/60',
                                                )}
                                            >
                                                {METRIC_LABELS[m]}
                                            </button>
                                        ))}
                                    </div>

                                    <GoldenSegment data={demographics} />
                                    <AgeGenderHeatmap data={demographics} metric={metric} />

                                    <div className="text-[9px] text-[#4A4A4A] mt-2">
                                        Células mais claras = maior {METRIC_LABELS[metric]}. Hover na célula para detalhes completos.
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Placement Tab (US-70) */}
                    {activeTab === 'placement' && (
                        <div className="space-y-4">
                            {placements.length === 0 ? (
                                <p className="text-[11px] text-[#4A4A4A]">Sem dados de breakdown por placement para este período.</p>
                            ) : (
                                <>
                                    <div className="text-[10px] text-[#4A4A4A]">
                                        {placements.length} placements · ordenado por gasto
                                        {placements.some(p => p.roas > 0 && p.roas < 1) && (
                                            <span className="text-[#EF4444] ml-2">
                                                ▲ Placements com baixo ROAS destacados
                                            </span>
                                        )}
                                    </div>
                                    <PlacementTable data={placements} />
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
