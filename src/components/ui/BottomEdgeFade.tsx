import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  BOTTOM_NAV_FADE_HEIGHT_PX,
  CHROME_EDGE_FADE_GRADIENT,
} from '@/components/shell/BottomNav'

/** Soft edge fade at the bottom of stack details / sheets (no ActionBar). */
export const BOTTOM_EDGE_FADE_HEIGHT_PX = BOTTOM_NAV_FADE_HEIGHT_PX

/** Extra scroll padding so content clears the fade. */
export const BOTTOM_EDGE_FADE_PAD_PX = BOTTOM_EDGE_FADE_HEIGHT_PX

export function BottomEdgeFade({
  className,
  fromVar = '--bg-base',
}: {
  className?: string
  /** CSS variable name used as the opaque end of the gradient. */
  fromVar?: string
} = {}) {
  const background =
    fromVar === '--bg-base'
      ? CHROME_EDGE_FADE_GRADIENT
      : `linear-gradient(to top, var(${fromVar}) 0%, color-mix(in srgb, var(${fromVar}) 55%, transparent) 28%, color-mix(in srgb, var(${fromVar}) 18%, transparent) 62%, transparent 100%)`

  return (
    <div
      aria-hidden
      className={
        className ??
        'pointer-events-none absolute inset-x-0 bottom-0 z-[15]'
      }
      style={{
        height: BOTTOM_EDGE_FADE_HEIGHT_PX,
        background,
      }}
    />
  )
}
