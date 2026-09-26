import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  BOTTOM_NAV_FADE_HEIGHT_PX,
  CHROME_EDGE_FADE_GRADIENT,
} from '@/components/shell/BottomNav'

/** Same height / curve as the tab-bar fade — overlays form scroll content. */
export const ACTION_BAR_FADE_HEIGHT_PX = BOTTOM_NAV_FADE_HEIGHT_PX

/** Bottom padding for the form scroller so the last fields clear the fade. */
export function actionBarContentPadCss() {
  return `${ACTION_BAR_FADE_HEIGHT_PX}px`
}

/**
 * Form footer — docked low, with the same transparent→bg fade as the tab bar.
 * Pair with `actionBarContentPadCss()` on the scroll body.
 */
export function ActionBar({
  children,
  withNav,
  docked = true,
}: {
  children: ReactNode
  withNav?: boolean
  /** When false, legacy fixed pin (avoid on stack forms). */
  docked?: boolean
}) {
  return (
    <div
      className={cn(
        'rs-action-bar relative z-30 border-t border-[var(--separator)] bg-[var(--bg-base)] px-5 pt-3',
        docked ? 'flex-none' : 'fixed inset-x-0 bottom-0',
        withNav && 'rs-action-bar--with-nav',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full"
        style={{
          height: ACTION_BAR_FADE_HEIGHT_PX,
          background: CHROME_EDGE_FADE_GRADIENT,
        }}
      />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}
