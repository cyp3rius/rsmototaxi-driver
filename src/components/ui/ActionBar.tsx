import type { ReactNode } from 'react'

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--separator)] bg-[var(--bg-base)] px-5 pt-3"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 4px)' }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}
