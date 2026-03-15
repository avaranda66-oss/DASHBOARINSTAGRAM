'use client';

import type { AdCampaign, AdInsight } from '@/types/ads';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetentionPoint {
    x: number; // 0–100 (% of video progress)
    y: number; // 0–100 (% of viewers retained)
}

interface CurveData {
    points: RetentionPoint[];
    isFallback: boolean;
    dropoffIndex: number; // index of the biggest consecutive drop
    campaignName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCurveData(insights: AdInsight, campaignName: string): CurveData | null {
    // Prefer video_play_curve_actions (granular, 100 points)
    if (insights.video_play_curve_actions && insights.video_play_curve_actions.length > 1) {
        const raw = insights.video_play_curve_actions.map(s => parseFloat(s.value || '0'));
        const maxVal = raw[0] > 0 ? raw[0] : Math.max(...raw);
        if (maxVal === 0) return null;

        const points: RetentionPoint[] = raw.map((v, i) => ({
            x: (i / (raw.length - 1)) * 100,
            y: (v / maxVal) * 100,
        }));

        const dropoffIndex = findBiggestDrop(points);
        return { points, isFallback: false, dropoffIndex, campaignName };
    }

    // Fallback: discrete p25/p50/p75/p95/p100
    const p25  = extractStat(insights.video_p25_watched_actions);
    const p50  = extractStat(insights.video_p50_watched_actions);
    const p75  = extractStat(insights.video_p75_watched_actions);
    const p95  = extractStat(insights.video_p95_watched_actions);
    const p100 = extractStat(insights.video_p100_watched_actions);

    if (p25 === 0 && p50 === 0) return null;

    const base = p25; // p25 is the first discrete point → normalise to 100%
    if (base === 0) return null;

    const points: RetentionPoint[] = [
        { x: 0,   y: 100 },
        { x: 25,  y: (p25  / base) * 100 },
        { x: 50,  y: p50  > 0 ? (p50  / base) * 100 : 0 },
        { x: 75,  y: p75  > 0 ? (p75  / base) * 100 : 0 },
        { x: 95,  y: p95  > 0 ? (p95  / base) * 100 : 0 },
        { x: 100, y: p100 > 0 ? (p100 / base) * 100 : 0 },
    ].filter(p => p.y >= 0);

    const dropoffIndex = findBiggestDrop(points);
    return { points, isFallback: true, dropoffIndex, campaignName };
}

function extractStat(stats: { action_type: string; value: string }[] | undefined): number {
    if (!stats || stats.length === 0) return 0;
    const item = stats.find(s => s.action_type === 'video_view') ?? stats[0];
    return parseFloat(item?.value || '0');
}

function findBiggestDrop(points: RetentionPoint[]): number {
    let maxDrop = 0;
    let idx = 0;
    for (let i = 1; i < points.length; i++) {
        const drop = points[i - 1].y - points[i].y;
        if (drop > maxDrop) { maxDrop = drop; idx = i; }
    }
    return idx;
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────

const W = 320;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 24, left: 28 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function toSvgX(x: number) { return PAD.left + (x / 100) * CW; }
function toSvgY(y: number) { return PAD.top + (1 - y / 100) * CH; }

function buildPath(points: RetentionPoint[]): string {
    if (points.length === 0) return '';
    return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`)
        .join(' ');
}

function buildAreaPath(points: RetentionPoint[]): string {
    if (points.length === 0) return '';
    const linePath = buildPath(points);
    const lastX = toSvgX(points[points.length - 1].x).toFixed(1);
    const baseY = (PAD.top + CH).toFixed(1);
    const firstX = toSvgX(points[0].x).toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
}

interface ChartProps {
    data: CurveData;
}

function RetentionChart({ data }: ChartProps) {
    const { points, isFallback, dropoffIndex } = data;
    const dropPoint = points[dropoffIndex];
    const drop = dropoffIndex > 0 ? points[dropoffIndex - 1].y - dropPoint.y : 0;

    const linePath  = buildPath(points);
    const areaPath  = buildAreaPath(points);
    const medianY   = toSvgY(50);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            style={{ display: 'block', overflow: 'visible' }}
            aria-label="Video retention curve"
        >
            <defs>
                <linearGradient id="rc-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#A3E635" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#A3E635" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Grid lines (light) */}
            {[25, 50, 75].map(pct => (
                <line
                    key={pct}
                    x1={PAD.left}
                    x2={PAD.left + CW}
                    y1={toSvgY(pct)}
                    y2={toSvgY(pct)}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                />
            ))}

            {/* 50% median line (dashed) */}
            <line
                x1={PAD.left}
                x2={PAD.left + CW}
                y1={medianY}
                y2={medianY}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
                strokeDasharray="3 3"
            />
            <text
                x={PAD.left + CW + 3}
                y={medianY + 3}
                fill="rgba(255,255,255,0.2)"
                fontSize="7"
                fontFamily="monospace"
            >
                50%
            </text>

            {/* Area fill */}
            <path d={areaPath} fill="url(#rc-area-fill)" />

            {/* Retention line */}
            <path
                d={linePath}
                fill="none"
                stroke="#A3E635"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {/* Drop-off marker */}
            {drop > 5 && dropPoint && (
                <g>
                    <circle
                        cx={toSvgX(dropPoint.x)}
                        cy={toSvgY(dropPoint.y)}
                        r="3.5"
                        fill="#EF4444"
                        stroke="#0A0A0A"
                        strokeWidth="1"
                    />
                    <text
                        x={toSvgX(dropPoint.x)}
                        y={toSvgY(dropPoint.y) - 7}
                        fill="#EF4444"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                    >
                        ⚠ maior abandono
                    </text>
                </g>
            )}

            {/* X axis labels */}
            {[0, 25, 50, 75, 100].map(pct => (
                <text
                    key={pct}
                    x={toSvgX(pct)}
                    y={PAD.top + CH + 13}
                    fill="rgba(255,255,255,0.25)"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="middle"
                >
                    {pct}%
                </text>
            ))}

            {/* Y axis labels */}
            {[0, 50, 100].map(pct => (
                <text
                    key={pct}
                    x={PAD.left - 4}
                    y={toSvgY(pct) + 3}
                    fill="rgba(255,255,255,0.25)"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="end"
                >
                    {pct}
                </text>
            ))}

            {/* Fallback badge */}
            {isFallback && (
                <g>
                    <rect x={PAD.left + CW - 46} y={PAD.top} width={46} height={13} rx="2" fill="rgba(255,255,255,0.06)" />
                    <text
                        x={PAD.left + CW - 23}
                        y={PAD.top + 9}
                        fill="rgba(255,255,255,0.35)"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                    >
                        FALLBACK
                    </text>
                </g>
            )}
        </svg>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
}

export function AdsRetentionCurve({ campaigns }: Props) {
    const curves: CurveData[] = campaigns
        .map(c => c.insights ? extractCurveData(c.insights, c.name) : null)
        .filter((d): d is CurveData => d !== null);

    if (curves.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2 font-mono">
                <span className="text-[#A3E635] text-[10px]">◈</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    RETENTION_CURVE
                </span>
                <span className="text-[9px] text-[#4A4A4A] ml-1">[{curves.length}_STREAMS]</span>
                <span className="h-px flex-1 bg-white/5 ml-2" />
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {curves.map((data) => (
                    <div
                        key={data.campaignName}
                        className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono hover:border-white/20 transition-all"
                    >
                        {/* Card header */}
                        <div className="px-4 pt-4 pb-2 border-b border-white/5 flex items-start justify-between gap-2">
                            <p
                                className="text-[10px] font-bold text-[#F5F5F5] uppercase tracking-tight truncate"
                                title={data.campaignName}
                            >
                                {data.campaignName}
                            </p>
                            {data.isFallback && (
                                <span className="shrink-0 text-[7px] uppercase tracking-widest text-[#4A4A4A] border border-white/10 rounded px-1.5 py-0.5">
                                    FALLBACK
                                </span>
                            )}
                        </div>

                        {/* SVG chart */}
                        <div className="px-2 py-3" style={{ height: '130px' }}>
                            <RetentionChart data={data} />
                        </div>

                        {/* Footer: drop-off info */}
                        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            {(() => {
                                const dp = data.points[data.dropoffIndex];
                                const prev = data.points[data.dropoffIndex - 1];
                                const drop = prev ? prev.y - dp.y : 0;
                                return drop > 5 ? (
                                    <span className="text-[8px] text-[#EF4444] uppercase tracking-[0.2em]">
                                        ⚠ drop {drop.toFixed(0)}pp @ {dp.x.toFixed(0)}%
                                    </span>
                                ) : (
                                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em]">
                                        curva estável
                                    </span>
                                );
                            })()}
                            <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em]">
                                {data.isFallback ? 'P25→P100' : 'GRANULAR'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
