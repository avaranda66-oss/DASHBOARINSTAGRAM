'use client';

// =============================================================================
// ads-insights-feed.tsx — Feed de Alertas Automáticos via InsightEngine
//
// Story: US-42 — Conectar insight-engine.ts à UI de intelligence
// Arquitetura: puro client-side, zero fetch extra — computed de dailyInsights
//
// Métricas monitoradas: CTR, ROAS, CPC, Spend, Conversions
// Métodos: MAD z-score (ANOMALY) + Holt-Winters PI breach (FORECAST_MISS)
// Config: CONFIG_CONSERVATIVE (z=2.6, cooldown 24h)
// =============================================================================

import { useMemo } from 'react';
import {
    InsightEngine,
    CONFIG_CONSERVATIVE,
    kpiPointFromMAD,
    kpiPointFromForecast,
    kpiPointFromSTLCUSUM,
} from '@/lib/utils/insight-engine';
import type { Insight, InsightSeverity, ActionableInsight } from '@/lib/utils/insight-engine';
import type { DailyAdInsight } from '@/types/ads';
import { cn } from '@/design-system/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    daily: DailyAdInsight[];
    /** Número máximo de insights a exibir (default 8) */
    maxInsights?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_POINTS = 4;
const DEFAULT_MAX = 8;

/** Métricas a monitorar e seus rótulos */
const KPI_MAP: { id: keyof DailyAdInsight; label: string; fmt: (v: number) => string }[] = [
    { id: 'ctr',         label: 'CTR',          fmt: v => `${(v * 100).toFixed(2)}%` },
    { id: 'roas',        label: 'ROAS',         fmt: v => `${v.toFixed(2)}×` },
    { id: 'cpc',         label: 'CPC',          fmt: v => `R$${v.toFixed(2)}` },
    { id: 'spend',       label: 'Gasto',        fmt: v => `R$${v.toFixed(0)}` },
    { id: 'conversions', label: 'Conversões',   fmt: v => `${Math.round(v)}` },
];

/** Cores por severidade */
const SEVERITY_COLOR: Record<InsightSeverity, string> = {
    CRITICAL: '#EF4444',
    WARN:     '#FBBF24',
    INFO:     '#A3E635',
};

const SEVERITY_BG: Record<InsightSeverity, string> = {
    CRITICAL: 'bg-[#EF4444]/10 border-[#EF4444]/20',
    WARN:     'bg-[#FBBF24]/10 border-[#FBBF24]/20',
    INFO:     'bg-[#A3E635]/10 border-[#A3E635]/20',
};

const SEVERITY_TAG: Record<InsightSeverity, string> = {
    CRITICAL: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    WARN:     'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
    INFO:     'bg-[#A3E635]/15 text-[#A3E635] border-[#A3E635]/30',
};

const TYPE_ICON: Record<string, string> = {
    ANOMALY:            '▲',
    FORECAST_MISS:      '◈',
    AB_WINNER_DETECTED: '◬',
    CREATIVE_FATIGUE:   '◎',
};

const URGENCY_COLOR: Record<ActionableInsight['urgency'], string> = {
    critical:    '#EF4444',
    warning:     '#FBBF24',
    opportunity: '#A3E635',
    info:        'rgba(255,255,255,0.3)',
};

const URGENCY_BG: Record<ActionableInsight['urgency'], string> = {
    critical:    'bg-[#EF4444]/10 border-[#EF4444]/20',
    warning:     'bg-[#FBBF24]/10 border-[#FBBF24]/20',
    opportunity: 'bg-[#A3E635]/10 border-[#A3E635]/20',
    info:        'bg-white/3 border-white/5',
};

const URGENCY_TAG: Record<ActionableInsight['urgency'], string> = {
    critical:    'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    warning:     'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
    opportunity: 'bg-[#A3E635]/15 text-[#A3E635] border-[#A3E635]/30',
    info:        'bg-white/5 text-white/30 border-white/10',
};

function isActionable(insight: Insight): insight is ActionableInsight {
    return 'problem' in insight && 'diagnosis' in insight && 'action' in insight;
}

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

// ─── Hook: compute insights ───────────────────────────────────────────────────

function useInsights(daily: DailyAdInsight[], maxInsights: number): Insight[] {
    return useMemo(() => {
        if (daily.length < MIN_POINTS) return [];

        const engine = new InsightEngine(CONFIG_CONSERVATIVE);

        // Use apenas os últimos 90 pontos para evitar overfitting por janela muito longa
        const window = daily.slice(-90);

        for (const kpi of KPI_MAP) {
            const series = window.map(d => d[kpi.id] as number);

            // 1. MAD anomaly: requer >= 4 pontos
            const madPoint = kpiPointFromMAD(kpi.id, series);
            if (madPoint) {
                engine.processPoint(madPoint, 'ANOMALY');
            }

            // 2. Forecast miss: requer >= 14 pontos (Holt-Winters necessita sazonalidade)
            if (series.length >= 14) {
                const lastValue = series[series.length - 1];
                const history  = series.slice(0, -1); // tudo exceto o último
                const fcPoint  = kpiPointFromForecast(kpi.id, history, lastValue);
                if (fcPoint) {
                    engine.processPoint(fcPoint, 'FORECAST_MISS');
                }
            }

            // 3. STL-CUSUM: detecta mudanças estruturais nos resíduos após remover sazonalidade
            // US-51: elimina falsos positivos de fim de semana que afetam CUSUM raw.
            // Requer >= 14 pontos (2 × period=7) para decomposição robusta.
            if (series.length >= 14) {
                const cusumPoint = kpiPointFromSTLCUSUM(kpi.id, series, 7);
                if (cusumPoint) {
                    engine.processPoint(cusumPoint, 'ANOMALY');
                }
            }
        }

        return engine.getTopN(maxInsights);
    }, [daily, maxInsights]);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InsightRow({ insight }: { insight: Insight }) {
    const actionable = isActionable(insight) ? insight : null;
    const kpiMeta   = KPI_MAP.find(k => k.id === insight.kpiId);
    const typeIcon  = TYPE_ICON[insight.type] ?? '◆';

    // ── Actionable layout ────────────────────────────────────────────────────
    if (actionable) {
        const color = URGENCY_COLOR[actionable.urgency];
        return (
            <div className={cn(
                'flex flex-col gap-3 p-4 rounded-lg border transition-all hover:border-white/15 font-mono',
                URGENCY_BG[actionable.urgency],
            )}>
                {/* Header: icon + kpi label + urgency badge + type */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color }} className="text-[13px] leading-none">{typeIcon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                        {kpiMeta?.label ?? insight.kpiId}
                    </span>
                    <span className={cn(
                        'text-[8px] px-1.5 py-0.5 rounded border uppercase font-black tracking-widest',
                        URGENCY_TAG[actionable.urgency],
                    )}>
                        {actionable.urgency.toUpperCase()}
                    </span>
                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-wider ml-auto">
                        {insight.type.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* Causal pattern badge (US-88) */}
                {actionable.causalPattern && actionable.causalPattern !== 'UNKNOWN' && (actionable.causalConfidence ?? 0) >= 0.70 && (
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-white/20 bg-white/5 text-[#8A8A8A] self-start">
                        ◎ {actionable.causalPattern.replace(/_/g, ' ')} · {((actionable.causalConfidence ?? 0) * 100).toFixed(0)}%
                    </span>
                )}

                {/* Problem — título principal */}
                <p className="text-[11px] font-bold text-[#F5F5F5] leading-relaxed">
                    {actionable.problem}
                </p>

                {/* Diagnosis */}
                <p className="text-[9px] text-[#8A8A8A] leading-relaxed">
                    <span className="text-[#4A4A4A] uppercase tracking-widest mr-1">DIAGNÓSTICO:</span>
                    {actionable.diagnosis}
                </p>

                {/* Action — borda esquerda colorida */}
                <div className="pl-3 border-l-2" style={{ borderColor: color }}>
                    <span className="text-[8px] uppercase tracking-widest font-black mr-1" style={{ color }}>
                        AÇÃO:
                    </span>
                    <span className="text-[9px] text-[#D4D4D4] leading-relaxed">
                        {actionable.action}
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 text-[8px] text-[#4A4A4A] uppercase tracking-widest">
                    <span>Z={insight.zScore.toFixed(2)}</span>
                    <span>SCORE={insight.score.toFixed(3)}</span>
                    <span>PRIORITY={actionable.priorityScore.toFixed(3)}</span>
                    {insight.entityId && <span>ENTITY: {insight.entityId}</span>}
                </div>
            </div>
        );
    }

    // ── Fallback: layout original (backward compat) ───────────────────────────
    const color = SEVERITY_COLOR[insight.severity];
    return (
        <div className={cn(
            'flex items-start gap-4 p-4 rounded-lg border transition-all hover:border-white/15 font-mono',
            SEVERITY_BG[insight.severity],
        )}>
            {/* Icon + Severity */}
            <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
                <span style={{ color }} className="text-[13px] leading-none">{typeIcon}</span>
                <span className={cn(
                    'text-[7px] px-1.5 py-0.5 rounded border uppercase font-black tracking-widest',
                    SEVERITY_TAG[insight.severity],
                )}>
                    {insight.severity}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                        {kpiMeta?.label ?? insight.kpiId}
                    </span>
                    <span className={cn(
                        'text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-widest',
                        insight.direction === 'UP'
                            ? 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20'
                            : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
                    )}>
                        {insight.direction === 'UP' ? '↗ ACIMA' : '↘ ABAIXO'}
                    </span>
                    <span className="text-[8px] text-[#4A4A4A] uppercase tracking-wider">
                        {insight.type.replace(/_/g, ' ')}
                    </span>
                </div>
                <p className="text-[10px] text-[#8A8A8A] leading-relaxed">{insight.message}</p>
                <div className="flex items-center gap-4 text-[8px] text-[#4A4A4A] uppercase tracking-widest">
                    <span>Z={insight.zScore.toFixed(2)}</span>
                    <span>SCORE={insight.score.toFixed(3)}</span>
                    {insight.entityId && <span>ENTITY: {insight.entityId}</span>}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ reason }: { reason: 'data' | 'nominal' }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-40">
            <span className="font-mono text-[#A3E635] text-[13px]">◎</span>
            <p className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.4em] text-center">
                {reason === 'data'
                    ? `Mínimo de ${MIN_POINTS} dias de dados para ativar alertas`
                    : 'ALL_SIGNALS_NOMINAL — Nenhuma anomalia detectada'}
            </p>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsInsightsFeed({ daily, maxInsights = DEFAULT_MAX }: Props) {
    const insights = useInsights(daily, maxInsights);

    const criticalCount = insights.filter(i => i.severity === 'CRITICAL').length;
    const warnCount     = insights.filter(i => i.severity === 'WARN').length;

    if (daily.length < MIN_POINTS) {
        return <EmptyState reason="data" />;
    }

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-[#EF4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                    {wrap('▲')}
                </span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                    Signal_Alerts_Feed
                </h3>
                <span className="h-px flex-1 bg-white/5" />
                {/* Summary badges */}
                <div className="flex items-center gap-2">
                    {criticalCount > 0 && (
                        <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30">
                            {criticalCount} CRITICAL
                        </span>
                    )}
                    {warnCount > 0 && (
                        <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30">
                            {warnCount} WARN
                        </span>
                    )}
                    {insights.length === 0 && (
                        <span className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest bg-[#A3E635]/15 text-[#A3E635] border-[#A3E635]/30">
                            ALL_NOMINAL
                        </span>
                    )}
                </div>
            </div>

            {/* Technical metadata */}
            <div className="flex items-center gap-6 text-[8px] font-mono text-[#3A3A3A] uppercase tracking-[0.3em]">
                <span>ENGINE: INSIGHT_v1.1</span>
                <span>CONFIG: CONSERVATIVE (z≥2.6)</span>
                <span>METHODS: MAD_ZSCORE + HW_PI + STL_CUSUM</span>
                <span>WINDOW: {Math.min(daily.length, 90)}D</span>
            </div>

            {/* Feed */}
            {insights.length === 0 ? (
                <EmptyState reason="nominal" />
            ) : (
                <div className="space-y-2">
                    {insights.map(insight => (
                        <InsightRow key={insight.id} insight={insight} />
                    ))}
                </div>
            )}
        </section>
    );
}
