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
        'flex h-[84px] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2 text-center transition active:scale-[0.98] disabled:opacity-[0.38]',
        selected
          ? 'border-2 border-[var(--accent)] font-[600] tint-accent-soft text-[var(--accent)]'
          : 'border border-[var(--separator)] bg-[var(--bg-surface)] font-[500] text-[var(--text-primary)]',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="line-clamp-2 w-full text-[13px] leading-[16px]">{label}</span>
    </button>
  )
}
