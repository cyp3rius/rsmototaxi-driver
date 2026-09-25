import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

export function SurfaceCard({
  children,
  className,
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}) {
  const pad = padding === 'lg' ? 'p-5' : padding === 'sm' ? 'p-3' : 'p-4'
  return (
    <div className={cn('rounded-[20px] border border-[var(--separator)] bg-[var(--bg-surface)]', pad, className)}>
      {children}
    </div>
  )
}
