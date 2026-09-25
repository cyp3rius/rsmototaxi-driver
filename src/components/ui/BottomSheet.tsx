'use client'

import { useEffect, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { cn } from '@/lib/cn'

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  titleClassName,
  /** Login/SE: fill most of the viewport */
  expanded,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  titleClassName?: string
  expanded?: boolean
}) {
  const [visible, setVisible] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [keyboardPad, setKeyboardPad] = useState(0)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    const t = window.setTimeout(() => {
      setVisible(false)
      setDragY(0)
    }, 220)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      const occluded = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardPad(occluded > 40 ? occluded : 0)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [open])

  function onTouchStart(e: ReactTouchEvent) {
    const el = panelRef.current
    if (!el || el.scrollTop > 0) return
    startY.current = e.touches[0]?.clientY ?? 0
  }

  function onTouchMove(e: ReactTouchEvent) {
    if (!startY.current) return
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current
    if (dy > 0) setDragY(Math.min(dy, 220))
  }

  function onTouchEnd() {
    if (dragY > 96) onClose()
    setDragY(0)
    startY.current = 0
  }

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
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          'absolute inset-x-0 bottom-0 overflow-auto rounded-t-[32px] border-t border-transparent bg-[var(--bg-surface)] px-6 pt-2.5 shadow-[var(--sheet-shadow)] transition-transform duration-200 dark:border-[var(--separator)]',
          expanded
            ? 'max-h-[calc(100dvh-var(--safe-top))] min-h-[72dvh] max-[390px]:min-h-[calc(100dvh-var(--safe-top))]'
            : 'max-h-[92dvh]',
          open && dragY === 0 ? 'translate-y-0' : open ? '' : 'translate-y-full',
          className,
        )}
        style={{
          paddingBottom: `calc(var(--safe-bottom) + 16px + ${keyboardPad}px)`,
          transform: open
            ? dragY
              ? `translateY(${dragY}px)`
              : undefined
            : 'translateY(100%)',
          transition: dragY ? 'none' : undefined,
        }}
      >
        <div className="mx-auto mb-1.5 flex justify-center py-2.5">
          <span className="h-1.5 w-10 rounded-[3px] bg-[var(--separator)]" />
        </div>
        {title ? (
          <h2
            className={cn(
              'mt-2 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9',
              titleClassName,
            )}
            style={{ fontStretch: '115%' }}
          >
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <p className="mt-1.5 text-[17px] leading-6 text-[var(--text-secondary)]">{subtitle}</p>
        ) : null}
        <div className={title || subtitle ? 'mt-4' : undefined}>{children}</div>
      </div>
    </div>
  )
}
