import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

const data = [
  { date: '01 Mar', reach: 4000 },
  { date: '05 Mar', reach: 3000 },
  { date: '10 Mar', reach: 6000 },
  { date: '15 Mar', reach: 2780 },
  { date: '20 Mar', reach: 5890 },
  { date: '25 Mar', reach: 8390 },
  { date: '30 Mar', reach: 7490 },
];

export function PremiumChartCard() {
  const [activeFilter, setActiveFilter] = useState('30d');

  // Tooltip customizado Glassmorphism
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121216]/80 backdrop-blur-xl border border-white/[0.08] p-3 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <p className="text-[#6B6873] text-[10px] font-medium uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF7350]" />
            <p className="text-[#F2F0F5] font-mono text-sm">{payload[0].value.toLocaleString()}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-5 w-full max-w-4xl mx-auto">
      
      {/* Texture Layer */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

      {/* Header do Gráfico */}
      <div className="flex justify-between items-end mb-6 relative z-10">
        <div>
          <h2 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873]">Alcance</h2>
          <div className="text-xl font-mono text-[#F2F0F5] mt-1">Últimos 30 Dias</div>
        </div>
        
        {/* Pills Minimalistas */}
        <div className="flex gap-1 bg-[#121216] p-1 rounded-md border border-white/[0.04]">
          {['7d', '14d', '30d'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                activeFilter === f 
                  ? 'bg-white/[0.08] text-[#F2F0F5]' 
                  : 'text-[#6B6873] hover:text-[#9E9AA6]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-[280px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                {/* Accent Color com Blur/Gradient pra baixo */}
                <stop offset="5%" stopColor="#FF7350" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF7350" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            {/* Grid super sutil */}
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke="#ffffff" 
              strokeOpacity={0.02} 
            />
            
            {/* Eixo X: Removemos a linha do eixo, mantemos apenas alguns labels estilizados */}
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#45434D', fontSize: 10, fontFamily: 'monospace' }}
              tickMargin={12}
              minTickGap={30}
            />
            
            {/* Eixo Y é escondido (os dados vêm do hover/tooltip) */}
            <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#45434D', strokeWidth: 1, strokeDasharray: '3 3' }} 
            />
            
            <Area 
              type="monotone" 
              dataKey="reach" 
              stroke="#FF7350" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorReach)" 
              activeDot={{ 
                r: 4, 
                fill: '#FF7350', 
                stroke: '#0A0A0C', 
                strokeWidth: 2 
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
