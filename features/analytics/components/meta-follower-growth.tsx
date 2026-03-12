'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AccountDailyMetric } from '@/lib/services/instagram-graph.service';

interface Props {
  data: AccountDailyMetric[];
}

export function MetaFollowerGrowth({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
        <p className="text-sm text-muted-foreground">Sem dados suficientes sobre seguidores.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    netGrowth: d.followsNet,
  }));

  const totalGrowth = chartData.reduce((acc, curr) => acc + curr.netGrowth, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Crescimento Líquido (Período)</p>
          <p className={`text-2xl font-bold font-mono ${totalGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalGrowth > 0 ? '+' : ''}{totalGrowth}
          </p>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              cursor={{ fill: 'var(--v2-bg-surface)', opacity: 0.2 }}
            />
            <Bar
              dataKey="netGrowth"
              radius={[4, 4, 4, 4]}
              shape={(props: any) => {
                const { x, y, width, height, value } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={value >= 0 ? '#10b981' : '#ef4444'}
                    rx={2}
                    ry={2}
                  />
                );
              }}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
