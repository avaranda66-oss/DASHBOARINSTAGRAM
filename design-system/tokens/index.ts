/**
 * Design System — Token Index
 *
 * Ponto de entrada unico para todos os tokens.
 * Import: import { tokens } from '@ds/tokens'
 */

export { colors, gradients, glows, alpha } from './colors'
export { fontFamily, fontSize, fontWeight, letterSpacing, textPreset } from './typography'
export { spacing, radius, shadow, zIndex } from './spacing'
export { duration, easing, motionPreset } from './motion'

// Re-export types
export type { ColorToken, Primitive, Semantic } from './colors'
export type { FontFamily, FontSize, TextPreset } from './typography'
export type { Spacing, Radius, Shadow } from './spacing'
export type { Duration, Easing, MotionPreset } from './motion'
