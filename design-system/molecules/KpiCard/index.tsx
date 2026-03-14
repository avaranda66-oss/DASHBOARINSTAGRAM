'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/design-system/utils/cn'

export interface KpiCardProps {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
  sparkline?: number[]
  prefix?: string
  isLoading?: boolean
  accentTop?: boolean
  className?: string
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  sparkline,
  prefix = '',
  isLoading = false,
  accentTop = true,
  className,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0
  const isNegative = delta !== undefined && delta < 0
  const isNeutral = delta === undefined || delta === 0

  // Sparkline Logic
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null

    const min = Math.min(...sparkline)
    const max = Math.max(...sparkline)
    const range = max - min || 1
    
    // Normalize points: x maps to 0-80, y maps to 22-2
    const points = sparkline.map((v, i) => {
      const x = (i / (sparkline.length - 1)) * 80
      const y = 22 - ((v - min) / range) * 20
      return `${x},${y}`
    }).join(' ')

    const strokeColor = isPositive ? '#10B981' : isNegative ? '#EF4444' : '#4A4A4A'
    const lastPoint = sparkline[sparkline.length - 1]
    const lastY = 22 - ((lastPoint - min) / range) * 20

    return (
      <svg 
        width="80" 
        height="24" 
        viewBox="0 0 80 24" 
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="80" cy={lastY} r="2" fill="#A3E635" />
      </svg>
    )
  }

  return (
    <div
      className={cn(
        'relative bg-[#0A0A0A] border rounded-[8px] p-6 flex flex-col gap-6 overflow-hidden',
        className
      )}
      style={{
        background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: accentTop ? '2px solid rgba(163,230,53,0.35)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        boxShadow: isPositive ? '0 0 0 1px rgba(163,230,53,0.06)' : 'none',
        transition: 'box-shadow 200ms',
      }}
    >
      {/* Label */}
      <h3 className="font-body text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] select-none">
        {label}
      </h3>

      {/* Main Content */}
      <div className="flex flex-col gap-2 min-h-[4.5rem] justify-center">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="h-[2.75rem] w-[60%] bg-white/5 animate-pulse rounded" />
              <div className="h-[1.125rem] w-[40%] bg-white/5 animate-pulse rounded" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2"
            >
              {/* Value */}
              <div className="font-mono font-bold text-[2.75rem] tracking-[-0.04em] leading-none text-[#F5F5F5]">
                {prefix}{value}
              </div>

              {/* Delta & Sparkline Row */}
              <div className="flex items-center justify-between gap-4 mt-1">
                <div className="flex items-center gap-2 select-none">
                  <span
                    className={cn(
                      'font-mono text-xs',
                      isPositive && 'text-[#10B981]',
                      isNegative && 'text-[#EF4444]',
                      isNeutral && 'text-[#8A8A8A]'
                    )}
                  >
                    {isPositive && `↑ +${delta}%`}
                    {isNegative && `↓ ${delta}%`}
                    {isNeutral && '—'}
                  </span>
                  {deltaLabel && !isNeutral && (
                    <span className="text-[10px] text-[#4A4A4A] font-body uppercase tracking-[0.05em]">
                      {deltaLabel}
                    </span>
                  )}
                </div>
                
                {/* Mini-chart */}
                {renderSparkline()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
