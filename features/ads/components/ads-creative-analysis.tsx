'use client';

/* eslint-disable @next/next/no-img-element */
import type { AdCreative, CreativeClassification } from '@/types/ads';

// ─── Glyphs (ZERO Lucide) ────────────────────────────────────────────────────

const G = {
    CLOSE: '✕',
    SPARK: '◆',
    ALERT: '▲',
    CHECK: '◉',
    WARN: '◈',
    MEDIA: '◎',
    TREND: '↗',
    DECAY: '↘',
} as const;

// ─── Constants ───────────────────────────────────────────────────────────────

const FB_BENCHMARK_CTR = 1.25; // F&B industry benchmark CTR %
const FREQUENCY_SATURATION_THRESHOLD = 3;

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    creative: AdCreative;
    currency?: string;
    onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function classificationConfig(c: CreativeClassification) {
    const map: Record<CreativeClassification, { label: string; color: string; bg: string; border: string; glyph: string }> = {
        TOP_PERFORMER: { label: 'TOP PERFORMER', color: '#A3E635', bg: 'rgba(163,230,53,0.08)', border: 'rgba(163,230,53,0.3)', glyph: G.TREND },
        'MÉDIO': { label: 'DESEMPENHO MÉDIO', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', glyph: G.WARN },
        UNDERPERFORM: { label: 'UNDERPERFORMER', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', glyph: G.DECAY },
    };
    return map[c];
}

function estimateCreativeHalfLife(
    frequency: number,
    ctr: number,
    benchmarkCtr: number,
): { status: 'FRESCO' | 'ENVELHECENDO' | 'SATURADO'; color: string; message: string } {
    if (frequency > FREQUENCY_SATURATION_THRESHOLD && ctr < benchmarkCtr * 0.8) {
        return {
            status: 'SATURADO',
            color: '#EF4444',
            message: `Frequência ${frequency.toFixed(1)}× com CTR abaixo do benchmark. Criativo provavelmente esgotado.`,
        };
    }
    if (frequency > 2 && ctr < benchmarkCtr) {
        return {
            status: 'ENVELHECENDO',
            color: '#FBBF24',
            message: `Frequência elevada (${frequency.toFixed(1)}×) com CTR em declínio. Monitorar fadiga.`,
        };
    }
    return {
        status: 'FRESCO',
        color: '#A3E635',
        message: `Frequência saudável (${frequency.toFixed(1)}×). Criativo com vida útil preservada.`,
    };
}

// ─── Metric Row ──────────────────────────────────────────────────────────────

function MetricRow({
    label,
    value,
    benchmark,
    alert,
}: {
    label: string;
    value: string;
    benchmark?: string;
    alert?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <span className="text-[9px] text-[#4A4A4A] uppercase tracking-widest font-bold">{label}</span>
            <div className="flex items-center gap-3">
                {benchmark && (
                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-widest">
                        bench: {benchmark}
                    </span>
                )}
                <span className={`text-[11px] font-black ${alert ? 'text-[#EF4444]' : 'text-[#F5F5F5]'}`}>
                    {value}
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsCreativeAnalysis({ creative, currency = 'BRL', onClose }: Props) {
    const { metrics, classification } = creative;
    const classConfig = classificationConfig(classification);
    const imageUrl = creative.creative.imageUrl || creative.creative.thumbnailUrl;

    const ctrVsBench = metrics.ctr / FB_BENCHMARK_CTR;
    const isCtrAboveBench = ctrVsBench >= 1;

    const halfLife = estimateCreativeHalfLife(metrics.frequency, metrics.ctr, FB_BENCHMARK_CTR);
    const isFrequencyAlert = metrics.frequency > FREQUENCY_SATURATION_THRESHOLD;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md h-full overflow-y-auto bg-[#0A0A0A] border-l border-white/10 shadow-2xl font-mono animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* ─── Header ────────────────────────────────────────── */}
                <div className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-white/8 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[#A3E635] text-sm">{G.SPARK}</span>
                        <span className="text-[11px] font-black text-[#F5F5F5] uppercase tracking-[0.1em]">
                            Creative_Analysis
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded border border-white/10 text-[#4A4A4A] hover:text-[#F5F5F5] hover:border-white/20 transition-all text-sm"
                    >
                        {G.CLOSE}
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* ─── Preview ────────────────────────────────────── */}
                    <div className="space-y-4">
                        <div className="aspect-[4/3] bg-white/[0.02] rounded-lg overflow-hidden border border-white/8">
                            {imageUrl ? (
                                <img
                                    src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                                    alt={creative.creative.title || creative.adName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#2A2A2A]">
                                    <span className="text-5xl">{G.MEDIA}</span>
                                    <span className="text-[8px] uppercase tracking-[0.3em] font-bold">SEM_PREVIEW</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-tight leading-tight" title={creative.adName}>
                            {creative.adName}
                        </p>
                        {creative.creative.title && (
                            <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest">{creative.creative.title}</p>
                        )}
                    </div>

                    {/* ─── Classification Badge ──────────────────────── */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                        style={{
                            backgroundColor: classConfig.bg,
                            borderColor: classConfig.border,
                        }}
                    >
                        <span className="text-lg" style={{ color: classConfig.color }}>{classConfig.glyph}</span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: classConfig.color }}>
                                {classConfig.label}
                            </p>
                            <p className="text-[8px] text-[#4A4A4A] uppercase tracking-widest mt-0.5">
                                CTR {ctrVsBench.toFixed(1)}× do benchmark F&B
                            </p>
                        </div>
                    </div>

                    {/* ─── Performance Metrics ───────────────────────── */}
                    <div className="space-y-1">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold mb-3">Performance_Metrics</p>

                        <MetricRow
                            label="CTR"
                            value={`${metrics.ctr.toFixed(2)}%`}
                            benchmark={`${FB_BENCHMARK_CTR}%`}
                            alert={!isCtrAboveBench}
                        />
                        <MetricRow
                            label="CPC"
                            value={formatCurrency(metrics.cpc, currency)}
                        />
                        <MetricRow
                            label="Frequência"
                            value={metrics.frequency.toFixed(2)}
                            alert={isFrequencyAlert}
                        />
                        {metrics.roas !== null && (
                            <MetricRow
                                label="ROAS"
                                value={`${metrics.roas.toFixed(2)}×`}
                            />
                        )}
                        <MetricRow
                            label="Spend Total"
                            value={formatCurrency(metrics.spend, currency)}
                        />
                        <MetricRow
                            label="Impressões"
                            value={formatCompact(metrics.impressions)}
                        />
                        <MetricRow
                            label="Cliques"
                            value={formatCompact(metrics.clicks)}
                        />
                        {metrics.conversions > 0 && (
                            <MetricRow
                                label="Conversões"
                                value={metrics.conversions.toString()}
                            />
                        )}
                    </div>

                    {/* ─── Frequency Alert ────────────────────────────── */}
                    {isFrequencyAlert && (
                        <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20">
                            <span className="text-[#EF4444] text-sm mt-0.5">{G.ALERT}</span>
                            <div>
                                <p className="text-[9px] font-black text-[#EF4444] uppercase tracking-widest">Alerta de Saturação</p>
                                <p className="text-[8px] text-[#4A4A4A] uppercase tracking-wide mt-1">
                                    Frequência &gt;{FREQUENCY_SATURATION_THRESHOLD}× indica que o público-alvo já viu este criativo muitas vezes.
                                    Considere rotação de criativos.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── Half-Life Estimate ─────────────────────────── */}
                    <div className="space-y-3">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">Estimativa_Vida_Útil</p>
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                            style={{
                                borderColor: `${halfLife.color}30`,
                                backgroundColor: `${halfLife.color}08`,
                            }}
                        >
                            <span className="text-lg" style={{ color: halfLife.color }}>
                                {halfLife.status === 'FRESCO' ? G.CHECK : halfLife.status === 'ENVELHECENDO' ? G.WARN : G.ALERT}
                            </span>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: halfLife.color }}>
                                    {halfLife.status}
                                </p>
                                <p className="text-[8px] text-[#4A4A4A] uppercase tracking-wide mt-0.5 leading-relaxed">
                                    {halfLife.message}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ─── CTR vs Benchmark Bar ──────────────────────── */}
                    <div className="space-y-3">
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">CTR vs Benchmark F&B</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
                                <span className="text-[#4A4A4A]">0%</span>
                                <span className="text-[#4A4A4A]">{FB_BENCHMARK_CTR}%</span>
                                <span className="text-[#4A4A4A]">{(FB_BENCHMARK_CTR * 2).toFixed(1)}%+</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                                {/* Benchmark marker */}
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-[#4A4A4A]"
                                    style={{ left: '50%' }}
                                />
                                {/* CTR bar */}
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(ctrVsBench * 50, 100)}%`,
                                        backgroundColor: isCtrAboveBench ? '#A3E635' : metrics.ctr >= FB_BENCHMARK_CTR * 0.8 ? '#FBBF24' : '#EF4444',
                                    }}
                                />
                            </div>
                            <p className="text-[8px] text-[#4A4A4A] text-center uppercase tracking-widest">
                                {isCtrAboveBench
                                    ? `${((ctrVsBench - 1) * 100).toFixed(0)}% acima do benchmark`
                                    : `${((1 - ctrVsBench) * 100).toFixed(0)}% abaixo do benchmark`}
                            </p>
                        </div>
                    </div>

                    {/* ─── Body text preview ──────────────────────────── */}
                    {creative.creative.body && (
                        <div className="space-y-2">
                            <p className="text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">Copy_Preview</p>
                            <div className="p-3 rounded border border-white/5 bg-white/[0.02]">
                                <p className="text-[10px] text-[#8A8A8A] leading-relaxed whitespace-pre-wrap">
                                    {creative.creative.body}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── Footer ────────────────────────────────────── */}
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center gap-4 text-[7px] text-[#3A3A3A] uppercase tracking-[0.3em]">
                            <span>BENCH: F&B {FB_BENCHMARK_CTR}% CTR</span>
                            <span>FREQ_LIMIT: {FREQUENCY_SATURATION_THRESHOLD}×</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
