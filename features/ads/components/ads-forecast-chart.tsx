'use client';

import { useMemo } from 'react';
import {
    ComposedChart, Area, Line, XAxis, YAxis,
    Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { holtWintersWithPI } from '@/lib/utils/hw-optimizer';
import type { DailyAdInsight } from '@/types/ads';

interface Props {
    daily: DailyAdInsight[];
    currency?: string;
}

const MIN_POINTS = 14;
const FORECAST_H = 7;

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
        return dateStr;
    }
}

function fmtCurrency(v: number, currency: string): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}

type ChartPoint = {
    date: string;
    actual?: number;
    forecast?: number;
    pi80Lower?: number;
    pi80Upper?: number;
    pi95Lower?: number;
    pi95Upper?: number;
    isForecast: boolean;
};

export function AdsForecastChart({ daily, currency = 'BRL' }: Props) {
    const chartData = useMemo<ChartPoint[]>(() => {
        if (daily.length < MIN_POINTS) return [];

        const series = daily.map(d => d.spend);
        const hw = holtWintersWithPI(series, { period: 7, h: FORECAST_H, autoOptimize: true });

        // Pontos históricos
        const historical: ChartPoint[] = daily.map(d => ({
            date: d.date,
            actual: d.spend,
            isForecast: false,
        }));

        // Pontos de forecast
        const lastDate = daily[daily.length - 1].date;
        const forecastPoints: ChartPoint[] = hw.forecast.map((val, i) => ({
            date: addDays(lastDate, i + 1),
            forecast: Math.max(0, val),
            pi80Lower: Math.max(0, hw.pi80[i]?.lower ?? val),
            pi80Upper: Math.max(0, hw.pi80[i]?.upper ?? val),
            pi95Lower: Math.max(0, hw.pi95[i]?.lower ?? val),
            pi95Upper: Math.max(0, hw.pi95[i]?.upper ?? val),
            isForecast: true,
        }));

        // Ponto de conexão: último histórico serve de âncora para o forecast
        if (forecastPoints.length > 0) {
            forecastPoints[0] = {
                ...forecastPoints[0],
                actual: daily[daily.length - 1].spend, // linha sólida conecta
            };
        }

        return [...historical, ...forecastPoints];
    }, [daily]);

    if (chartData.length === 0) {
        return (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="font-mono text-[#A3E635] text-[10px] uppercase tracking-[0.4em]">
                    ◈ FORECAST_UNAVAILABLE
                </span>
                <p className="font-mono text-[9px] text-[#4A4A4A]">
                    Mínimo de {MIN_POINTS} dias de dados para ativar previsão
                </p>
            </div>
        );
    }

    const firstForecastDate = chartData.find(d => d.isForecast)?.date;

    return (
        <div className="space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-[#A3E635]" />
                    <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Histórico</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 border-t border-dashed border-[#FBBF24]" />
                    <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">Forecast +7d</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: 'rgba(163,230,53,0.15)' }} />
                    <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">IC 80%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: 'rgba(163,230,53,0.07)' }} />
                    <span className="font-mono text-[8px] text-[#4A4A4A] uppercase tracking-widest">IC 95%</span>
                </div>
            </div>

            <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="forecastPI95" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#A3E635" stopOpacity={0.12} />
                                <stop offset="95%" stopColor="#A3E635" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="forecastPI80" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#A3E635" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#A3E635" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />

                        <XAxis
                            dataKey="date"
                            tickFormatter={fmtDate}
                            tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#3A3A3A', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={v => fmtCurrency(v, currency)}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0A0A0A',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '10px',
                            }}
                            labelStyle={{ color: '#A3E635', fontSize: '10px', marginBottom: '4px' }}
                            itemStyle={{ color: '#8A8A8A', fontSize: '9px' }}
                            labelFormatter={v => fmtDate(String(v))}
                            formatter={(value, name) => {
                                const labels: Record<string, string> = {
                                    actual: 'Gasto Real',
                                    forecast: 'Previsão',
                                    pi95Upper: 'IC 95% sup.',
                                    pi95Lower: 'IC 95% inf.',
                                    pi80Upper: 'IC 80% sup.',
                                    pi80Lower: 'IC 80% inf.',
                                };
                                const num = typeof value === 'number' ? value : Number(value ?? 0);
                                const key = String(name ?? '');
                                return [fmtCurrency(num, currency), labels[key] ?? key];
                            }}
                        />

                        {/* Linha divisória histórico → forecast */}
                        {firstForecastDate && (
                            <ReferenceLine
                                x={firstForecastDate}
                                stroke="rgba(255,255,255,0.08)"
                                strokeDasharray="4 4"
                                label={{ value: 'HOJE', fill: '#3A3A3A', fontSize: 8, fontFamily: 'monospace' }}
                            />
                        )}

                        {/* PI 95% (banda exterior, mais suave) */}
                        <Area
                            type="monotone"
                            dataKey="pi95Upper"
                            stroke="none"
                            fill="url(#forecastPI95)"
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="pi95Lower"
                            stroke="none"
                            fill="#0A0A0A"
                            isAnimationActive={false}
                        />

                        {/* PI 80% (banda interior, mais opaca) */}
                        <Area
                            type="monotone"
                            dataKey="pi80Upper"
                            stroke="none"
                            fill="url(#forecastPI80)"
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="pi80Lower"
                            stroke="none"
                            fill="#0A0A0A"
                            isAnimationActive={false}
                        />

                        {/* Linha histórico */}
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#A3E635"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls={false}
                        />

                        {/* Linha forecast (tracejada) */}
                        <Line
                            type="monotone"
                            dataKey="forecast"
                            stroke="#FBBF24"
                            strokeWidth={1.5}
                            strokeDasharray="5 3"
                            dot={false}
                            isAnimationActive={false}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
