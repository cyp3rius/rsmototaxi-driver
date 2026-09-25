import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function FilterChip({
  active,
  onClick,
  children,
  icon,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-medium',
        active ? 'tint-accent text-[var(--accent)]' : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
