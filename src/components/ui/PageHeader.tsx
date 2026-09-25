import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  onClose,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  onClose?: () => void
  className?: string
}) {
  const hasNav = Boolean(onBack || onClose)

  return (
    <div className={cn('px-5', className)} style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
      {hasNav && onBack && !onClose ? (
        <div className="flex h-[52px] items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-full"
            aria-label="Wróć"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold">{title}</h1>
          <span className="w-11" />
        </div>
      ) : null}

      {hasNav && onClose && !onBack ? (
        <div className="flex h-[52px] items-center gap-1.5 pr-0 pl-0">
          <h1
            className="flex-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
            style={{ fontStretch: '115%' }}
          >
            {title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-[var(--bg-surface-raised)]"
            aria-label="Zamknij"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      {hasNav && onBack && onClose ? (
        <div className="flex h-[52px] items-center gap-1.5">
          <button type="button" onClick={onBack} className="flex size-11 items-center justify-center rounded-full" aria-label="Wróć">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold">{title}</h1>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full bg-[var(--bg-surface-raised)]" aria-label="Zamknij">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      {!hasNav ? (
        <div className="flex items-center justify-between gap-3 py-1.5 pb-3">
          <div className="min-w-0">
            <h1
              className="truncate font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9"
              style={{ fontStretch: '115%' }}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-0.5 text-[15px] text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}

      {hasNav && subtitle ? (
        <p className="pb-2 text-[15px] text-[var(--text-secondary)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
