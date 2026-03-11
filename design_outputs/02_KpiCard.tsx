import React from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  delta: number;
  data: number[]; // Array de números para o sparkline
}

export function KpiCard({ 
  label = "ALCANCE TOTAL", 
  value = "45.2K", 
  delta = 12.3, 
  data = [12, 18, 15, 24, 28, 22, 35, 30, 42, 38, 48, 45] 
}: KpiCardProps) {
  const isPositive = delta >= 0;
  const deltaColor = isPositive ? 'text-[#6B8E70]' : 'text-[#A35252]';
  const deltaIcon = isPositive ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7";
  
  // Lógica simples para gerar o path SVG do sparkline minimalista
  const maxData = Math.max(...data);
  const minData = Math.min(...data);
  const range = maxData - minData || 1;
  const sparklinePath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - minData) / range) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="
      group relative overflow-hidden rounded-xl bg-white/[0.02] p-5 w-80
      backdrop-blur-xl transition-all duration-300 ease-out
      border border-[#FF7350]/[0.05] hover:border-[#FF7350]/[0.25]
      hover:shadow-[0_4px_30px_rgba(255,115,80,0.08)]
    ">
      
      {/* Noise / Grain Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Decoração Geométrica Abstrata */}
      <div className="absolute top-5 right-5 opacity-20 transition-transform duration-500 group-hover:rotate-90 group-hover:opacity-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" 
                stroke="#FF7350" strokeWidth="1.5" strokeLinejoin="miter" />
          <circle cx="12" cy="12" r="2" fill="#746C7E" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        
        {/* Top: Label & Delta */}
        <div>
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873] mb-1">
            {label}
          </h3>
          <div className="flex items-end gap-3 mt-3">
            <span className="text-4xl font-mono tabular-nums tracking-tight text-[#F2F0F5]">
              {value}
            </span>
            <span className={`flex items-center text-xs font-mono mb-1 ${deltaColor} opacity-90`}>
              <svg 
                className="w-3 h-3 mr-1 transition-transform duration-300 group-hover:-translate-y-1" 
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
              >
                <path strokeLinecap="square" strokeLinejoin="miter" d={deltaIcon} />
              </svg>
              {isPositive ? '+' : ''}{delta}%
            </span>
          </div>
        </div>

        {/* Bottom: Minimalist Sparkline */}
        <div className="h-8 w-full mt-4 opacity-50 transition-opacity duration-300 group-hover:opacity-100">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 -5 100 110">
            <path
              d={sparklinePath}
              fill="none"
              stroke="#746C7E"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </svg>
        </div>

      </div>
    </div>
  );
}

// Exemplo de uso
export default function KpiGrid() {
  return (
    <div className="flex gap-4 p-8 bg-[#0A0A0C] min-h-screen">
      <KpiCard 
        label="ALCANCE TOTAL" 
        value="124.8K" 
        delta={12.4} 
        data={[20, 25, 22, 30, 28, 35, 40, 38, 45, 42, 50, 55]} 
      />
      <KpiCard 
        label="TAXA DE ENGAJAMENTO" 
        value="4.2%" 
        delta={-1.8} 
        data={[50, 48, 45, 42, 44, 40, 38, 35, 30, 28, 25, 22]} 
      />
    </div>
  );
}
