'use client'

import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/design-system/utils/cn'
import { semantic } from '@/design-system/tokens/colors'

export type BadgeVariant = 'solid' | 'outline' | 'subtle'
export type BadgeIntent = 'default' | 'success' | 'warning' | 'error' | 'info'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLMotionProps<'span'> {
  variant?: BadgeVariant
  intent?: BadgeIntent
  size?: BadgeSize
  children: React.ReactNode
}

// Background colors and text for subtle/solid states using technical logic
const badgeStyles: Record<BadgeIntent, { 
  solid: React.CSSProperties, 
  subtle: React.CSSProperties, 
  outline: string 
}> = {
  default: {
    solid: { backgroundColor: semantic.action.primary, color: '#000000' },
    subtle: { backgroundColor: semantic.action.primarySubtle, color: semantic.action.primary },
    outline: 'border-[rgba(163,230,53,0.3)] text-[#A3E635]'
  },
  success: {
    solid: { backgroundColor: semantic.status.success, color: '#000000' },
    subtle: { backgroundColor: semantic.status.successSubtle, color: semantic.status.success },
    outline: 'border-[rgba(16,185,129,0.3)] text-[#10B981]'
  },
  warning: {
    solid: { backgroundColor: semantic.status.warning, color: '#000000' },
    subtle: { backgroundColor: semantic.status.warningSubtle, color: semantic.status.warning },
    outline: 'border-[rgba(245,158,11,0.3)] text-[#F59E0B]'
  },
  error: {
    solid: { backgroundColor: semantic.status.error, color: '#FFFFFF' },
    subtle: { backgroundColor: semantic.status.errorSubtle, color: semantic.status.error },
    outline: 'border-[rgba(239,68,68,0.3)] text-[#EF4444]'
  },
  info: {
    solid: { backgroundColor: semantic.status.info, color: '#FFFFFF' },
    subtle: { backgroundColor: semantic.status.infoSubtle, color: semantic.status.info },
    outline: 'border-[rgba(59,130,246,0.3)] text-[#3B82F6]'
  },
}

export function Badge({
  variant = 'subtle',
  intent = 'default',
  size = 'md',
  children,
  className,
  style,
  ...props
}: BadgeProps) {
  
  // Resolve inline styles for solid/subtle
  const colorSet = badgeStyles[intent]
  const inlineStyle = variant === 'solid' ? colorSet.solid : variant === 'subtle' ? colorSet.subtle : {}

  return (
    <motion.span
      style={{ ...inlineStyle, ...style }}
      className={cn(
        'inline-flex items-center justify-center font-mono font-semibold uppercase tracking-[0.1em] select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A3E635] focus-visible:ring-offset-1 focus-visible:ring-offset-black',
        'rounded-[6px]', // radiusAlias.badge
        
        size === 'sm' && 'h-4 px-1.5 text-[9px]',
        size === 'md' && 'h-5 px-2 text-[10px]',
        
        variant === 'outline' && cn('border bg-transparent', colorSet.outline),
        
        className
      )}
      {...props}
    >
      {children}
    </motion.span>
  )
}
