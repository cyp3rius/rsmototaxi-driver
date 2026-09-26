import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Form footer for stack screens.
 * Default `docked` sits in the page flex column (never `position:fixed`) so it
 * cannot slide under the home indicator / below the visual viewport on iOS PWA.
 * Bottom inset is light (≈¾ of the lg button height) so the CTA sits lower.
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
        'z-30 border-t border-[var(--separator)] bg-[var(--bg-base)] px-5 pt-3',
        docked ? 'relative flex-none' : 'fixed inset-x-0 bottom-0',
      )}
      style={{
        paddingBottom: withNav
          ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
          : 'max(2px, calc(env(safe-area-inset-bottom, 0px) - 48px))',
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}
