/**
 * Design System — Spacing & Layout Tokens
 * Base unit: 4px
 */

export const spacing = {
  0:  '0',
  1:  '0.25rem',   // 4px
  2:  '0.5rem',    // 8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  5:  '1.25rem',   // 20px
  6:  '1.5rem',    // 24px
  8:  '2rem',      // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const

export const radius = {
  none: '0',
  sm:   '6px',      // badges, tags
  md:   '10px',     // botoes, inputs
  lg:   '14px',     // cards
  xl:   '20px',     // modais, containers grandes
  full: '9999px',   // avatars, pills
} as const

export const shadow = {
  none: 'none',
  sm:   '0 1px 2px rgba(0, 0, 0, 0.5)',
  md:   '0 4px 12px rgba(0, 0, 0, 0.5)',
  lg:   '0 8px 24px rgba(0, 0, 0, 0.6)',
  xl:   '0 16px 48px rgba(0, 0, 0, 0.7)',
  glow: '0 0 40px rgba(168, 85, 247, 0.15)',  // ambient glow sutil
} as const

export const zIndex = {
  base:     0,
  dropdown: 10,
  sticky:   20,
  overlay:  30,
  modal:    40,
  toast:    50,
  tooltip:  60,
} as const

export type Spacing = keyof typeof spacing
export type Radius = keyof typeof radius
export type Shadow = keyof typeof shadow
