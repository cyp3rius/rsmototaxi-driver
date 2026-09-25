import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function StatusChip({
  children,
  tone = 'neutral',
  pulse,
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
  pulse?: boolean
  className?: string
}) {
  const tones = {
    neutral: 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]',
    success: 'tint-success text-[var(--success)]',
    warning: 'tint-warning text-[var(--warning)]',
    danger: 'tint-danger text-[var(--danger)]',
    accent: 'tint-accent text-[var(--accent)]',
  }

  return (
    <span
      className={cn(
        'inline-flex h-9 flex-none items-center gap-2 rounded-full px-3 text-[15px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {pulse !== undefined ? (
        <span
          className={cn(
            'size-2 rounded-full',
            pulse
              ? 'bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]'
              : 'border-[1.5px] border-[var(--text-tertiary)]',
          )}
        />
      ) : null}
      {children}
    </span>
  )
}
