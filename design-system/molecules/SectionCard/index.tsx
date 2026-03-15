'use client'

import * as React from 'react'
import { cn } from '@/design-system/utils/cn'

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional section header label — rendered as 10px uppercase mono */
  title?: string
  /** Optional right-side slot in the header row */
  headerRight?: React.ReactNode
  /** Padding preset: 'default' = p-5, 'compact' = p-4, 'none' = no padding */
  padding?: 'default' | 'compact' | 'none'
  /** Optional 2px green top border accent */
  accentTop?: boolean
  children: React.ReactNode
}

/**
 * SectionCard — standard surface container for dashboard panels.
 *
 * Token values (from design-system/CONTEXT.md):
 *   background  → #0A0A0A  (semantic.bg.surface)
 *   border      → rgba(255,255,255,0.08)  (semantic.border.subtle)
 *   radius      → 8px
 */
export function SectionCard({
  title,
  headerRight,
  padding = 'default',
  accentTop,
  children,
  className,
  ...props
}: SectionCardProps) {
  const paddingClass =
    padding === 'default' ? 'p-5' :
    padding === 'compact' ? 'p-4' :
    ''

  return (
    <div
      className={cn(paddingClass, className)}
      style={{
        background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: accentTop ? '2px solid rgba(163,230,53,0.35)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
      }}
      {...props}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3
              className="text-[10px] uppercase tracking-[0.12em] select-none"
              style={{ color: '#4A4A4A' }}
            >
              {title}
            </h3>
          )}
          {headerRight && (
            <div className="flex items-center gap-2">
              {headerRight}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
