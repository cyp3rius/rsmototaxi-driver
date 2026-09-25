import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function FilterChip({
  active,
  onClick,
  children,
  icon,
  tone = 'accent',
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  icon?: ReactNode
  tone?: 'accent' | 'warning'
}) {
  const inactive =
    tone === 'warning'
      ? 'border border-[color-mix(in_srgb,var(--warning)_45%,transparent)] text-[var(--warning)] bg-transparent'
      : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]'
  const activeTone =
    tone === 'warning'
      ? 'bg-[var(--warning)] text-[var(--accent-on)] border border-transparent'
      : 'tint-accent text-[var(--accent)]'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-semibold',
        active ? activeTone : inactive,
      )}
    >
      {icon}
      {children}
    </button>
  )
}
