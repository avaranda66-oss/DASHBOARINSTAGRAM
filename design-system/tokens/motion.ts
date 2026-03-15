/**
 * Design System — Motion Tokens v2
 * Arquitetura: duration por tipo de animação + easing semântico + spring tokens
 *
 * Princípio: motion é linguagem, não decoração
 * Cada tipo de animação tem curva diferente (entrance ≠ exit ≠ feedback)
 */

// ─── DURATIONS ────────────────────────────────────────────────────────────────
// Baseado em pesquisa de Carbon/Material/Apple
export const duration = {
  // Microinterações
  hover:     100,  // ms — mudança de bg/cor em hover imediato
  feedback:  130,  // ms — tap, click, toggle (mais rápido que olho, sensação física)

  // Animações de UI
  entrance:  200,  // ms — elementos aparecendo (tooltips, dropdowns)
  exit:      150,  // ms — elementos sumindo (saída mais rápida que entrada)
  panel:     250,  // ms — sidebars, painéis laterais
  modal:     300,  // ms — modais/drawers

  // Animações expressivas (dados)
  countUp:   800,  // ms — números animados (KPIs)
  chart:     600,  // ms — gráficos desenhando
  page:      400,  // ms — transições de página

  // Legacy aliases (backwards compat)
  instant:   100,
  fast:      200,
  normal:    300,
  slow:      500,
  dramatic:  800,
  cinematic: 1200,
} as const

// ─── EASINGS ─────────────────────────────────────────────────────────────────
// Curvas diferentes por tipo de animação — padrão Linear/Apple
export const easing = {
  // Standard: elementos produtivos — entrada rápida, sem bounce
  standard:  [0.16, 1, 0.3, 1]     as const,  // cubic-bezier out — padrão premium

  // Entrada: elementos aparecendo — desacelera ao chegar
  entrance:  [0.0, 0.0, 0.2, 1.0]  as const,  // ease-out enfatizado

  // Saída: elementos sumindo — acelera ao sair
  exit:      [0.4, 0.0, 1.0, 1.0]  as const,  // ease-in enfatizado

  // Transitions simétricas (troca de estado)
  inOut:     [0.65, 0, 0.35, 1]    as const,

  // Feedback (hover, tap) — quase linear, responsivo
  feedback:  [0.4, 0, 0.6, 1]      as const,  // sharp

  // Expressivo — leve spring nos dados (countUp, KPI)
  spring:    [0.34, 1.56, 0.64, 1] as const,  // overshoot sutil

  // Suave (gráficos)
  smooth:    [0.4, 0, 0.2, 1]      as const,
} as const

// ─── SPRING PRESETS (Framer Motion) ──────────────────────────────────────────
// Physics-based — continuidade de velocidade, natural em gestos
export const spring = {
  // Soft: sidebars, painéis — massa alta, amortecimento alto
  soft: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 26,
    mass: 1,
  },
  // Snappy: tooltips, dropdowns — resposta rápida
  snappy: {
    type: 'spring' as const,
    stiffness: 320,
    damping: 24,
    mass: 1,
  },
  // Bounce: números/KPIs — pequeno overshoot expressivo
  bounce: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 20,
    mass: 0.8,
  },
} as const

// ─── PRESETS FRAMER MOTION ────────────────────────────────────────────────────
// Presets prontos para usar em componentes
export const motionPreset = {
  // Elementos de conteúdo aparecendo
  fadeIn: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    transition: { duration: duration.entrance / 1000, ease: easing.standard },
  },
  fadeInUp: {
    initial:    { opacity: 0, y: 8 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: duration.entrance / 1000, ease: easing.standard },
  },
  fadeInScale: {
    initial:    { opacity: 0, scale: 0.96 },
    animate:    { opacity: 1, scale: 1 },
    transition: { duration: duration.entrance / 1000, ease: easing.standard },
  },

  // Saídas
  fadeOut: {
    initial:    { opacity: 1 },
    animate:    { opacity: 0 },
    transition: { duration: duration.exit / 1000, ease: easing.exit },
  },

  // Slides
  slideInRight: {
    initial:    { opacity: 0, x: 16 },
    animate:    { opacity: 1, x: 0 },
    transition: { duration: duration.panel / 1000, ease: easing.standard },
  },
  slideInLeft: {
    initial:    { opacity: 0, x: -16 },
    animate:    { opacity: 1, x: 0 },
    transition: { duration: duration.panel / 1000, ease: easing.standard },
  },

  // Interações
  cardHover: {
    whileHover: { scale: 1.01, transition: { duration: duration.hover / 1000 } },
    whileTap:   { scale: 0.99, transition: { duration: duration.feedback / 1000 } },
  },
  buttonTap: {
    whileHover: { scale: 1.02, transition: { duration: duration.hover / 1000 } },
    whileTap:   { scale: 0.97, transition: { duration: duration.feedback / 1000 } },
  },

  // Stagger em listas (hierarquia via offset/delay)
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.04 } },
  },
  staggerItem: {
    initial:    { opacity: 0, y: 6 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: duration.entrance / 1000, ease: easing.standard },
  },

  // Dados animados
  countUp: {
    transition: { duration: duration.countUp / 1000, ease: easing.spring },
  },
  chartDraw: {
    initial:    { pathLength: 0, opacity: 0 },
    animate:    { pathLength: 1, opacity: 1 },
    transition: { duration: duration.chart / 1000, ease: easing.smooth },
  },
} as const

// Regras do que pode e NÃO PODE ser animado
export const motionRules = {
  canAnimate:    ['entrance', 'exit', 'overlay', 'KPI countUp', 'chart draw', 'feedback tap'],
  cannotAnimate: ['real-time data updates', 'table reorder heavy', 'large list rerender'],
  maxSimultaneous: 5,  // elementos animando ao mesmo tempo na mesma cena
} as const

export type Duration    = keyof typeof duration
export type Easing      = keyof typeof easing
export type SpringToken = keyof typeof spring
export type MotionPreset= keyof typeof motionPreset
