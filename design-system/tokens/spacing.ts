/**
 * Design System — Spacing & Layout Tokens v2
 * Base unit: 4px
 * Radius: hierarquia de 4 níveis (controles → cards → painéis → modais)
 */

// ─── SPACING SCALE ────────────────────────────────────────────────────────────
export const spacing = {
  0:  '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1:  '0.25rem',    // 4px
  1.5: '0.375rem',  // 6px
  2:  '0.5rem',     // 8px
  2.5: '0.625rem',  // 10px
  3:  '0.75rem',    // 12px
  4:  '1rem',       // 16px
  5:  '1.25rem',    // 20px
  6:  '1.5rem',     // 24px
  8:  '2rem',       // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const

// ─── RADIUS SYSTEM ────────────────────────────────────────────────────────────
// Hierarquia baseada em pesquisa Linear/Vercel/Apple:
// Controles pequenos: 4-6px | Cards: 8px | Painéis: 12px | Modais: 16px
export const radius = {
  none:  '0',
  xs:    '4px',     // checkboxes, toggles — tight controls
  sm:    '6px',     // badges, tags, chips
  md:    '8px',     // cards, inputs, dropdowns — padrão de produto
  lg:    '12px',    // painéis, tables, popups
  xl:    '16px',    // modais, sheets
  '2xl': '24px',    // containers grandes, hero sections
  full:  '9999px',  // avatars, pills, indicators
} as const

// Aliases semânticos — use esses nos componentes
export const radiusAlias = {
  control:    radius.xs,    // checkboxes, toggles
  badge:      radius.sm,    // badges, chips
  input:      radius.md,    // inputs, selects
  button:     radius.md,    // botões
  card:       radius.md,    // cards (8px é o padrão premium)
  panel:      radius.lg,    // sidebars, tooltips, dropdowns
  modal:      radius.xl,    // modais, drawers
  container:  radius['2xl'],// seções, hero
  avatar:     radius.full,  // avatars, status dots
} as const

// ─── SHADOW SYSTEM ────────────────────────────────────────────────────────────
// Dark mode: sombras sutis — profundidade via diferença de luminância, não sombra pesada
export const shadow = {
  none: 'none',

  // Elevação de superfícies
  xs:   '0 1px 2px rgba(0,0,0,0.4)',                    // hover state
  sm:   '0 1px 4px rgba(0,0,0,0.5)',                    // cards em repouso
  md:   '0 4px 12px rgba(0,0,0,0.5)',                   // panels, dropdowns
  lg:   '0 8px 24px rgba(0,0,0,0.6)',                   // modais, sheets
  xl:   '0 16px 48px rgba(0,0,0,0.7)',                  // overlays grandes

  // Inner shadow — "lit from top" (estilo Apple em botões)
  insetTop: 'inset 0 1px 0 rgba(255,255,255,0.10)',     // botão sólido
  insetTopSubtle: 'inset 0 1px 0 rgba(255,255,255,0.06)',

  // Glow solar (accent)
  solarGlow: '0 0 20px rgba(163,230,53,0.20)',          // em KPIs e CTAs ativos
} as const

// ─── Z-INDEX SCALE ────────────────────────────────────────────────────────────
export const zIndex = {
  base:      0,
  raised:    1,
  dropdown:  10,
  sticky:    20,
  overlay:   30,
  modal:     40,
  toast:     50,
  tooltip:   60,
  command:   70,  // command palette (Raycast-style)
} as const

// ─── LAYOUT TOKENS ────────────────────────────────────────────────────────────
export const layout = {
  // Sidebar
  sidebarWidth:  '256px',   // 64 * 4px
  sidebarCompact: '72px',

  // Content max widths
  contentSm:   '640px',
  contentMd:   '768px',
  contentLg:   '1024px',
  contentXl:   '1280px',
  content2xl:  '1536px',

  // Grid
  columns:    12,
  gapSm:      '8px',    // gap dentro de grupos
  gapMd:      '16px',   // gap entre grupos
  gapLg:      '24px',   // gap entre seções

  // Densidade de tabela (Bloomberg-inspired)
  rowHeightCompact:  '32px',  // tabelas densas
  rowHeightDefault:  '44px',  // tabelas padrão
  rowHeightRelaxed:  '56px',  // tabelas com muito conteúdo
} as const

export type Spacing    = keyof typeof spacing
export type Radius     = keyof typeof radius
export type Shadow     = keyof typeof shadow
export type ZIndex     = keyof typeof zIndex
