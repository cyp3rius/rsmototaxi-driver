import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function SelectTile({
  selected,
  onClick,
  icon,
  label,
  disabled,
}: {
  selected?: boolean
  onClick?: () => void
  icon?: ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[15px] transition active:scale-[0.98] disabled:opacity-[0.38]',
        selected
          ? 'border-2 border-[var(--accent)] font-[600] tint-accent-soft text-[var(--accent)]'
          : 'border border-[var(--separator)] bg-[var(--bg-surface)] font-[500] text-[var(--text-primary)]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
