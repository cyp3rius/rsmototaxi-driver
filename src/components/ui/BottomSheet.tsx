'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setVisible(true)
    else {
      const t = window.setTimeout(() => setVisible(false), 220)
      return () => window.clearTimeout(t)
    }
  }, [open])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Zamknij"
        className={cn(
          'absolute inset-0 bg-black/50 transition',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-auto rounded-t-[32px] bg-[var(--bg-surface)] px-6 pb-[calc(var(--safe-bottom)+24px)] pt-6 transition-transform duration-200',
          open ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--separator)]" />
        {title ? <h2 className="text-[22px] font-semibold leading-7">{title}</h2> : null}
        {subtitle ? <p className="mt-1.5 text-[15px] leading-5 text-[var(--text-secondary)]">{subtitle}</p> : null}
        <div className={title || subtitle ? 'mt-4' : undefined}>{children}</div>
      </div>
    </div>
  )
}
