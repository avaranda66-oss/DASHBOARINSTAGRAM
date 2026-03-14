'use client'

import * as React from 'react'
import { Button } from '@ds/atoms'
import { Plus, Trash, Check, Loader2, Info } from 'lucide-react'

export default function DesignSystemPreviewPage() {
  const [loading, setLoading] = React.useState(false)

  return (
    <div className="min-h-screen bg-black text-[#F5F5F5] p-12 space-y-16">
      <section className="space-y-8">
        <header className="border-b border-[#262626] pb-4">
          <h1 className="text-3xl font-semibold tracking-tight">Button Atom Preview</h1>
          <p className="text-[#8A8A8A] mt-2">Testing all variants, sizes, and states of the Button component.</p>
        </header>

        {/* Variants & Intents */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium">Variants</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#8A8A8A] uppercase tracking-wider">Solid (Default)</h3>
              <div className="flex flex-wrap gap-4">
                <Button intent="default">Primary</Button>
                <Button intent="success">Success</Button>
                <Button intent="error">Error</Button>
                <Button intent="info">Info</Button>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#8A8A8A] uppercase tracking-wider">Outline</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" intent="default">Outline</Button>
                <Button variant="outline" intent="success">Success</Button>
                <Button variant="outline" intent="error">Error</Button>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#8A8A8A] uppercase tracking-wider">Ghost</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="ghost" intent="default">Ghost</Button>
                <Button variant="ghost" intent="success">Success</Button>
                <Button variant="ghost" intent="error">Error</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium">Sizes</h2>
          <div className="flex items-end gap-6 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
            <Button size="sm">Small (sm)</Button>
            <Button size="md">Medium (md)</Button>
            <Button size="lg">Large (lg)</Button>
          </div>
        </div>

        {/* States & Icons */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium">States & Icons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#8A8A8A] uppercase tracking-wider">Interactions</h3>
              <div className="flex flex-wrap gap-4">
                <Button disabled>Disabled</Button>
                <Button isLoading>Loading State</Button>
                <Button 
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 2000)
                  }}
                  isLoading={loading}
                >
                  {loading ? 'Processing...' : 'Click to Load'}
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-[#262626] rounded-xl bg-[#0A0A0A]">
              <h3 className="text-sm font-medium text-[#8A8A8A] uppercase tracking-wider">With Icons</h3>
              <div className="flex flex-wrap gap-4">
                <Button leftIcon={<Plus className="w-4 h-4" />}>Add Item</Button>
                <Button variant="outline" rightIcon={<Check className="w-4 h-4" />}>Confirm</Button>
                <Button variant="ghost" intent="error" leftIcon={<Trash className="w-4 h-4" />}>Delete</Button>
                <Button variant="outline" intent="info" leftIcon={<Info className="w-4 h-4" />}>Details</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
