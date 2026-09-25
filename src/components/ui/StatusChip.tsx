import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function StatusChip({
  children,
  tone = 'neutral',
  pulse,
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'ink'
  pulse?: boolean
  className?: string
}) {
  const tones = {
    neutral: 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]',
    ink: 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)]',
    success: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]',
    warning: 'tint-warning text-[var(--warning)]',
    danger: 'tint-danger text-[var(--danger)]',
    accent: 'tint-accent text-[var(--accent)]',
  }

  const dot =
    pulse === true
      ? 'bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]'
      : tone === 'success'
        ? 'border-[1.5px] border-[var(--success)]'
        : tone === 'warning'
          ? 'border-[1.5px] border-[var(--warning)]'
          : tone === 'accent'
            ? 'border-[1.5px] border-[var(--accent)] bg-[var(--accent)]'
            : 'border-[1.5px] border-[var(--text-tertiary)]'

  return (
    <span
      className={cn(
        'inline-flex h-9 flex-none items-center gap-2 rounded-full text-[15px]',
        pulse ? 'pl-2.5 pr-3 font-semibold' : 'px-3 font-medium',
        tones[tone],
        className,
      )}
    >
      {pulse !== undefined ? <span className={cn('size-2 rounded-full', dot)} /> : null}
      {children}
    </span>
  )
}
