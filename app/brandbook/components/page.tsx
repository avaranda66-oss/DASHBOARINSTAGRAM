'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Button, Badge, Input } from '@/design-system/atoms'
import { KpiCard, SectionCard, ChartCard } from '@/design-system/molecules'

const COMPONENTS = [
  { id: 'button', name: 'Button', status: 'ready', count: '1 Atom', desc: 'Interactive trigger for system actions.' },
  { id: 'badge', name: 'Badge', status: 'ready', count: '1 Atom', desc: 'Status indicators and metadata labels.' },
  { id: 'input', name: 'Input', status: 'ready', count: '1 Atom', desc: 'Data entry kernel with validation and glyph support.' },
  { id: 'kpicard', name: 'KpiCard', status: 'ready', count: '1 Molecule', desc: 'Visual container for high-density metrics and trends.' },
  { id: 'sectioncard', name: 'SectionCard', status: 'ready', count: '1 Molecule', desc: 'Standard surface container for dashboard panels.' },
  { id: 'chartcard', name: 'ChartCard', status: 'ready', count: '1 Molecule', desc: 'Complex wrapper for data visualization kernels.' },
]

export default function ComponentsIndexPage() {
  return (
    <div className="relative min-h-screen py-24 px-12 md:px-20 max-w-6xl mx-auto space-y-32 mb-32">
      
      {/* Header */}
      <header className="space-y-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-[#A3E635]"
        >
          <span className="font-mono text-xs font-bold tracking-[0.25em]">[03]</span>
          <div className="h-px w-6 bg-[#A3E635]" />
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#4A4A4A]">Library</span>
        </motion.div>

        <h1 className="text-[clamp(3rem,6vw,5rem)] font-black tracking-[-0.04em] leading-[0.9]">
          <span className="text-[#F5F5F5]">COMPONENT </span>
          <span className="text-[#A3E635]">INDEX.</span>
        </h1>
        <p className="text-xl text-[#8A8A8A] max-w-2xl leading-relaxed">
          The modular building blocks of our laboratory. Atomic elements designed for limitless composition.
        </p>
      </header>

      {/* Grid of Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#141414] border border-[#141414] rounded-2xl overflow-hidden shadow-2xl">
        {COMPONENTS.map((comp) => (
          <div key={comp.id} className="group relative p-8 bg-black hover:bg-[#050505] transition-colors">
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-[#F5F5F5] uppercase tracking-tighter">{comp.name}</h3>
                  {comp.status === 'ready' ? (
                     <div className="px-1.5 py-0.5 rounded-[4px] bg-[#A3E635]/10 border border-[#A3E635]/20 text-[9px] font-bold text-[#A3E635] uppercase tracking-widest">Ready</div>
                  ) : (
                    <div className="px-1.5 py-0.5 rounded-[4px] bg-white/5 border border-white/10 text-[9px] font-bold text-[#4A4A4A] uppercase tracking-widest">WIP</div>
                  )}
                </div>
                <p className="text-[10px] font-mono text-[#4A4A4A] tracking-wider uppercase">{comp.count}</p>
              </div>
              <span className="font-mono text-[10px] text-[#2A2A2A] group-hover:text-[#A3E635] transition-colors select-none">{'{}'}</span>
            </div>

            <p className="text-sm text-[#8A8A8A] leading-relaxed mb-12 h-12 line-clamp-2 transition-colors group-hover:text-[#F5F5F5]/70">
              {comp.desc}
            </p>

            <div className="flex items-center gap-4">
               {comp.status === 'ready' ? (
                 <Button variant="outline" size="sm" className="rounded-full font-mono text-[9px] tracking-widest">
                   DOCS_OPEN
                 </Button>
               ) : (
                 <span className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest cursor-not-allowed">Coming Soon</span>
               )}
            </div>

            {/* Decoration Pattern on Hover — grid via CSS */}
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-12 h-12 opacity-10" style={{ backgroundImage: 'linear-gradient(#A3E635 1px, transparent 1px), linear-gradient(90deg, #A3E635 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Input Showcase */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[01]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Atom — Input</h2>
        </div>

        <div className="p-12 rounded-3xl border border-[#141414] bg-[#050505] relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
               <Input 
                label="System Identifier" 
                placeholder="PROD_NODE_0x..." 
                hint="Use standard hexadecimal notation."
               />
               <Input 
                label="Temporal Access Key" 
                defaultValue="482.9.11"
                prefix={<span className="font-mono text-[10px]">◎</span>}
                isMono
               />
            </div>
            <div className="space-y-8">
               <Input 
                label="Validation Endpoint" 
                error="Invalid security handshake."
                defaultValue="https://api.factory.oss/v2"
               />
               <Input 
                label="Search Thread" 
                placeholder="Querying kernel..."
                isLoading
               />
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
               style={{ 
                 backgroundImage: `linear-gradient(#A3E635 1px, transparent 1px), linear-gradient(90deg, #A3E635 1px, transparent 1px)`,
                 backgroundSize: '40px 40px',
               }} 
          />
        </div>
      </section>

      {/* Button & Badge Recap */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-12">
            <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[02]</span>
            <h2 className="text-3xl font-bold tracking-tight uppercase">Atoms Recap</h2>
            </div>
            <div className="p-10 rounded-3xl border border-[#141414] bg-[#050505] space-y-10">
                <div className="flex flex-wrap gap-4">
                    <Button size="sm">Action</Button>
                    <Button variant="outline" size="sm">Outline</Button>
                    <Button variant="ghost" size="sm">Ghost</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge intent="success">STATUS: OK</Badge>
                    <Badge intent="error" variant="outline">FAULT</Badge>
                    <Badge intent="warning" variant="subtle">PENDING</Badge>
                </div>
            </div>
        </div>

        <div className="space-y-12">
            <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[03]</span>
            <h2 className="text-3xl font-bold tracking-tight uppercase">Molecules Recap</h2>
            </div>
            <div className="p-10 rounded-3xl border border-[#141414] bg-[#050505]">
                <KpiCard 
                    label="Active Nodes"
                    value="2,482"
                    delta={8.2}
                    deltaLabel="vs. 24h"
                    sparkline={[10, 15, 8, 12, 18, 20]}
                />
            </div>
        </div>
      </section>

      {/* ChartCard & SectionCard Showcase */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[04]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Complex Molecules</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SectionCard title="Data Kernel Architecture" headerRight={<Button variant="ghost" size="sm" className="h-6 font-mono text-[8px]">LOG_0x</Button>}>
                <div className="p-8 border border-dashed border-white/10 rounded flex items-center justify-center bg-white/[0.02]">
                    <span className="font-mono text-[10px] text-[#4A4A4A] uppercase tracking-widest">Structural_Content_Slot</span>
                </div>
            </SectionCard>

            <ChartCard 
              title="Real-time Throughput" 
              subtitle="Monitoring neural link activity in milliseconds."
              height={140}
            >
                <div className="w-full h-full flex items-end gap-1 px-2 pb-2">
                    {[40, 70, 45, 90, 65, 80, 55, 95, 30, 60].map((h, i) => (
                        <div key={i} className="flex-1 bg-[#A3E635]/20 border-t border-[#A3E635]/40" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </ChartCard>

            <ChartCard title="Loading State" height={140} isLoading>
                <div />
            </ChartCard>
        </div>
      </section>

    </div>
  )
}
