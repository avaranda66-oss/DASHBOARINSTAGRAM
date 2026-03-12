'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AccountDailyMetric } from '@/lib/services/instagram-graph.service';

interface Props {
  data: AccountDailyMetric[];
}

export function MetaAccountTrends({ data }: Props) {
  const [metric, setMetric] = useState<keyof AccountDailyMetric>('reach');

  const options = [
    { value: 'reach', label: 'Alcance' },
    { value: 'views', label: 'Views (Reels/Stories)' },
    { value: 'accountsEngaged', label: 'Contas Engajadas' },
    { value: 'totalInteractions', label: 'Total Interações' },
    { value: 'likes', label: 'Likes' },
    { value: 'saves', label: 'Saves' },
    { value: 'shares', label: 'Shares' },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
        <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir tendências diárias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMetric(opt.value as keyof AccountDailyMetric)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${
              metric === opt.value
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                : 'bg-transparent text-muted-foreground border-zinc-800 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Check if selected metric has any data */}
      {data.every(d => (d[metric] as number) === 0) ? (
        <div className="flex items-center justify-center h-[250px] bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
          <p className="text-sm text-muted-foreground">
            Sem dados de &quot;{options.find(o => o.value === metric)?.label}&quot; no período. A Meta API pode não disponibilizar esta métrica para sua conta.
          </p>
        </div>
      ) : (
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--v2-border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
              tickFormatter={(val) => {
                const parts = val.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--v2-text-tertiary)' }}
              tickFormatter={(val) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--v2-bg-surface-hover)',
                borderColor: 'var(--v2-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--v2-text-primary)'
              }}
              labelStyle={{ color: 'var(--v2-text-secondary)', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMetric)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
