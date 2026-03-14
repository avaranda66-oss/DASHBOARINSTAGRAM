import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/design-system/utils/cn'

export type Intent = 'default' | 'success' | 'warning' | 'error' | 'info'
export type Size = 'sm' | 'md' | 'lg'
export type Variant = 'solid' | 'outline' | 'ghost' | 'subtle'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  intent?: Intent
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

// Gradiente sutil estilo Apple — "lit from top" dá profundidade sem ser kitsch
const solidStyles: Record<Intent, React.CSSProperties> = {
  default: { background: 'linear-gradient(180deg, #BEF264 0%, #84CC16 100%)', color: '#000000', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' },
  success: { background: 'linear-gradient(180deg, #34D399 0%, #059669 100%)', color: '#000000', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' },
  warning: { background: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)', color: '#000000', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' },
  error:   { background: 'linear-gradient(180deg, #F87171 0%, #DC2626 100%)', color: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' },
  info:    { background: 'linear-gradient(180deg, #708CF0 0%, #3E63DD 100%)', color: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' },
}

export function Button({
  variant = 'solid',
  size = 'md',
  intent = 'default',
  isLoading,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, transition: { duration: 0.1 } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
      style={variant === 'solid' ? { ...solidStyles[intent ?? 'default'], ...style } : style}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        'disabled:opacity-40 disabled:cursor-not-allowed',

        size === 'sm' && 'h-8 px-3 text-xs rounded-[6px] gap-1.5 tracking-wide',
        size === 'md' && 'h-9 px-4 text-sm rounded-[8px] gap-2',
        size === 'lg' && 'h-11 px-5 text-sm font-semibold rounded-[10px] gap-2.5 tracking-wide',

        // solid text color is set inline via solidStyles (black for light accent, white for dark)
        variant === 'solid' && 'font-semibold',

        variant === 'outline' && cn(
          'border text-[#D4D4D4] hover:bg-[#141414] hover:text-[#F5F5F5]',
          'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.20)]',
          intent === 'error'   && 'text-[#F87171] border-[#7f1d1d]/60 hover:border-[#EF4444]/60 hover:bg-[#EF4444]/5',
          intent === 'success' && 'text-[#34D399] border-[#064e3b]/60 hover:border-[#10B981]/60 hover:bg-[#10B981]/5',
        ),

        variant === 'ghost' && cn(
          'text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-white/5',
          intent === 'error'   && 'text-[#F87171]/70 hover:text-[#F87171] hover:bg-[#EF4444]/8',
          intent === 'success' && 'text-[#34D399]/70 hover:text-[#34D399] hover:bg-[#10B981]/8',
        ),

        variant === 'subtle' && cn(
          'bg-white/[0.04] text-[#8A8A8A] hover:bg-white/[0.08] hover:text-[#E8E8E8] border border-white/[0.06]',
          intent === 'error'   && 'text-[#F87171]/80 bg-[#EF4444]/5 border-[#EF4444]/10 hover:bg-[#EF4444]/10',
          intent === 'success' && 'text-[#34D399]/80 bg-[#10B981]/5 border-[#10B981]/10 hover:bg-[#10B981]/10',
        ),

        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-3.5 w-3.5 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
    </motion.button>
  )
}
