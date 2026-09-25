'use client'

import { cn } from '@/lib/cn'
import { usePtrRefreshing } from '@/components/ui/ptrContext'

/** Accent spinner used by pull-to-refresh and page loading states. */
export function Spinner({
  className,
  size = 'md',
  'aria-hidden': ariaHidden,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  'aria-hidden'?: boolean | 'true' | 'false'
}) {
  const dim = size === 'sm' ? 'size-5 border-[1.5px]' : size === 'lg' ? 'size-11 border-[2.5px]' : 'size-9 border-2'
  return (
    <span
      role={ariaHidden ? undefined : 'status'}
      aria-label={ariaHidden ? undefined : 'Ładowanie'}
      aria-hidden={ariaHidden}
      className={cn(
        'inline-block shrink-0 rounded-full border-[color-mix(in_srgb,var(--accent)_35%,transparent)] border-t-[var(--accent)] animate-spin',
        dim,
        className,
      )}
    />
  )
}

/**
 * Centered page/section loading state.
 * Hidden while pull-to-refresh is active so PTR spinner and page loader never stack.
 */
export function LoadingBlock({
  className,
  label = 'Ładowanie',
}: {
  className?: string
  label?: string
}) {
  const ptrRefreshing = usePtrRefreshing()
  if (ptrRefreshing) return null

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Spinner />
      <span className="sr-only">{label}</span>
    </div>
  )
}
