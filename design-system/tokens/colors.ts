/**
 * Design System — Color Tokens v2
 * Architecture: Primitive → Semantic (two-layer)
 *
 * REGRA CRÍTICA:
 * - Componentes consomem SEMANTIC tokens
 * - Primitives são valores brutos — nunca referenciar diretamente em UI
 * - Bordas SEMPRE com rgba opacity (reage ao fundo, parece premium)
 */

// ─── LAYER 1: PRIMITIVES ──────────────────────────────────────────────────────
// Valores crus de escala. Nunca usar diretamente em componentes.

export const primitive = {
  gray: {
    0:    '#000000',
    50:   '#050505',
    100:  '#0A0A0A',
    200:  '#141414',
    300:  '#1E1E1E',
    400:  '#262626',
    500:  '#3A3A3A',
    600:  '#4A4A4A',
    700:  '#8A8A8A',
    800:  '#D4D4D4',
    950:  '#F5F5F5',
  },
  solar: {
    light:  '#BEF264',
    base:   '#A3E635',   // brand accent
    deep:   '#84CC16',
    deeper: '#65A30D',
  },
  neon: {
    blue:   '#3B82F6',
    cyan:   '#06B6D4',
    purple: '#A855F7',
    pink:   '#EC4899',
    green:  '#10B981',
    amber:  '#F59E0B',
    red:    '#EF4444',
  },
} as const

// ─── LAYER 2: SEMANTIC ────────────────────────────────────────────────────────
// Tokens com papel definido. Esses são os que componentes devem usar.

export const semantic = {
  // Surfaces — camadas de profundidade (do mais escuro ao mais claro)
  bg: {
    base:     primitive.gray[0],     // void — fundo absoluto
    subtle:   primitive.gray[50],    // #050505 — fundo de página
    surface:  primitive.gray[100],   // #0A0A0A — cards, sidebars
    elevated: primitive.gray[200],   // #141414 — painéis, hover states
    overlay:  primitive.gray[300],   // #1E1E1E — dropdowns, modais
  },

  // Borders — SEMPRE opacity, nunca cinza sólido
  // Reage ao fundo e parece premium (padrão Linear/Vercel)
  border: {
    hairline: 'rgba(255,255,255,0.04)',  // linhas de tabela, divisores de seção
    subtle:   'rgba(255,255,255,0.08)',  // contorno de cards
    default:  'rgba(255,255,255,0.12)',  // elementos interativos
    strong:   'rgba(255,255,255,0.20)',  // focus, estados ativos
    accent:   'rgba(163,230,53,0.25)',   // accent border (solar green)
    error:    'rgba(239,68,68,0.30)',    // border de erro
  },

  // Text — hierarquia por cor (sem mudar tamanho)
  text: {
    primary:   primitive.gray[950],  // #F5F5F5 — conteúdo principal
    secondary: primitive.gray[700],  // #8A8A8A — conteúdo de suporte
    muted:     primitive.gray[600],  // #4A4A4A — desabilitado, placeholder
    disabled:  primitive.gray[500],  // #3A3A3A — não interativo
    inverse:   primitive.gray[0],    // #000000 — sobre fundos claros
  },

  // Action — cor de marca para triggers e CTAs
  action: {
    primary:       primitive.solar.base,      // #A3E635
    primaryHover:  primitive.solar.deep,      // #84CC16
    primaryActive: primitive.solar.deeper,    // #65A30D
    primarySubtle: 'rgba(163,230,53,0.08)',   // background de estados ativos
    primaryGlow:   '0 0 20px rgba(163,230,53,0.20)',
  },

  // Status — semântica de feedback
  status: {
    success:       primitive.neon.green,   // #10B981
    successSubtle: 'rgba(16,185,129,0.10)',
    warning:       primitive.neon.amber,   // #F59E0B
    warningSubtle: 'rgba(245,158,11,0.10)',
    error:         primitive.neon.red,     // #EF4444
    errorSubtle:   'rgba(239,68,68,0.10)',
    info:          primitive.neon.blue,    // #3B82F6
    infoSubtle:    'rgba(59,130,246,0.10)',
  },

  // Data visualization — gradientes psicodélicos APENAS em dados
  gradient: {
    cosmos: 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #3B82F6 100%)',
    aurora: 'linear-gradient(135deg, #06B6D4 0%, #10B981 50%, #A855F7 100%)',
    sunset: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)',
    ocean:  'linear-gradient(135deg, #3B82F6 0%, #06B6D4 50%, #10B981 100%)',
    solar:  'linear-gradient(180deg, #A3E635 0%, #65A30D 100%)',
  },

  // Glow — apenas em elementos de dados neon
  glow: {
    solar:  '0 0 20px rgba(163,230,53,0.25)',
    blue:   '0 0 20px rgba(59,130,246,0.25)',
    purple: '0 0 20px rgba(168,85,247,0.25)',
    cyan:   '0 0 20px rgba(6,182,212,0.25)',
    red:    '0 0 20px rgba(239,68,68,0.25)',
  },
} as const

// ─── BACKWARDS COMPAT ─────────────────────────────────────────────────────────
// Mantém imports existentes funcionando. Novos componentes devem usar `semantic`.

export const colors = {
  void:    primitive.gray[0],
  surface: {
    1: primitive.gray[100],
    2: primitive.gray[200],
    3: primitive.gray[300],
  },
  border: {
    default: primitive.gray[400],
    hover:   primitive.gray[500],
    focus:   primitive.gray[600],
  },
  text: semantic.text,
  brand: {
    solar: primitive.solar,
    slate: { base: '#475569', deep: '#1E293B', light: '#94A3B8' },
  },
  neon: {
    solar:  { base: primitive.solar.base, deep: primitive.solar.deep, light: primitive.solar.light },
    indigo: { base: '#3E63DD', deep: '#2E46A6', light: '#708CF0' },
    red:    { base: '#EF4444', deep: '#DC2626', light: '#F87171' },
  },
  semantic: semantic.status,
} as const

// Legacy exports (gradients/glows)
export const gradients = semantic.gradient
export const glows     = semantic.glow

export const alpha = {
  white: {
    4:  'rgba(255,255,255,0.04)',
    8:  'rgba(255,255,255,0.08)',
    12: 'rgba(255,255,255,0.12)',
    20: 'rgba(255,255,255,0.20)',
    40: 'rgba(255,255,255,0.40)',
  },
  black: {
    40: 'rgba(0,0,0,0.40)',
    60: 'rgba(0,0,0,0.60)',
    80: 'rgba(0,0,0,0.80)',
  },
} as const

export type Primitive   = typeof primitive
export type Semantic    = typeof semantic
export type ColorToken  = typeof colors
