import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Form footer — docked low; no safe-area-inset-bottom (chrome owns that band).
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
        'rs-action-bar z-30 border-t border-[var(--separator)] bg-[var(--bg-base)] px-5 pt-3',
        docked ? 'relative flex-none' : 'fixed inset-x-0 bottom-0',
        withNav && 'rs-action-bar--with-nav',
      )}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}
