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

  const ring =
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
        'inline-flex h-[30px] flex-none items-center gap-1.5 rounded-[10px] px-2.5 text-[15px]',
        pulse ? 'font-semibold' : 'font-medium',
        tones[tone],
        className,
      )}
    >
      {pulse !== undefined ? <span className={cn('size-1.5 rounded-full', ring)} /> : null}
      {children}
    </span>
  )
}
