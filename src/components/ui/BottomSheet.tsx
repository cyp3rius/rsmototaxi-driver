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
  titleClassName,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  titleClassName?: string
}) {
  const [visible, setVisible] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
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
        className={cn('absolute inset-0 bg-black/50 transition', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-auto rounded-t-[32px] bg-[var(--bg-surface)] px-5 pb-[calc(var(--safe-bottom)+24px)] pt-2.5 shadow-[var(--sheet-shadow)] transition-transform duration-200 max-[390px]:max-h-[100dvh] max-[390px]:rounded-t-[24px] sm:px-6',
          open ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
      >
        <div className="mx-auto mb-1.5 flex justify-center py-2.5">
          <span className="h-1.5 w-10 rounded-[3px] bg-[var(--separator)]" />
        </div>
        {title ? (
          <h2 className={cn('mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9', titleClassName)} style={{ fontStretch: '115%' }}>
            {title}
          </h2>
        ) : null}
        {subtitle ? <p className="mt-1.5 text-[17px] leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
        <div className={title || subtitle ? 'mt-4' : undefined}>{children}</div>
      </div>
    </div>
  )
}
