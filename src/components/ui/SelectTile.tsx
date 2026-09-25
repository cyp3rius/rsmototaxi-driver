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
        'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[18px] border px-2 py-3 text-center text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-[0.38]',
        selected
          ? 'border-[var(--accent)] tint-accent-soft text-[var(--accent)]'
          : 'border-[var(--separator)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
