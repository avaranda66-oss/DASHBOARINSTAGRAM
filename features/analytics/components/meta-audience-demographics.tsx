'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { AudienceDemographics, DemographicEntry } from '@/lib/services/instagram-graph.service';

interface Props {
  demographics: AudienceDemographics;
  followersCount?: number;
}

const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

function HorizontalBarChart({ data, color }: { data: DemographicEntry[], color: string }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-4">Sem dados</p>;

  // Get top 10
  const topData = data.slice(0, 10);

  // Calculate dynamic width for Y-axis labels based on longest label
  const maxLabelLength = Math.max(...topData.map(d => d.label.length));
  const yAxisWidth = Math.min(Math.max(maxLabelLength * 7, 80), 160);
  const chartHeight = Math.max(200, topData.length * 28);

  return (
    <div style={{ height: `${chartHeight}px` }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={topData}
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            tick={{ fontSize: 10, fill: 'var(--v2-text-primary)' }}
            tickFormatter={(value) => (value.length > 22 ? value.substring(0, 22) + '…' : value)}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'var(--v2-bg-surface-hover)',
              borderColor: 'var(--v2-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--v2-text-primary)'
            }}
            cursor={{ fill: 'var(--v2-bg-surface)', opacity: 0.2 }}
          />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetaAudienceDemographics({ demographics, followersCount }: Props) {
  const [view, setView] = useState<'followers' | 'engaged'>('followers');

  if (followersCount != null && followersCount < 100) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
        <p className="font-semibold text-lg text-amber-500 mb-2">Conta Muito Pequena</p>
        <p className="text-sm text-muted-foreground text-center">
          O Meta Graph API exige um mínimo de 100 seguidores para disponibilizar os dados demográficos (idade, gênero, localização).
          Atualmente você possui {followersCount} seguidores.
        </p>
      </div>
    );
  }

  const data = demographics[view];

  if (!data || (data.age.length === 0 && data.gender.length === 0 && data.city.length === 0 && data.country.length === 0)) {
     return (
       <div className="space-y-6">
         <div className="flex justify-center">
           <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
             <button
               onClick={() => setView('followers')}
               className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                 view === 'followers' ? 'bg-blue-500 text-white shadow' : 'text-zinc-400 hover:text-white'
               }`}
             >
               Seguidores
             </button>
             <button
               onClick={() => setView('engaged')}
               className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                 view === 'engaged' ? 'bg-purple-500 text-white shadow' : 'text-zinc-400 hover:text-white'
               }`}
             >
               Engajados
             </button>
           </div>
         </div>
         <div className="flex items-center justify-center p-8 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-800">
           <p className="text-sm text-muted-foreground">
             Não há dados demográficos de {view === 'engaged' ? 'contas engajadas' : 'seguidores'} disponíveis no momento.
           </p>
         </div>
       </div>
     );
  }

  // Pre-process Gender pie chart data to clean format
  const genderData = data.gender.map((g) => {
    let label = g.label;
    if (g.label === 'F') label = 'Feminino';
    else if (g.label === 'M') label = 'Masculino';
    else if (g.label === 'U') label = 'Outro/Desconhecido';
    return { ...g, label };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
          <button
            onClick={() => setView('followers')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === 'followers' ? 'bg-blue-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Seguidores
          </button>
          <button
            onClick={() => setView('engaged')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === 'engaged' ? 'bg-purple-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Engajados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genero */}
        <div className="v2-glass p-4 rounded-xl border border-zinc-800 overflow-hidden">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Gênero</h4>
          <div className="h-[200px] w-full flex items-center justify-center">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--v2-bg-surface-hover)',
                      borderColor: 'var(--v2-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                    animationDuration={500}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <p className="text-xs text-muted-foreground">Sem dados</p>
            )}
            
            <div className="ml-4 flex flex-col gap-2 justify-center">
                {genderData.map((g, i) => (
                  <div key={g.label} className="flex items-center gap-2 text-xs">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground whitespace-nowrap">{g.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Idade */}
        <div className="v2-glass p-4 rounded-xl border border-zinc-800 overflow-hidden">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Idade</h4>
          <HorizontalBarChart data={data.age} color="#ec4899" />
        </div>

        {/* Cidades */}
        <div className="v2-glass p-4 rounded-xl border border-zinc-800 overflow-hidden">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Top Cidades</h4>
          <HorizontalBarChart data={data.city} color="#10b981" />
        </div>

        {/* Países */}
        <div className="v2-glass p-4 rounded-xl border border-zinc-800 overflow-hidden">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Top Países</h4>
          <HorizontalBarChart data={data.country} color="#f59e0b" />
        </div>
      </div>
    </div>
  );
}
