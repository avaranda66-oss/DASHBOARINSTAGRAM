'use client';

import { useEffect, useState } from 'react';
import {
    Brain,
    Heart,
    Users,
    FlaskConical,
    BarChart3,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    Eye,
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    Target,
    Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdsStore } from '@/stores';
import type {
    IntelligenceMetrics,
    CreativeFatigueScore,
    AudienceSaturationIndex,
    ABTestResult,
    BenchmarkComparison,
    BenchmarkEntry,
    AccountHealthScore,
} from '@/types/ads';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    token: string | null;
    accountId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString('pt-BR');
}

function formatCurrency(v: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v);
}

function MiniSparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
    if (!data || data.length < 2) return null;
    const h = 24, w = 80;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    const points = data
        .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
        .join(' ');
    return (
        <svg width={w} height={h} className="inline-block">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ─── Color Maps ──────────────────────────────────────────────────────────────

const healthColors: Record<string, string> = {
    excellent: '#22c55e',
    good: '#3b82f6',
    attention: '#eab308',
    critical: '#ef4444',
};

const healthBg: Record<string, string> = {
    excellent: 'bg-green-500/10 border-green-500/30',
    good: 'bg-blue-500/10 border-blue-500/30',
    attention: 'bg-yellow-500/10 border-yellow-500/30',
    critical: 'bg-red-500/10 border-red-500/30',
};

const healthLabel: Record<string, string> = {
    excellent: 'Excelente',
    good: 'Bom',
    attention: 'Atenção',
    critical: 'Crítico',
};

const fatigueColors: Record<string, string> = {
    healthy: '#22c55e',
    early: '#eab308',
    moderate: '#f97316',
    severe: '#ef4444',
};

const fatigueBg: Record<string, string> = {
    healthy: 'bg-green-500/10 text-green-400 border-green-500/30',
    early: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    moderate: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    severe: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const fatigueLabel: Record<string, string> = {
    healthy: 'Saudável',
    early: 'Início',
    moderate: 'Moderado',
    severe: 'Severo',
};

const saturationColors: Record<string, string> = {
    underexplored: '#3b82f6',
    optimal: '#22c55e',
    saturated: '#ef4444',
};

const saturationBg: Record<string, string> = {
    underexplored: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    optimal: 'bg-green-500/10 text-green-400 border-green-500/30',
    saturated: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const saturationLabel: Record<string, string> = {
    underexplored: 'Subexplorado',
    optimal: 'Ótimo',
    saturated: 'Saturado',
};

const benchmarkStatusColors: Record<string, string> = {
    below: '#ef4444',
    average: '#eab308',
    above: '#22c55e',
};

const benchmarkStatusBg: Record<string, string> = {
    below: 'bg-red-500/10 text-red-400',
    average: 'bg-yellow-500/10 text-yellow-400',
    above: 'bg-green-500/10 text-green-400',
};

const benchmarkStatusLabel: Record<string, string> = {
    below: 'Abaixo',
    average: 'Na Média',
    above: 'Acima',
};

const abStatusColors: Record<string, string> = {
    inconclusive: '#6b7280',
    trending: '#eab308',
    significant: '#22c55e',
};

const abStatusBg: Record<string, string> = {
    inconclusive: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    trending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    significant: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const abStatusLabel: Record<string, string> = {
    inconclusive: 'Inconclusivo',
    trending: 'Tendência',
    significant: 'Significativo',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function CircularGauge({ score, level }: { score: number; level: string }) {
    const color = healthColors[level] || '#6b7280';
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={130} height={130} className="-rotate-90">
                <circle
                    cx={65}
                    cy={65}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-zinc-800"
                    strokeWidth={10}
                />
                <circle
                    cx={65}
                    cy={65}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold" style={{ color }}>
                    {score}
                </span>
                <span className="text-xs text-zinc-400">{healthLabel[level] || level}</span>
            </div>
        </div>
    );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
    const pct = Math.min(Math.max(value * 100, 0), 100);
    let barColor = '#22c55e';
    if (pct < 40) barColor = '#ef4444';
    else if (pct < 60) barColor = '#eab308';
    else if (pct < 80) barColor = '#3b82f6';

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <span className="text-xs text-zinc-300 w-10 text-right">{(value * 100).toFixed(0)}%</span>
        </div>
    );
}

function DecayBar({ label, value }: { label: string; value: number | null }) {
    if (value === null) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 w-8">{label}</span>
                <span className="text-[10px] text-zinc-600">N/A</span>
            </div>
        );
    }
    const pct = Math.min(Math.max(Math.abs(value) * 100, 0), 100);
    const isNeg = value < 0;
    const barColor = isNeg ? '#ef4444' : value > 0.1 ? '#22c55e' : '#eab308';

    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 w-8">{label}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <span className="text-[10px] text-zinc-400 w-10 text-right">
                {isNeg ? '' : '+'}{(value * 100).toFixed(0)}%
            </span>
        </div>
    );
}

// ─── Section: Account Health ─────────────────────────────────────────────────

function AccountHealthSection({ health }: { health: AccountHealthScore }) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Saúde da Conta</h3>
            </div>
            <Card className={`border ${healthBg[health.level]}`}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <CircularGauge score={health.score} level={health.level} />
                        <div className="flex-1 space-y-3 w-full">
                            <SubScoreBar label="Fadiga Criativa Média" value={health.subScores.fatigueMean} />
                            <SubScoreBar label="Score ROAS" value={health.subScores.roasScore} />
                            <SubScoreBar label="Saturação Média" value={health.subScores.saturationMean} />
                            <SubScoreBar label="Utilização de Budget" value={health.subScores.budgetUtilization} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

// ─── Section: Creative Fatigue ───────────────────────────────────────────────

function CreativeFatigueSection({ scores }: { scores: CreativeFatigueScore[] }) {
    if (scores.length === 0) return null;

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Fadiga Criativa</h3>
                <span className="text-xs text-zinc-500 ml-1">({scores.length} anúncios)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {scores.map((item) => (
                    <Card key={item.adId} className="border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                {item.thumbnailUrl ? (
                                    <img
                                        src={`/api/image-proxy?url=${encodeURIComponent(item.thumbnailUrl)}`}
                                        alt={item.adName}
                                        className="w-14 h-14 rounded-md object-cover bg-zinc-800 shrink-0"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                                        <Eye className="w-5 h-5 text-zinc-600" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-200 truncate" title={item.adName}>
                                        {item.adName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full border ${fatigueBg[item.level]}`}
                                        >
                                            {fatigueLabel[item.level]}
                                        </span>
                                        <span
                                            className="text-xs font-mono font-semibold"
                                            style={{ color: fatigueColors[item.level] }}
                                        >
                                            {item.score.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.daysActive} dias
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {formatNumber(item.totalImpressions)} imp.
                                </span>
                                <MiniSparkline data={item.trend} color={fatigueColors[item.level]} />
                            </div>

                            <p className="text-xs text-zinc-400 italic leading-relaxed">
                                {item.recommendation}
                            </p>

                            <div className="space-y-1 pt-1 border-t border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                                    Decay Ratios
                                </p>
                                <DecayBar label="CTR" value={item.decayRatios.ctr} />
                                <DecayBar label="CPM" value={item.decayRatios.cpm} />
                                <DecayBar label="CR" value={item.decayRatios.cr} />
                                <DecayBar label="CPA" value={item.decayRatios.cpa} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}

// ─── Section: Audience Saturation ────────────────────────────────────────────

function AudienceSaturationSection({ indexes }: { indexes: AudienceSaturationIndex[] }) {
    if (indexes.length === 0) return null;

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Saturação de Audiência</h3>
                <span className="text-xs text-zinc-500 ml-1">({indexes.length} conjuntos)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {indexes.map((item) => (
                    <Card key={item.adsetId} className="border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-medium text-zinc-200 truncate" title={item.adsetName}>
                                {item.adsetName}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="text-xs text-zinc-400">
                                    <span>Frequência: </span>
                                    <span className="font-mono text-zinc-200">{item.frequency.toFixed(2)}</span>
                                    <span className="text-zinc-600"> / {item.optimalFrequency.toFixed(1)} ideal</span>
                                </div>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full border ${saturationBg[item.level]}`}
                                >
                                    {saturationLabel[item.level]}
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                                    <span>Índice de Saturação</span>
                                    <span
                                        className="font-mono font-semibold"
                                        style={{ color: saturationColors[item.level] }}
                                    >
                                        {item.saturationIndex.toFixed(2)}x
                                    </span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(item.saturationIndex * 50, 100)}%`,
                                            backgroundColor: saturationColors[item.level],
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                                    <span>Alcance</span>
                                    <span className="font-mono text-zinc-300">
                                        {(item.reachPercent * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${Math.min(item.reachPercent * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-zinc-400 italic leading-relaxed">
                                {item.recommendation}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}

// ─── Section: Benchmark Comparison ───────────────────────────────────────────

function BenchmarkSection({ benchmark }: { benchmark: BenchmarkComparison }) {
    const [mode, setMode] = useState<'sector' | 'historical'>(benchmark.mode);

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-zinc-100">Comparação com Benchmark</h3>
                    <span className="text-xs text-zinc-500 ml-1">({benchmark.industry})</span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
                    <button
                        onClick={() => setMode('sector')}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${
                            mode === 'sector'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                        Setor
                    </button>
                    <button
                        onClick={() => setMode('historical')}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${
                            mode === 'historical'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                        Histórico
                    </button>
                </div>
            </div>
            <Card className="border border-zinc-800">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Métrica</th>
                                    <th className="text-right text-xs text-zinc-400 font-medium px-4 py-3">Cliente</th>
                                    <th className="text-right text-xs text-zinc-400 font-medium px-4 py-3">Benchmark</th>
                                    <th className="text-right text-xs text-zinc-400 font-medium px-4 py-3">Índice</th>
                                    <th className="text-center text-xs text-zinc-400 font-medium px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benchmark.entries.map((entry) => {
                                    const indexColor = benchmarkStatusColors[entry.status];
                                    const IndexIcon =
                                        entry.status === 'above'
                                            ? TrendingUp
                                            : entry.status === 'below'
                                              ? TrendingDown
                                              : Minus;

                                    return (
                                        <tr
                                            key={entry.metric}
                                            className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-zinc-200 font-medium">{entry.label}</td>
                                            <td className="px-4 py-3 text-right font-mono text-zinc-300">
                                                {entry.clientValue.toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-zinc-500">
                                                {entry.benchmarkValue.toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span
                                                    className="font-mono font-semibold flex items-center justify-end gap-1"
                                                    style={{ color: indexColor }}
                                                >
                                                    <IndexIcon className="w-3 h-3" />
                                                    {entry.indexRatio.toFixed(2)}x
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full ${benchmarkStatusBg[entry.status]}`}
                                                >
                                                    {benchmarkStatusLabel[entry.status]}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

// ─── Section: A/B Tests ──────────────────────────────────────────────────────

function ABTestSection({ tests }: { tests: ABTestResult[] }) {
    if (tests.length === 0) return null;

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Testes A/B</h3>
                <span className="text-xs text-zinc-500 ml-1">({tests.length} testes)</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {tests.map((test) => {
                    const allVariantsAboveMin = test.variants.every((v) => v.impressions >= 3000);
                    const showWinner =
                        test.status === 'significant' &&
                        test.leadingVariantId &&
                        allVariantsAboveMin;

                    return (
                        <Card
                            key={test.adsetId}
                            className="border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-zinc-200 truncate" title={test.adsetName}>
                                        {test.adsetName}
                                    </p>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full border ${abStatusBg[test.status]}`}
                                    >
                                        {abStatusLabel[test.status]}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span>Confiança</span>
                                        <span
                                            className="font-mono font-semibold"
                                            style={{ color: abStatusColors[test.status] }}
                                        >
                                            {test.confidence.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(test.confidence, 100)}%`,
                                                backgroundColor: abStatusColors[test.status],
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span>Progresso da Amostra</span>
                                        <span className="font-mono text-zinc-300">
                                            {test.sampleProgress.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${Math.min(test.sampleProgress, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-800">
                                                <th className="text-left text-zinc-500 font-medium py-2 pr-2">
                                                    Variante
                                                </th>
                                                <th className="text-right text-zinc-500 font-medium py-2 px-1">
                                                    Imp.
                                                </th>
                                                <th className="text-right text-zinc-500 font-medium py-2 px-1">
                                                    Cliques
                                                </th>
                                                <th className="text-right text-zinc-500 font-medium py-2 px-1">
                                                    CTR
                                                </th>
                                                <th className="text-right text-zinc-500 font-medium py-2 px-1">
                                                    Gasto
                                                </th>
                                                <th className="text-right text-zinc-500 font-medium py-2 pl-1">
                                                    Conv.
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {test.variants.map((variant) => {
                                                const isLeading =
                                                    showWinner && variant.adId === test.leadingVariantId;

                                                return (
                                                    <tr
                                                        key={variant.adId}
                                                        className={`border-b border-zinc-800/30 ${
                                                            isLeading ? 'bg-green-500/5' : ''
                                                        }`}
                                                    >
                                                        <td className="py-2 pr-2">
                                                            <div className="flex items-center gap-1">
                                                                {isLeading && (
                                                                    <Target className="w-3 h-3 text-green-400 shrink-0" />
                                                                )}
                                                                <span
                                                                    className={`truncate max-w-[120px] ${
                                                                        isLeading
                                                                            ? 'text-green-300 font-medium'
                                                                            : 'text-zinc-300'
                                                                    }`}
                                                                    title={variant.adName}
                                                                >
                                                                    {variant.adName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-right py-2 px-1 font-mono text-zinc-400">
                                                            {formatNumber(variant.impressions)}
                                                        </td>
                                                        <td className="text-right py-2 px-1 font-mono text-zinc-400">
                                                            {formatNumber(variant.clicks)}
                                                        </td>
                                                        <td className="text-right py-2 px-1 font-mono text-zinc-300">
                                                            {(variant.ctr * 100).toFixed(2)}%
                                                        </td>
                                                        <td className="text-right py-2 px-1 font-mono text-zinc-400">
                                                            {formatCurrency(variant.spend)}
                                                        </td>
                                                        <td className="text-right py-2 pl-1 font-mono text-zinc-400">
                                                            {variant.conversions}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {showWinner && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <Target className="w-4 h-4 text-green-400 shrink-0" />
                                        <span className="text-xs text-green-300">
                                            Variante líder:{' '}
                                            <strong>
                                                {test.variants.find((v) => v.adId === test.leadingVariantId)?.adName}
                                            </strong>
                                        </span>
                                    </div>
                                )}

                                {test.disclaimer && (
                                    <div className="flex items-start gap-2 text-[11px] text-zinc-500 leading-relaxed">
                                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>{test.disclaimer}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsIntelligencePanelV2({ token, accountId }: Props) {
    const {
        intelligenceMetrics,
        isLoadingIntelligence,
        intelligenceError,
        fetchIntelligence,
        kpiSummary,
    } = useAdsStore();

    useEffect(() => {
        if (token && accountId && !intelligenceMetrics) {
            fetchIntelligence(token, accountId);
        }
    }, [token, accountId, intelligenceMetrics, fetchIntelligence]);

    const handleRetry = () => {
        if (token && accountId) {
            fetchIntelligence(token, accountId);
        }
    };

    // Loading state
    if (isLoadingIntelligence) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm text-zinc-400">Analisando métricas de inteligência...</p>
            </div>
        );
    }

    // Error state
    if (intelligenceError) {
        return (
            <Card className="border border-red-500/30 bg-red-500/5">
                <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <div className="text-center">
                        <p className="text-sm font-medium text-red-300">Erro ao carregar inteligência</p>
                        <p className="text-xs text-zinc-500 mt-1">{intelligenceError}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (!intelligenceMetrics) {
        return (
            <Card className="border border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                    <Brain className="w-10 h-10 text-zinc-600" />
                    <div className="text-center">
                        <p className="text-sm font-medium text-zinc-300">Painel de Inteligência</p>
                        <p className="text-xs text-zinc-500 mt-1">
                            Analise fadiga criativa, saturação de audiência, testes A/B e benchmarks.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Carregar Inteligência
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const metrics = intelligenceMetrics;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-bold text-zinc-100">Inteligência de Ads</h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                        Atualizado: {new Date(metrics.computedAt).toLocaleString('pt-BR')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleRetry} className="gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Account Health */}
            {metrics.healthScore && (
                <AccountHealthSection health={metrics.healthScore} />
            )}

            {metrics.healthScore && metrics.fatigueScores.length > 0 && (
                <div className="border-t border-zinc-800" />
            )}

            {/* Creative Fatigue */}
            <CreativeFatigueSection scores={metrics.fatigueScores} />

            {metrics.fatigueScores.length > 0 && metrics.saturationIndexes.length > 0 && (
                <div className="border-t border-zinc-800" />
            )}

            {/* Audience Saturation */}
            <AudienceSaturationSection indexes={metrics.saturationIndexes} />

            {metrics.saturationIndexes.length > 0 && metrics.benchmarkComparison && (
                <div className="border-t border-zinc-800" />
            )}

            {/* Benchmark Comparison */}
            {metrics.benchmarkComparison && (
                <BenchmarkSection benchmark={metrics.benchmarkComparison} />
            )}

            {metrics.benchmarkComparison && metrics.abTests.length > 0 && (
                <div className="border-t border-zinc-800" />
            )}

            {/* A/B Tests */}
            <ABTestSection tests={metrics.abTests} />
        </div>
    );
}
