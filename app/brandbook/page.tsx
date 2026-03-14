'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const cosmos = 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #3B82F6 100%)'

const sections = [
  { index: '01', title: 'Guidelines', description: 'Princípios, identidade e voz do sistema.', href: '/brandbook/guidelines' },
  { index: '02', title: 'Foundations', description: 'Tokens: cores, tipografia, espaçamento, motion.', href: '/brandbook/foundations' },
  { index: '03', title: 'Components', description: 'Átomos, moléculas e organismos documentados.', href: '/brandbook/components' },
  { index: '04', title: 'Motion', description: 'Presets de animação e lógica cinética.', href: '/brandbook/motion' },
]

export default function BrandbookLandingPage() {
  return (
    <div className="min-h-screen py-24 px-12 md:px-20 max-w-6xl mx-auto">

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 mb-12"
      >
        <span className="font-mono text-xs font-bold tracking-[0.25em] text-[#A855F7]">[00]</span>
        <div className="h-px w-6" style={{ background: '#A855F7' }} />
        <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#4A4A4A]">Design System & Identity</span>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-20"
      >
        <h1 className="text-[clamp(3.5rem,10vw,7rem)] font-black tracking-[-0.04em] leading-[0.88] mb-8">
          <span className="text-[#F5F5F5]">THE </span>
          <span className="text-[#2A2A2A]">[</span>
          <span className="text-[#F5F5F5]">DASHBOARD</span>
          <span className="text-[#2A2A2A]">]</span>
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: cosmos }}
          >
            DESIGN SYSTEM.
          </span>
        </h1>

        <p className="text-lg text-[#8A8A8A] max-w-xl leading-relaxed">
          <span className="text-[#F5F5F5] font-medium">Apple Clean</span> encontra{' '}
          <span className="text-[#F5F5F5] font-medium">Psychedelic Math.</span>{' '}
          Um sistema construído para dashboards técnicos de alta densidade de informação.
        </p>
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-[#1A1A1A] mb-16" />

      {/* Nav Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1A1A1A]">
        {sections.map((section, i) => (
          <motion.div
            key={section.index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
          >
            <Link
              href={section.href}
              className="group block p-10 bg-black hover:bg-[#0A0A0A] transition-colors"
            >
              <div className="flex items-start justify-between mb-8">
                <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#4A4A4A] group-hover:text-[#A855F7] transition-colors">
                  [{section.index}]
                </span>
                <span className="text-[#262626] group-hover:text-[#A855F7] transition-colors text-sm">→</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-[#F5F5F5] mb-3">
                {section.title}
              </h3>
              <p className="text-sm text-[#4A4A4A] group-hover:text-[#8A8A8A] transition-colors leading-relaxed">
                {section.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer stat bar */}
      <div className="mt-px bg-[#1A1A1A]">
        <div className="grid grid-cols-3 divide-x divide-[#1A1A1A] bg-[#050505]">
          {[
            { label: 'Atoms', value: '12' },
            { label: 'Tokens', value: '80+' },
            { label: 'Branch', value: 'v2' },
          ].map((stat) => (
            <div key={stat.label} className="px-8 py-5 flex items-baseline gap-3">
              <span className="font-mono text-xl font-bold text-[#F5F5F5]">{stat.value}</span>
              <span className="text-xs text-[#4A4A4A] tracking-wider uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
