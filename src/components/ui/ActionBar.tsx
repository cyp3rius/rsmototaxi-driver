import type { ReactNode } from 'react'

/**
 * Sticky form footer. Flush to the screen bottom — only home-indicator safe-area,
 * no extra phantom padding (stack routes have no tab bar under the chrome).
 */
export function ActionBar({ children, withNav }: { children: ReactNode; withNav?: boolean }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--separator)] bg-[var(--bg-base)] px-5 pt-3"
      style={{
        paddingBottom: withNav
          ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
          : 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}
