'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { semantic } from '@/design-system/tokens/colors'

// ─── Token Documentation Data ─────────────────────────────────────────────────

const BG_TOKENS = [
  { token: 'semantic.bg.base',     hex: '#000000', label: 'Base',     usage: 'Fundo void — zero profundidade' },
  { token: 'semantic.bg.subtle',   hex: '#050505', label: 'Subtle',   usage: 'Página, layout geral' },
  { token: 'semantic.bg.surface',  hex: '#0A0A0A', label: 'Surface',  usage: 'Cards em repouso' },
  { token: 'semantic.bg.elevated', hex: '#141414', label: 'Elevated', usage: 'Painéis, tooltips' },
  { token: 'semantic.bg.overlay',  hex: '#1E1E1E', label: 'Overlay',  usage: 'Dropdowns, modais' },
]

const BORDER_TOKENS = [
  { token: 'semantic.border.hairline', value: 'rgba(255,255,255,0.04)', label: 'Hairline', usage: 'Divisores sutis' },
  { token: 'semantic.border.subtle',   value: 'rgba(255,255,255,0.08)', label: 'Subtle',   usage: 'Cards em repouso' },
  { token: 'semantic.border.default',  value: 'rgba(255,255,255,0.12)', label: 'Default',  usage: 'Elementos interativos' },
  { token: 'semantic.border.strong',   value: 'rgba(255,255,255,0.20)', label: 'Strong',   usage: 'Focus ring, ênfase' },
]

const TEXT_TOKENS = [
  { token: 'semantic.text.primary',   hex: '#F5F5F5', label: 'Primary',   usage: 'Texto principal, headings' },
  { token: 'semantic.text.secondary', hex: '#8A8A8A', label: 'Secondary',  usage: 'Metadados, descrições' },
  { token: 'semantic.text.muted',     hex: '#4A4A4A', label: 'Muted',      usage: 'Labels, placeholders' },
  { token: 'semantic.text.disabled',  hex: '#3A3A3A', label: 'Disabled',   usage: 'Estados desabilitados' },
]

const TYPOGRAPHY_SCALE = [
  { label: '5xl / Display',   size: '56px', weight: '900', tracking: '-0.04em', lh: '0.88', face: 'Inter',          usage: 'Hero, landing' },
  { label: '3xl / Page',      size: '34px', weight: '700', tracking: '-0.03em', lh: '1.1',  face: 'Inter',          usage: 'Page titles' },
  { label: '2xl / Section',   size: '28px', weight: '600', tracking: '-0.02em', lh: '1.25', face: 'Inter',          usage: 'Section titles' },
  { label: 'xl / Card',       size: '22px', weight: '600', tracking: '-0.02em', lh: '1.25', face: 'Inter',          usage: 'Card titles' },
  { label: 'base / Body',     size: '16px', weight: '400', tracking: '0em',     lh: '1.5',  face: 'Inter',          usage: 'Body text' },
  { label: 'sm / Compact',    size: '14px', weight: '400', tracking: '0em',     lh: '1.4',  face: 'Inter',          usage: 'Tables, dense UI' },
  { label: '4xl / Metric',    size: '44px', weight: '700', tracking: '-0.04em', lh: '1',    face: 'JetBrains Mono', usage: 'KPIs, métricas' },
  { label: 'xs / Label',      size: '12px', weight: '500', tracking: '0.06em',  lh: '1.25', face: 'Inter',          usage: 'Labels UPPERCASE' },
  { label: '2xs / Badge',     size: '11px', weight: '600', tracking: '0.10em',  lh: '1',    face: 'Inter',          usage: 'Badges UPPERCASE' },
]

const RADIUS_TOKENS = [
  { token: 'radiusAlias.control', value: '4px',    usage: 'Checkboxes, toggles' },
  { token: 'radiusAlias.badge',   value: '6px',    usage: 'Badges, chips, tags' },
  { token: 'radiusAlias.input',   value: '8px',    usage: 'Inputs, selects, cards' },
  { token: 'radiusAlias.panel',   value: '12px',   usage: 'Painéis, dropdowns' },
  { token: 'radiusAlias.modal',   value: '16px',   usage: 'Modais, sheets' },
  { token: 'radiusAlias.avatar',  value: '9999px', usage: 'Avatars, pills, dots' },
]

export default function FoundationsPage() {
  return (
    <div className="relative min-h-screen py-24 px-12 md:px-20 max-w-6xl mx-auto space-y-32 mb-32">

      {/* Header */}
      <header className="space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-[#A3E635]"
        >
          <span className="font-mono text-xs font-bold tracking-[0.25em]">[02]</span>
          <div className="h-px w-6 bg-[#A3E635]" />
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#4A4A4A]">Foundations</span>
        </motion.div>

        <h1 className="text-[clamp(3rem,6vw,5rem)] font-black tracking-[-0.04em] leading-[0.9]">
          <span className="text-[#F5F5F5]">THE CORE </span>
          <span className="text-[#A3E635]">ELEMENTS.</span>
        </h1>
        <p className="text-base text-[#8A8A8A] max-w-2xl leading-relaxed">
          Tokens, escala tipográfica e sistema de espaçamento. A infraestrutura que garante consistência em todo o produto.
        </p>
      </header>

      {/* ─── Color System ─────────────────────────────────────────────────────── */}
      <section className="space-y-12 pt-12 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <SectionHeader index="01" title="Color System" />

        {/* Action / Accent */}
        <div className="space-y-3">
          <TokenGroupLabel>Action — Accent Solar</TokenGroupLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TokenSwatch color="#A3E635" token="semantic.action.primary" label="Primary" />
            <TokenSwatch color="#84CC16" token="semantic.action.primaryHover" label="Hover" />
            <TokenSwatch color="rgba(163,230,53,0.08)" token="semantic.action.primarySubtle" label="Subtle" bordered />
          </div>
        </div>

        {/* Backgrounds */}
        <div className="space-y-3">
          <TokenGroupLabel>Background Scale — 5 níveis de profundidade</TokenGroupLabel>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {BG_TOKENS.map(({ token, hex, label, usage }) => (
              <div key={token} className="space-y-2">
                <div
                  className="h-14 w-full rounded-lg border"
                  style={{ backgroundColor: hex, borderColor: 'rgba(255,255,255,0.08)' }}
                />
                <div>
                  <p className="text-[10px] font-bold text-[#F5F5F5] uppercase tracking-wider">{label}</p>
                  <p className="text-[9px] font-mono text-[#4A4A4A]">{hex}</p>
                  <p className="text-[9px] text-[#3A3A3A] mt-1">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Borders */}
        <div className="space-y-3">
          <TokenGroupLabel>Border Scale — rgba com opacidade (nunca hex sólido)</TokenGroupLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BORDER_TOKENS.map(({ token, value, label, usage }) => (
              <div key={token} className="space-y-2">
                <div
                  className="h-14 w-full rounded-lg bg-[#0A0A0A] border-2"
                  style={{ borderColor: value }}
                />
                <div>
                  <p className="text-[10px] font-bold text-[#F5F5F5] uppercase tracking-wider">{label}</p>
                  <p className="text-[9px] font-mono text-[#4A4A4A] break-all">{value}</p>
                  <p className="text-[9px] text-[#3A3A3A] mt-1">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <TokenGroupLabel>Text Scale</TokenGroupLabel>
          <div className="space-y-px border rounded-lg overflow-hidden bg-[#050505]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {TEXT_TOKENS.map(({ token, hex, label, usage }) => (
              <div key={token} className="flex items-center gap-6 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="w-4 h-4 rounded-full border shrink-0" style={{ backgroundColor: hex, borderColor: 'rgba(255,255,255,0.08)' }} />
                <span className="text-sm font-medium w-24 shrink-0" style={{ color: hex }}>{label}</span>
                <span className="font-mono text-[10px] text-[#4A4A4A] w-40 shrink-0">{token}</span>
                <span className="font-mono text-[10px] text-[#3A3A3A]">{hex}</span>
                <span className="text-[10px] text-[#4A4A4A] ml-auto">{usage}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Typography ───────────────────────────────────────────────────────── */}
      <section className="space-y-12 pt-12 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <SectionHeader index="02" title="Typography Scale" />
        <p className="text-sm text-[#8A8A8A]">
          Major Third (×1.25) ancorada em 14px. <span className="font-mono text-[#4A4A4A]">JetBrains Mono</span> obrigatório em qualquer elemento com número.
        </p>

        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <table className="w-full text-left">
            <thead className="bg-[#0A0A0A]">
              <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <th className="px-6 py-3 text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-[0.12em]">Scale</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-[0.12em]">Size / Weight</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-[0.12em]">Font</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-[0.12em]">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-[#050505]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {TYPOGRAPHY_SCALE.map((item) => (
                <tr key={item.label} className="group hover:bg-white/[0.015] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-[#8A8A8A]">{item.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-[#F5F5F5]">{item.size} / {item.weight}</span>
                      <span className="text-[9px] font-mono text-[#4A4A4A]">tracking {item.tracking}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono" style={{ color: item.face.includes('Mono') ? '#A3E635' : '#8A8A8A' }}>
                      {item.face.includes('Mono') ? 'Mono' : 'Inter'}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs overflow-hidden">
                    <span
                      className="text-[#F5F5F5] truncate block"
                      style={{
                        fontSize: `min(${item.size}, 22px)`,
                        fontWeight: item.weight,
                        letterSpacing: item.tracking,
                        lineHeight: item.lh,
                        fontFamily: item.face.includes('Mono') ? 'var(--font-mono)' : 'var(--font-display)',
                      }}
                    >
                      {item.face.includes('Mono') ? '1,234,567.89' : item.usage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Spacing & Radius ─────────────────────────────────────────────────── */}
      <section className="space-y-12 pt-12 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <SectionHeader index="03" title="Spacing & Radius" />

        <div className="space-y-3">
          <TokenGroupLabel>Radius — hierarquia semântica</TokenGroupLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {RADIUS_TOKENS.map(({ token, value, usage }) => {
              const [, alias] = token.split('.')
              return (
                <div
                  key={token}
                  className="p-6 bg-[#0A0A0A] border flex items-start gap-4"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', borderRadius: value === '9999px' ? '12px' : value }}
                >
                  <div
                    className="w-12 h-12 shrink-0 border"
                    style={{
                      borderColor: '#A3E635',
                      borderRadius: value,
                      background: 'rgba(163,230,53,0.04)',
                    }}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#F5F5F5] capitalize">{alias}</p>
                    <p className="font-mono text-[10px] text-[#A3E635]">{value}</p>
                    <p className="text-[10px] text-[#4A4A4A] mt-1">{usage}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4px base grid */}
        <div className="space-y-3">
          <TokenGroupLabel>Base Unit — 4px grid</TokenGroupLabel>
          <div className="flex items-end gap-2 p-8 bg-[#050505] border rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div
                  className="w-6"
                  style={{ height: `${n * 4}px`, background: n <= 4 ? 'rgba(163,230,53,0.6)' : 'rgba(163,230,53,0.2)' }}
                />
                <span className="font-mono text-[9px] text-[#4A4A4A]">{n * 4}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[{index}]</span>
      <h2 className="text-2xl font-bold tracking-tight text-[#F5F5F5]">{title}</h2>
    </div>
  )
}

function TokenGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-[0.15em]">{children}</p>
  )
}

function TokenSwatch({ color, token, label, bordered }: { color: string; token: string; label: string; bordered?: boolean }) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 w-full rounded-lg border"
        style={{
          backgroundColor: color,
          borderColor: bordered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        }}
      />
      <div>
        <p className="text-[10px] font-bold text-[#F5F5F5] uppercase tracking-wider">{label}</p>
        <p className="text-[9px] font-mono text-[#4A4A4A] break-all">{token}</p>
      </div>
    </div>
  )
}
