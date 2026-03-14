/**
 * Design System — Typography Tokens
 *
 * Regra:
 * - Numeros/metricas: SEMPRE font-mono (JetBrains Mono)
 * - Titulos/headers: font-display (Inter 500-600)
 * - Corpo de texto: font-body (Inter 400)
 * - Labels/badges: font-body 500 uppercase com letter-spacing
 */

export const fontFamily = {
  display: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
  body:    '"Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", monospace',
} as const

export const fontSize = {
  xs:   { size: '0.75rem',  lineHeight: '1rem' },      // 12px — labels, captions
  sm:   { size: '0.875rem', lineHeight: '1.25rem' },    // 14px — texto secundario
  base: { size: '1rem',     lineHeight: '1.5rem' },     // 16px — corpo padrao
  lg:   { size: '1.125rem', lineHeight: '1.75rem' },    // 18px — subtitulos
  xl:   { size: '1.25rem',  lineHeight: '1.75rem' },    // 20px — titulos de secao
  '2xl': { size: '1.5rem',  lineHeight: '2rem' },       // 24px — titulos de pagina
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' },   // 30px — headlines
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' },     // 36px — hero KPIs
  '5xl': { size: '3rem',    lineHeight: '1' },           // 48px — numeros destaque
} as const

export const fontWeight = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const

export const letterSpacing = {
  tight:    '-0.025em',   // Headlines
  normal:   '0',          // Corpo
  wide:     '0.025em',    // Subtitulos
  wider:    '0.05em',     // Labels
  widest:   '0.1em',      // Badges uppercase
} as const

// Presets semanticos — use esses ao inves de compor manualmente
export const textPreset = {
  // Headlines
  heroNumber:    { family: 'mono',    size: '5xl', weight: 'bold',     tracking: 'tight' },
  pageTitle:     { family: 'display', size: '2xl', weight: 'semibold', tracking: 'tight' },
  sectionTitle:  { family: 'display', size: 'xl',  weight: 'semibold', tracking: 'normal' },
  cardTitle:     { family: 'display', size: 'lg',  weight: 'medium',   tracking: 'normal' },

  // Body
  bodyLarge:     { family: 'body',    size: 'base', weight: 'normal',  tracking: 'normal' },
  bodySmall:     { family: 'body',    size: 'sm',   weight: 'normal',  tracking: 'normal' },

  // Data
  metric:        { family: 'mono',    size: '4xl', weight: 'bold',     tracking: 'tight' },
  metricSmall:   { family: 'mono',    size: '2xl', weight: 'semibold', tracking: 'tight' },
  metricLabel:   { family: 'body',    size: 'xs',  weight: 'medium',   tracking: 'wider' },
  dataCell:      { family: 'mono',    size: 'sm',  weight: 'normal',   tracking: 'normal' },

  // UI
  button:        { family: 'body',    size: 'sm',  weight: 'medium',   tracking: 'wide' },
  badge:         { family: 'body',    size: 'xs',  weight: 'medium',   tracking: 'widest' },
  caption:       { family: 'body',    size: 'xs',  weight: 'normal',   tracking: 'normal' },
  nav:           { family: 'body',    size: 'sm',  weight: 'medium',   tracking: 'normal' },
} as const

export type FontFamily = keyof typeof fontFamily
export type FontSize = keyof typeof fontSize
export type TextPreset = keyof typeof textPreset
