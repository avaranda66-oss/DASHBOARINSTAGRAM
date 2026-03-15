'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

const TRANSITIONS = [
  { name: 'Standard Fade', desc: 'Opacity transition for appearing elements.', tech: 'Duration: 300ms | Ease: Out' },
  { name: 'Slide & Bloom', desc: 'Entrance for data cards and KPI nodes.', tech: 'Duration: 350ms | Offset: 12px' },
  { name: 'Micro-Bounce', desc: 'Tactile response for buttons and triggers.', tech: 'Scale: 0.98 | Ease: Instant' },
]

export default function MotionPage() {
  return (
    <div className="relative min-h-screen py-24 px-12 md:px-20 max-w-6xl mx-auto space-y-32 mb-32">
      
      {/* Header */}
      <header className="space-y-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-[#A3E635]"
        >
          <span className="font-mono text-xs font-bold tracking-[0.25em]">[04]</span>
          <div className="h-px w-6 bg-[#A3E635]" />
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#4A4A4A]">Kinetic Logic</span>
        </motion.div>

        <h1 className="text-[clamp(3rem,6vw,5rem)] font-black tracking-[-0.04em] leading-[0.9]">
          <span className="text-[#F5F5F5]">MOTION </span>
          <span className="text-[#A3E635]">SYSTEM.</span>
        </h1>
        <p className="text-xl text-[#8A8A8A] max-w-2xl leading-relaxed">
          The choreography of precision. Defining momentum, friction, and mathematical easing for the HUD experience.
        </p>
      </header>

      {/* Section: Core Easing */}
      <section className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">The Constant of Easing</h2>
            <p className="text-sm text-[#8A8A8A] leading-relaxed">
              We use a modified cubic-bezier function for almost all transitions. This ensures that every 
              motion feels natural yet engineered, avoiding linear mechanical movement.
            </p>
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#141414] font-mono text-[11px] text-[#A3E635]">
               cubic-bezier(0.16, 1, 0.3, 1)
            </div>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="font-mono text-[#A3E635] text-sm shrink-0 mt-0.5 select-none">◆</span>
                <div className="space-y-1">
                   <p className="text-sm font-bold text-[#F5F5F5]">Balanced Mass</p>
                   <p className="text-xs text-[#4A4A4A]">Elements accelerate quickly and decelerate smoothly.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="font-mono text-[#A3E635] text-sm shrink-0 mt-0.5 select-none">◆</span>
                <div className="space-y-1">
                   <p className="text-sm font-bold text-[#F5F5F5]">Responsive Delay</p>
                   <p className="text-xs text-[#4A4A4A]">Staggered entrances create a hierarchical "build-up" effect.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Interactive Playground/Visualization */}
          <div className="aspect-video bg-[#050505] border border-[#141414] rounded-2xl flex flex-col items-center justify-center gap-8 relative overflow-hidden group">
             <motion.div 
               animate={{ y: [0, -40, 0] }}
               transition={{ repeat: Infinity, duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
               className="w-16 h-16 border-2 border-[#A3E635] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.1)]"
             >
                <span className="font-mono text-[#A3E635] text-xl select-none leading-none">▶</span>
             </motion.div>
             <span className="font-mono text-[10px] text-[#4A4A4A] tracking-widest uppercase">Kinetics Preview</span>
             <div className="absolute inset-0 bg-gradient-to-t from-[#A3E635]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </section>

      {/* Section: Presets */}
      <section className="space-y-12 pb-16">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[01]</span>
          <h2 className="text-3xl font-bold tracking-tight">Animation Presets</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRANSITIONS.map((t) => (
            <motion.div 
              key={t.name}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl bg-[#0A0A0A] border border-[#141414] hover:border-[#A3E635]/30 transition-all space-y-4"
            >
              <h4 className="font-bold text-[#F5F5F5]">{t.name}</h4>
              <p className="text-xs text-[#8A8A8A] leading-relaxed">{t.desc}</p>
              <div className="pt-4 flex flex-col gap-1 border-t border-[#141414]">
                 <p className="text-[9px] font-mono text-[#4A4A4A] uppercase tracking-wider">{t.tech}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  )
}
