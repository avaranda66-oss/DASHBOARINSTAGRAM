'use client'

import * as React from 'react'
import { Button } from '@ds/atoms'
import { Plus, Trash, Check, Info, Command } from 'lucide-react'

export default function DesignSystemPreviewPage() {
  const [loading, setLoading] = React.useState(false)

  return (
    <div className="min-h-screen bg-black text-[#F5F5F5] p-12 space-y-16 selection:bg-[#A855F7]/30">
      <section className="max-w-6xl mx-auto space-y-12">
        <header className="border-b border-[#262626] pb-8">
          <div className="flex items-center gap-3 mb-2 text-[#A855F7]">
            <Command className="w-5 h-5" />
            <span className="text-xs font-medium tracking-widest uppercase">Design System — v2</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Button Atom</h1>
          <p className="text-[#8A8A8A] mt-2 text-lg">A versatile, interactive button component built for the Instagram Dashboard OSS.</p>
        </header>

        {/* Variants & Intents */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium">Variants & Intents</h2>
            <div className="h-px flex-1 bg-[#262626]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Solid */}
            <div className="space-y-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A] transition-colors hover:border-[#3A3A3A]">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[#F5F5F5]">Solid</h3>
                <p className="text-xs text-[#8A8A8A]">High emphasis components.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button intent="default">Primary Action</Button>
                <Button intent="success">Success Action</Button>
                <Button intent="error">Critical Action</Button>
                <Button intent="info">Info Action</Button>
              </div>
            </div>

            {/* Outline */}
            <div className="space-y-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A] transition-colors hover:border-[#3A3A3A]">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[#F5F5F5]">Outline</h3>
                <p className="text-xs text-[#8A8A8A]">Medium emphasis components.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" intent="default">Outline Action</Button>
                <Button variant="outline" intent="success">Success Outline</Button>
                <Button variant="outline" intent="error">Error Outline</Button>
              </div>
            </div>

            {/* Ghost */}
            <div className="space-y-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A] transition-colors hover:border-[#3A3A3A]">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[#F5F5F5]">Ghost</h3>
                <p className="text-xs text-[#8A8A8A]">Low emphasis components.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" intent="default">Ghost Action</Button>
                <Button variant="ghost" intent="success">Success Ghost</Button>
                <Button variant="ghost" intent="error">Error Ghost</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium">Size Variations</h2>
            <div className="h-px flex-1 bg-[#262626]" />
          </div>
          <div className="flex items-end gap-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A]">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-[#4A4A4A] uppercase tracking-widest font-medium">Small</span>
              <Button size="sm">Button SM</Button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-[#4A4A4A] uppercase tracking-widest font-medium">Medium</span>
              <Button size="md">Button MD</Button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-[#4A4A4A] uppercase tracking-widest font-medium">Large</span>
              <Button size="lg">Button LG</Button>
            </div>
          </div>
        </div>

        {/* States & Icons */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium">States & Enhancements</h2>
            <div className="h-px flex-1 bg-[#262626]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#F5F5F5]">Interactive States</h3>
              <div className="flex flex-wrap gap-4">
                <Button disabled>Disabled State</Button>
                <Button isLoading>Initial Load</Button>
                <Button 
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 2000)
                  }}
                  isLoading={loading}
                  variant="outline"
                  intent="default"
                >
                  {loading ? 'Processing...' : 'Dynamic Loading'}
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-8 border border-[#262626] rounded-2xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#F5F5F5]">Icon Integration</h3>
              <div className="flex flex-wrap gap-4">
                <Button leftIcon={<Plus className="w-4 h-4" />}>New Post</Button>
                <Button variant="outline" rightIcon={<Check className="w-4 h-4" />}>Save Changes</Button>
                <Button variant="ghost" intent="error" leftIcon={<Trash className="w-4 h-4" />}>Delete</Button>
                <Button variant="outline" intent="info" leftIcon={<Info className="w-4 h-4" />}>View Details</Button>
              </div>
            </div>
          </div>
        </div>

        <footer className="pt-12 border-t border-[#262626] text-center text-[#4A4A4A]">
          <p className="text-xs uppercase tracking-[0.2em] font-medium">
            Proprietary Design System • Dashboard OSS
          </p>
        </footer>
      </section>
    </div>
  )
}
