'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { semantic } from '@/design-system/tokens/colors'
import { Badge } from '@/design-system/atoms'

export default function GuidelinesPage() {
  return (
    <div className="relative min-h-screen py-24 px-12 md:px-20 max-w-6xl mx-auto space-y-32 mb-32">
      
      {/* Structural Grid Decor (Background) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
           style={{ backgroundImage: `linear-gradient(to right, ${semantic.border.default} 1px, transparent 1px)`, backgroundSize: '100px 100%' }} />

      {/* Header */}
      <header className="space-y-8 relative">
        <div className="flex items-center gap-3 text-[#A3E635]">
          <span className="font-mono text-[10px] font-bold tracking-[0.25em]">[00]</span>
          <div className="h-px w-6 bg-[#A3E635]" />
          <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-[#4A4A4A]">Standard Operations</span>
        </div>

        <h1 className="text-[clamp(3.5rem,7vw,6rem)] font-black tracking-[-0.04em] leading-[0.9] text-[#F5F5F5]">
          DESIGN SYSTEM<br />
          <span className="text-[#A3E635]">GUIDELINES.</span>
        </h1>
      </header>

      {/* [01] Princípios */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[01]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Princípios de Identidade</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PrincipleCard 
            title="Zero IA Aesthetic"
            desc="Fugimos de gradientes arco-íris e sombras 'mágicas'. Nosso design é brutalista, técnico e baseado em grids reais."
          />
          <PrincipleCard 
            title="Equipe Grande"
            desc="O sistema é feito para escala. Tokens semânticos garantem que qualquer desenvolvedor mantenha a consistência sem adivinhar cores."
          />
          <PrincipleCard 
            title="Restrained Neon"
            desc="Cor é função. O Neon (Solar Green) é usado apenas para triggers de ação e estados ativos. O resto é absoluto black."
          />
        </div>
      </section>

      {/* [02] Anti-padrões */}
      <section className="space-y-12 pt-24 border-t border-[#141414]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[02]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Anti-padrões (NÃO FAZER)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h4 className="font-mono text-[10px] text-[#EF4444] uppercase tracking-widest">Incorreto</h4>
            <div className="p-10 bg-black border border-[#EF4444]/20 rounded-2xl flex flex-col items-center gap-4 group">
               <div className="w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full" />
               <p className="text-xs text-[#4A4A4A] italic text-center">"Não use gradientes multi-coloridos de IA em bordas ou divisores."</p>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-mono text-[10px] text-[#A3E635] uppercase tracking-widest">Correto</h4>
            <div className="p-10 bg-black border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col items-center gap-4">
               <div className="w-full h-px bg-[rgba(255,255,255,0.12)]" />
               <p className="text-xs text-[#8A8A8A] text-center uppercase tracking-tighter">Use bordas RGBA Hairline para profundidade estrutural.</p>
            </div>
          </div>
        </div>
      </section>

      {/* [03] Tokens */}
      <section className="space-y-12 pt-24 border-t border-[#141414]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[03]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Uso de Tokens</h2>
        </div>

        <div className="bg-[#050505] border border-[rgba(255,255,255,0.04)] rounded-2xl p-8 space-y-6">
          <p className="text-sm text-[#8A8A8A] leading-relaxed">
            Sempre importe <code className="text-[#A3E635]">semantic</code> para UI. <code className="text-[#4A4A4A]">primitive</code> é apenas para definição interna.
          </p>
          <div className="p-6 rounded-xl bg-black border border-[#141414] font-mono text-[11px] text-[#65A30D]">
            <span className="text-[#4A4A4A]">// Certo</span><br />
            import {'{'} semantic {'}'} from '@/design-system/tokens/colors'<br />
            color: semantic.text.primary<br /><br />
            <span className="text-[#EF4444]">// Errado</span><br />
            color: primitive.gray[950]
          </div>
        </div>
      </section>

      {/* [04] Anatomia de Componente */}
      <section className="space-y-12 pt-24 border-t border-[#141414]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold text-[#A3E635] tracking-[0.2em]">[04]</span>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Anatomia de Componente</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h4 className="text-lg font-bold">Variáveis de Estado</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="solid" intent="default">Idle</Badge>
              <Badge variant="outline" intent="default">Hover</Badge>
              <Badge variant="outline" intent="default">Active</Badge>
              <Badge variant="outline" intent="default">Focus</Badge>
              <Badge variant="solid" intent="error">Error</Badge>
              <Badge variant="solid" intent="success">Done</Badge>
              <Badge variant="subtle" intent="default">Loading</Badge>
              <Badge variant="subtle" intent="info">Disabled</Badge>
            </div>
            <p className="text-xs text-[#4A4A4A] leading-relaxed">
              Cada componente deve prever todos os 8 estados fundamentais para garantir feedback tátil e precisão técnica.
            </p>
          </div>
          <div className="p-8 bg-[#050505] border border-[#141414] rounded-2xl flex flex-col gap-4">
             <div className="flex justify-between items-center text-[10px] font-mono text-[#4A4A4A] uppercase">
                <span>Prop Type</span>
                <span>Values</span>
             </div>
             <div className="h-px bg-[#141414]" />
             <AnatomyRow label="Variant" value="Solid | Outline | Subtle" />
             <AnatomyRow label="Size" value="SM | MD | LG" />
             <AnatomyRow label="Intent" value="Default | Success | Warning | Error" />
          </div>
        </div>
      </section>

    </div>
  )
}

function PrincipleCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-4 p-8 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-2xl hover:border-[#A3E635]/20 transition-all">
       <span className="font-mono text-[#A3E635] text-sm shrink-0 select-none">◆</span>
       <h4 className="text-lg font-bold text-[#F5F5F5]">{title}</h4>
       <p className="text-xs text-[#4A4A4A] leading-relaxed">{desc}</p>
    </div>
  )
}

function AnatomyRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-[11px] text-[#8A8A8A] uppercase font-bold">{label}</span>
      <span className="text-[10px] text-[#A3E635] font-mono">{value}</span>
    </div>
  )
}
