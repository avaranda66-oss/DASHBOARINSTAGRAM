'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/design-system/utils/cn'
import { semantic } from '@/design-system/tokens/colors'

// --- Sidebar Menu ---
const MENU_ITEMS = [
  { id: 'guidelines', label: 'Guidelines', index: '01', href: '/brandbook/guidelines' },
  { id: 'foundations', label: 'Foundations', index: '02', href: '/brandbook/foundations' },
  { id: 'components', label: 'Components', index: '03', href: '/brandbook/components' },
  { id: 'motion', label: 'Motion', index: '04', href: '/brandbook/motion' },
]

export default function BrandbookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-[#000000] text-[#F5F5F5] selection:bg-[#A3E635]/30 overflow-hidden font-display">
      
      {/* ─── HUD OVERLAY PANELS ─── */}
      
      {/* 1. Global Vertical Grid (Architectural Rhythm) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03]">
        <div className="flex h-full w-full justify-between px-64">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="h-full w-px bg-white border-r border-[#A3E635]/20" />
           ))}
        </div>
      </div>

      {/* 2. HUD Scanline & Noise */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.015] mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      {/* 3. Corner Context Tags (Industrial Metadata) */}
      <div className="fixed top-6 right-8 z-[60] flex items-center gap-4 select-none">
         <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-[9px] text-[#4A4A4A] leading-none uppercase tracking-widest">System Architecture</span>
            <span className="font-mono text-[10px] text-[#A3E635] leading-none font-bold">V2.5.0 // BLUEPRINT</span>
         </div>
         <div className="w-10 h-10 border border-[#141414] bg-black flex items-center justify-center relative">
            <div className="absolute inset-2 border border-[#A3E635]/20 animate-pulse" />
            <span className="font-mono text-[10px] text-[#A3E635] font-black">◆</span>
         </div>
      </div>

      {/* ─── CORE SHELL ─── */}

      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-[#141414] bg-[#050505] flex flex-col z-50">
        
        {/* Header Decorator (Measurement) */}
        <div className="absolute -right-4 top-24 pointer-events-none select-none">
           <span className="font-mono text-[8px] text-[#2A2A2A] rotate-90 block">MEASUREMENT_AXIS_X [256PX]</span>
        </div>

        {/* Logo/Header */}
        <div className="p-8 border-b border-[#141414]">
          <Link href="/brandbook" className="flex items-center gap-2 group">
            <span className="font-mono text-[#A3E635] text-base font-black leading-none select-none group-hover:scale-110 transition-transform">◆</span>
            <span className="font-bold tracking-tight text-sm uppercase">Brandbook</span>
          </Link>
          <div className="mt-2 flex items-center gap-1.5 opacity-40">
            <span className="text-[9px] font-mono tracking-widest uppercase italic">Industrial HUD Core</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <Link 
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-white/5 transition-all group mb-4 border border-transparent"
          >
             <span className="font-mono text-[10px] tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-[#A3E635] select-none">[RT]</span>
            <span className="font-medium">App Dashboard</span>
          </Link>

          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-[0.2em]">Documentation</span>
            <div className="h-px flex-1 bg-[#141414] ml-3" />
          </div>

          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all group border border-transparent",
                  isActive 
                    ? "bg-[#A3E635]/5 text-[#A3E635] border-[#A3E635]/10" 
                    : "text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-white/5 hover:border-[#141414]"
                )}
              >
                <span className={cn(
                  "font-mono text-[10px] tracking-widest transition-colors select-none",
                  isActive ? "text-[#A3E635]" : "text-[#4A4A4A] group-hover:text-[#8A8A8A]"
                )}>
                  [{item.index}]
                </span>
                <span className="font-medium tracking-tight">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="ml-auto"
                  >
                    <div className="w-1 h-1 rounded-full bg-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                  </motion.div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-8 border-t border-[#141414]">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono text-[#3A3A3A] leading-tight uppercase tracking-tighter">
               Coordinate_Ref: 24.845.A<br />
               Dashboard OSS © 2026
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 pl-64 min-h-screen relative z-10 overflow-auto">
        {children}
      </main>
    </div>
  )
}
