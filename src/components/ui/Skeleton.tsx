import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

/** Theme-aware pulse bar — uses surface-raised so light/dark both read correctly. */
export function SkeletonBar({
  className,
  rounded = 'md',
}: {
  className?: string
  rounded?: 'md' | 'full' | 'lg' | 'sm'
}) {
  const radius =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
        ? 'rounded-[14px]'
        : rounded === 'sm'
          ? 'rounded-[6px]'
          : 'rounded-[8px]'
  return (
    <span
      aria-hidden
      className={cn('block animate-pulse bg-[var(--bg-surface-raised)]', radius, className)}
    />
  )
}

/**
 * Crossfade skeleton → content (300ms).
 * When `ready`, content fades in and skeleton fades out.
 * Content stays in flow (invisible) when possible so layout does not jump;
 * if there is no content yet, the skeleton alone defines height.
 */
export function CrossfadeReveal({
  ready,
  skeleton,
  children,
  className,
}: {
  ready: boolean
  skeleton: ReactNode
  children?: ReactNode
  className?: string
}) {
  const hasContent = children != null && children !== false

  if (!hasContent) {
    return (
      <div
        className={cn(
          'transition-opacity duration-300 ease-out',
          ready ? 'pointer-events-none h-0 overflow-hidden opacity-0' : 'opacity-100',
          className,
        )}
      >
        {skeleton}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'transition-opacity duration-300 ease-out',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 transition-opacity duration-300 ease-out',
          ready ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        {skeleton}
      </div>
    </div>
  )
}

/** Missing-receipt row: expand 0 → 56px when count appears (no skeleton). */
export function ExpandReveal({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
