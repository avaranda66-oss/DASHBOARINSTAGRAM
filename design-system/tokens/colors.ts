/**
 * Design System — Color Tokens
 * Identity: Apple Clean + Psychedelic Math
 *
 * Base: preto absoluto, superficies em escala de cinza ultra-escuro
 * Accent: neon vibrante para dados e visualizacoes
 * Gradients: psicodelicos, usados em graficos e highlights
 */

export const colors = {
  // === BASE (Apple Clean) ===
  void: '#000000',
  surface: {
    1: '#0A0A0A',
    2: '#141414',
    3: '#1E1E1E',
  },
  border: {
    default: '#262626',
    hover: '#3A3A3A',
    focus: '#4A4A4A',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#8A8A8A',
    muted: '#4A4A4A',
    inverse: '#000000',
  },

  // === ACCENT (Psychedelic Math) ===
  neon: {
    purple: { base: '#A855F7', deep: '#7C3AED', light: '#C084FC' },
    blue:   { base: '#3B82F6', deep: '#2563EB', light: '#60A5FA' },
    cyan:   { base: '#06B6D4', deep: '#0891B2', light: '#22D3EE' },
    pink:   { base: '#EC4899', deep: '#DB2777', light: '#F472B6' },
    green:  { base: '#10B981', deep: '#059669', light: '#34D399' },
    amber:  { base: '#F59E0B', deep: '#D97706', light: '#FBBF24' },
    red:    { base: '#EF4444', deep: '#DC2626', light: '#F87171' },
  },

  // === SEMANTIC ===
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error:   '#EF4444',
    info:    '#3B82F6',
  },
} as const

// === GRADIENTS (Psychedelic — para dados e visualizacoes) ===
export const gradients = {
  cosmos:  'linear-gradient(135deg, #A855F7, #EC4899, #3B82F6)',
  aurora:  'linear-gradient(135deg, #06B6D4, #10B981, #A855F7)',
  sunset:  'linear-gradient(135deg, #F59E0B, #EF4444, #EC4899)',
  ocean:   'linear-gradient(135deg, #3B82F6, #06B6D4, #10B981)',
  depth:   'linear-gradient(180deg, #0A0A0A, #000000)',
  void:    'linear-gradient(180deg, #141414, #000000)',
} as const

// === GLOW EFFECTS ===
export const glows = {
  purple: '0 0 20px rgba(168, 85, 247, 0.3)',
  blue:   '0 0 20px rgba(59, 130, 246, 0.3)',
  cyan:   '0 0 20px rgba(6, 182, 212, 0.3)',
  pink:   '0 0 20px rgba(236, 72, 153, 0.3)',
  green:  '0 0 20px rgba(16, 185, 129, 0.3)',
  amber:  '0 0 20px rgba(245, 158, 11, 0.3)',
  red:    '0 0 20px rgba(239, 68, 68, 0.3)',
} as const

// === ALPHA (para backgrounds com transparencia) ===
export const alpha = {
  white: {
    5:  'rgba(255, 255, 255, 0.05)',
    10: 'rgba(255, 255, 255, 0.10)',
    20: 'rgba(255, 255, 255, 0.20)',
    40: 'rgba(255, 255, 255, 0.40)',
    60: 'rgba(255, 255, 255, 0.60)',
  },
  black: {
    40: 'rgba(0, 0, 0, 0.40)',
    60: 'rgba(0, 0, 0, 0.60)',
    80: 'rgba(0, 0, 0, 0.80)',
  },
} as const

export type ColorToken = typeof colors
export type GradientToken = typeof gradients
export type GlowToken = typeof glows
