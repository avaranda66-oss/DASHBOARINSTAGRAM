/**
 * Design System — Typography Tokens v2
 * Scale: Major Third (×1.25) a partir de 14px base
 * Rule: Sem cor, hierarquia via tamanho + peso + tracking
 */

export const fontFamily = {
  display: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
  body:    '"Inter", "SF Pro Text",    system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
} as const

// Escala Major Third (×1.25) ancorada em 14px
// 11 → 12 → 14 → 17.5 → 21.9 → 27.3 → 34.2 → 42.7px
export const fontSize = {
  '2xs': { size: '0.6875rem', lineHeight: '1rem' },       // 11px — micro labels
  xs:    { size: '0.75rem',   lineHeight: '1.125rem' },   // 12px — captions
  sm:    { size: '0.875rem',  lineHeight: '1.25rem' },    // 14px — body compacto
  base:  { size: '1rem',      lineHeight: '1.5rem' },     // 16px — corpo padrão
  lg:    { size: '1.125rem',  lineHeight: '1.625rem' },   // 18px — subtítulo
  xl:    { size: '1.375rem',  lineHeight: '1.875rem' },   // 22px — título seção
  '2xl': { size: '1.75rem',   lineHeight: '2.25rem' },    // 28px — título página
  '3xl': { size: '2.125rem',  lineHeight: '2.625rem' },   // 34px — headline
  '4xl': { size: '2.75rem',   lineHeight: '3.25rem' },    // 44px — hero KPI
  '5xl': { size: '3.5rem',    lineHeight: '1' },           // 56px — número destaque
} as const

export const fontWeight = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
} as const

// Tracking por nível — baseado em Apple HIG + Linear
// Headings grandes: negativo (comprime, parece premium)
// Body: neutro
// Labels pequenos: positivo (abre, melhora legibilidade em caps)
export const letterSpacing = {
  tightest: '-0.04em',  // Display, hero — compress máximo
  tighter:  '-0.03em',  // H1, page titles
  tight:    '-0.02em',  // H2, section titles
  normal:   '0em',      // Body text
  wide:     '0.02em',   // Subtitles, tags
  wider:    '0.06em',   // Labels uppercase
  widest:   '0.10em',   // Badges uppercase — abre letras caps
} as const

// Line height por tipo de uso
export const lineHeight = {
  none:    '1',     // Números/KPIs — sem espaço extra
  tight:   '1.1',  // Display headlines
  snug:    '1.25', // Títulos
  normal:  '1.4',  // Body compacto (tabelas densas)
  relaxed: '1.5',  // Body leitura
  loose:   '1.6',  // Texto de leitura longa
} as const

// ─── PRESETS SEMÂNTICOS ───────────────────────────────────────────────────────
// Use sempre esses ao invés de compor manualmente
// Padrão: { family, size, weight, tracking, lineHeight }

export const textPreset = {
  // Display (hero/marketing — usar só em brandbook/landing)
  heroDisplay: { family: 'display', size: '5xl', weight: 'black',    tracking: 'tightest', lh: 'tight'   },
  heroNumber:  { family: 'mono',    size: '5xl', weight: 'bold',     tracking: 'tightest', lh: 'none'    },

  // Títulos de página/seção
  pageTitle:     { family: 'display', size: '3xl', weight: 'bold',     tracking: 'tighter', lh: 'tight'  },
  sectionTitle:  { family: 'display', size: '2xl', weight: 'semibold', tracking: 'tight',   lh: 'snug'   },
  cardTitle:     { family: 'display', size: 'xl',  weight: 'semibold', tracking: 'tight',   lh: 'snug'   },
  panelTitle:    { family: 'display', size: 'lg',  weight: 'semibold', tracking: 'normal',  lh: 'snug'   },

  // Body
  bodyLarge:  { family: 'body', size: 'base', weight: 'normal',  tracking: 'normal', lh: 'relaxed' },
  body:       { family: 'body', size: 'sm',   weight: 'normal',  tracking: 'normal', lh: 'normal'  },
  bodySmall:  { family: 'body', size: 'xs',   weight: 'normal',  tracking: 'normal', lh: 'normal'  },

  // Data / Métricas — MONO OBRIGATÓRIO
  metric:      { family: 'mono', size: '4xl', weight: 'bold',     tracking: 'tightest', lh: 'none'    },
  metricMd:    { family: 'mono', size: '2xl', weight: 'semibold', tracking: 'tight',    lh: 'none'    },
  metricSm:    { family: 'mono', size: 'xl',  weight: 'semibold', tracking: 'tight',    lh: 'none'    },
  metricLabel: { family: 'body', size: 'xs',  weight: 'medium',   tracking: 'wider',    lh: 'snug'    },
  dataCell:    { family: 'mono', size: 'sm',  weight: 'normal',   tracking: 'normal',   lh: 'normal'  },
  dataCellBold:{ family: 'mono', size: 'sm',  weight: 'semibold', tracking: 'normal',   lh: 'normal'  },

  // UI Controls
  button:     { family: 'body', size: 'sm',   weight: 'medium',  tracking: 'wide',   lh: 'none'    },
  buttonLg:   { family: 'body', size: 'base', weight: 'semibold',tracking: 'normal', lh: 'none'    },
  badge:      { family: 'body', size: 'xs',   weight: 'semibold',tracking: 'widest', lh: 'none'    },
  label:      { family: 'body', size: 'xs',   weight: 'medium',  tracking: 'wider',  lh: 'snug'    },
  caption:    { family: 'body', size: '2xs',  weight: 'normal',  tracking: 'wide',   lh: 'snug'    },
  nav:        { family: 'body', size: 'sm',   weight: 'medium',  tracking: 'normal', lh: 'none'    },
  navMono:    { family: 'mono', size: 'xs',   weight: 'bold',    tracking: 'widest', lh: 'none'    },

  // Compact (tabelas densas — Bloomberg Terminal style)
  tableHeader:{ family: 'body', size: 'xs',   weight: 'semibold',tracking: 'wider',  lh: 'snug'    },
  tableCell:  { family: 'mono', size: 'xs',   weight: 'normal',  tracking: 'normal', lh: 'normal'  },
  tableCellMd:{ family: 'mono', size: 'xs',   weight: 'semibold',tracking: 'normal', lh: 'normal'  },
} as const

export type FontFamily   = keyof typeof fontFamily
export type FontSize     = keyof typeof fontSize
export type FontWeight   = keyof typeof fontWeight
export type LetterSpacing= keyof typeof letterSpacing
export type TextPreset   = keyof typeof textPreset
