'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { semantic } from '@/design-system/tokens/colors'

const sections = [
  { index: '01', title: 'Guidelines', description: 'Princípios matemáticos, identidade bruta e voz do sistema.', href: '/brandbook/guidelines' },
  { index: '02', title: 'Foundations', description: 'Tokens técnicos: cores RGBA, tipografia escala 1.25, grids.', href: '/brandbook/foundations' },
  { index: '03', title: 'Components', description: 'Showcase explodido de átomos e moléculas documentadas.', href: '/brandbook/components' },
  { id: '04', title: 'Motion', index: '04', description: 'Presets cinéticos e lógica de easing HUD.', href: '/brandbook/motion' },
]

export default function BrandbookLandingPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      
      {/* ─── LEFT PANEL: CONTEXT ─── */}
      <section className="w-full md:w-[45%] p-12 md:p-24 flex flex-col justify-between border-r border-[#141414] bg-black relative overflow-hidden">
        
        {/* Animated Background lines */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-[#A3E635] animate-scan" style={{ animationDuration: '4s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-12 relative z-10"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#A3E635] tracking-[0.25em]">[00]</span>
            <div className="h-px w-8 bg-[#A3E635]/40" />
            <span className="text-[10px] font-mono font-semibold tracking-[0.4em] uppercase text-[#4A4A4A]">Core Identity Specification</span>
          </div>

          <h1 className="text-[clamp(3.5rem,7vw,6.5rem)] font-black tracking-[-0.05em] leading-[0.88] text-[#F5F5F5] uppercase">
             Design<br />
             <span className="text-[#A3E635]">System.</span>
          </h1>

          <p className="text-xl text-[#8A8A8A] max-w-sm leading-relaxed font-medium">
             A performance-driven technical language for <span className="text-[#F5F5F5]">Dashboard OSS</span>. 
             Engineered for mathematical precision.
          </p>
        </motion.div>

        <div className="pt-24 space-y-4">
           <div className="flex gap-4">
              <div className="px-3 py-1 border border-[#141414] rounded-full">
                 <span className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-widest">Build 2.5.H</span>
              </div>
              <div className="px-3 py-1 border border-[#141414] rounded-full">
                 <span className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-widest">Solar_Green.env</span>
              </div>
           </div>
        </div>
      </section>

      {/* ─── RIGHT PANEL: NAVIGATION CONTENT ─── */}
      <section className="flex-1 bg-[#050505] relative overflow-auto">
        
        {/* HUD Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
             style={{ 
               backgroundImage: `radial-gradient(#A3E635 1px, transparent 1px)`,
               backgroundSize: '32px 32px'
             }} 
        />

        <div className="relative z-10 divide-y divide-[#141414]">
          {sections.map((section, i) => (
            <Link 
              key={section.index}
              href={section.href}
              className="group block p-12 md:p-16 hover:bg-black transition-all relative overflow-hidden"
            >
               {/* Content */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs font-bold text-[#4A4A4A] group-hover:text-[#A3E635] transition-colors leading-none">
                        [{section.index}]
                      </span>
                      <h3 className="text-3xl font-bold tracking-tight text-[#F5F5F5] uppercase group-hover:translate-x-1 transition-transform">
                        {section.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#4A4A4A] max-w-md leading-relaxed group-hover:text-[#8A8A8A] transition-colors">
                       {section.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                     <span className="font-mono text-[10px] text-[#2A2A2A] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Accessing_Module</span>
                     <span className="text-2xl text-[#2A2A2A] group-hover:text-[#A3E635] transition-colors">▶</span>
                  </div>
               </div>

               {/* Interaction Highlight Pattern */}
               <div className="absolute top-0 right-0 h-full w-24 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.05))' }} />
            </Link>
          ))}
        </div>

        {/* System Footer Table */}
        <div className="p-12 md:p-16 border-t border-[#141414] bg-black">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <StatBlock label="Core Atoms" value="14" />
              <StatBlock label="Molecules" value="06" />
              <StatBlock label="Token Count" value="124" />
              <StatBlock label="Performance" value="99ms" />
           </div>
        </div>
      </section>

    </div>
  )
}

function StatBlock({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
       <span className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-widest leading-none">{label}</span>
       <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[#F5F5F5] leading-none">{value}</span>
          <span className="w-1 h-1 bg-[#A3E635] rounded-full animate-pulse" />
       </div>
    </div>
  )
}
