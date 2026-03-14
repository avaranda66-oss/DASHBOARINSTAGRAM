import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina classes CSS com merge inteligente do Tailwind.
 * Mesmo utilitario que o shadcn usa, reexportado para o design system.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
