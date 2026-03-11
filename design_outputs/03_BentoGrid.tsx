import React from 'react';

// Ruído SVG embutido
const NOISE_URL = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export function BentoDashboard() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0C] text-[#F2F0F5] p-6 overflow-hidden">
      
      {/* Global Grain Texture */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-50"
        style={{ backgroundImage: NOISE_URL }}
      />

      {/* Ambient Gradient Orbs - Background Abissal */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#FF7350]/[0.06] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[600px] bg-[#746C7E]/[0.08] blur-[100px] rounded-full pointer-events-none rotate-45" />

      {/* Grid Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[12px] auto-rows-[140px]">
        
        {/* BIG BLOCK (2x2): Overview */}
        <div className="group relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 md:col-span-2 row-span-2 p-5 flex flex-col justify-between">
          <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-[#FF7350]/[0.08] blur-[40px] rounded-full transition-opacity duration-500 group-hover:opacity-100 opacity-60 pointer-events-none" />
          <div>
            <h2 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873]">Visão Geral</h2>
            <div className="mt-2 text-5xl font-mono tracking-tight">1.28M</div>
            <div className="text-xs font-mono text-[#6B8E70] mt-1">+14.2% vs. último período</div>
          </div>
          {/* Placeholder para o Mini Gráfico de Tendência (pode usar o chart abaixo depois) */}
          <div className="h-24 w-full border-b border-[#FF7350]/20 flex items-end opacity-70">
            <span className="text-[#45434D] text-[10px] mb-2 uppercase tracking-widest">Tendência em Processamento...</span>
          </div>
        </div>

        {/* MEDIUM BLOCK 1 (2x1): Alcance Total */}
        <div className="group relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 md:col-span-2 row-span-1 p-4">
          <div className="absolute bottom-[-20px] left-[50%] w-32 h-32 bg-[#746C7E]/[0.1] blur-[30px] rounded-full pointer-events-none" />
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873]">Alcance Total</h3>
          <div className="text-3xl font-mono mt-1">452.4K</div>
        </div>

        {/* MEDIUM BLOCK 2 (2x1): Melhor Post */}
        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 md:col-span-2 row-span-1 p-4 flex gap-4">
          <div className="w-16 h-16 bg-[#121216] border border-white/[0.04] rounded-md shrink-0 bg-cover bg-center" style={{ backgroundImage: "url('/post-placeholder.jpg')" }} />
          <div>
            <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873]">Melhor Post</h3>
            <p className="text-sm text-[#F2F0F5] mt-1 line-clamp-2">Lançamento da nova coleção FW26. O brutalismo encontra a alfaiataria...</p>
          </div>
        </div>

        {/* SMALL BLOCKS (1x1) */}
        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 border-t-[#FF7350]/40 row-span-1 p-4 flex flex-col justify-end">
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873] absolute top-4 left-4">Comentários</h3>
          <div className="text-2xl font-mono">8,401</div>
        </div>
        
        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 row-span-1 p-4 flex flex-col justify-end">
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873] absolute top-4 left-4">Salvos</h3>
          <div className="text-2xl font-mono">12.2K</div>
        </div>

        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 row-span-1 p-4 flex flex-col justify-end">
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873] absolute top-4 left-4">Compartilhamentos</h3>
          <div className="text-2xl font-mono">4,930</div>
        </div>

        {/* VERTICAL BLOCK (1x2): Top 5 Hashtags */}
        {/* No mobile ele flui naturalmente pro grid. No Desktop ele puxa a 4ª coluna */}
        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 md:col-span-1 row-span-2 p-5">
           <div className="absolute top-[30%] right-[-10px] w-24 h-24 bg-[#FF7350]/[0.05] blur-[24px] rounded-full pointer-events-none" />
           <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873] mb-4">Top Tags</h3>
           <div className="flex flex-col gap-3">
              {[
                { tag: '#design', pct: 85 },
                { tag: '#brutalism', pct: 60 },
                { tag: '#ui', pct: 45 },
                { tag: '#darkmode', pct: 30 },
                { tag: '#art', pct: 20 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="text-xs text-[#9E9AA6] mb-1 font-mono">{item.tag}</div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-[#746C7E]" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* WIDE BLOCK (3x1): Timeline */}
        <div className="relative overflow-hidden rounded-[12px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] col-span-1 md:col-span-3 row-span-1 p-4 flex flex-col justify-between">
            <h3 className="text-[10px] font-medium tracking-widest uppercase text-[#6B6873]">Densidade de Atividade (30d)</h3>
            <div className="w-full h-12 flex items-end gap-[2px]">
              {/* Mini barras geradas aleatoriamente para simular a densidade */}
              {Array.from({ length: 45 }).map((_, i) => (
                <div key={i} className="flex-1 bg-white/[0.08] rounded-t-sm hover:bg-[#FF7350]/60 transition-colors" style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
              ))}
            </div>
        </div>

      </div>
    </div>
  );
}
