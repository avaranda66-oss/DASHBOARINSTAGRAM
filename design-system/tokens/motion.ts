/**
 * Design System — Motion Tokens
 *
 * Regras:
 * 1. Dados aparecendo: fade-in + slide-up (normal)
 * 2. Numeros mudando: roll/count animation (dramatic)
 * 3. Graficos desenhando: stroke animation (dramatic)
 * 4. Hover em cards: scale(1.01) + glow sutil (instant)
 * 5. Modais: fade-in + scale 0.95 -> 1 (normal)
 */

export const duration = {
  instant:   '100ms',   // hover, focus
  fast:      '200ms',   // tooltips, dropdowns
  normal:    '300ms',   // modais, drawers
  slow:      '500ms',   // transicoes de pagina
  dramatic:  '800ms',   // numeros animados, graficos entrando
  cinematic: '1200ms',  // animacoes de entrada na primeira carga
} as const

export const easing = {
  out:     'cubic-bezier(0.16, 1, 0.3, 1)',       // padrao (elementos aparecendo)
  inOut:   'cubic-bezier(0.65, 0, 0.35, 1)',      // transicoes simetricas
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',   // bounce sutil (numeros)
  smooth:  'cubic-bezier(0.4, 0, 0.2, 1)',        // motion suave (graficos)
  sharp:   'cubic-bezier(0.4, 0, 0.6, 1)',        // rapido e preciso
} as const

// Presets para Framer Motion
export const motionPreset = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  cardHover: {
    whileHover: { scale: 1.01, transition: { duration: 0.1 } },
    whileTap: { scale: 0.99, transition: { duration: 0.05 } },
  },
  staggerChildren: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
  countUp: {
    transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
  },
} as const

export type Duration = keyof typeof duration
export type Easing = keyof typeof easing
export type MotionPreset = keyof typeof motionPreset
