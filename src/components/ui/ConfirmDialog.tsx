'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

const ENTER_MS = 220
const EXIT_MS = 180
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Centered confirm dialog that stacks above bottom sheets (higher z-index). */
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  className,
  zClassName = 'z-[60]',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  zClassName?: string
}) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (open) {
      let raf2 = 0
      queueMicrotask(() => {
        setMounted(true)
        setEntered(false)
      })
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    queueMicrotask(() => setEntered(false))
    const t = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open])

  if (!mounted || !portalReady) return null

  return createPortal(
    <div className={cn('fixed inset-0', zClassName)}>
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 bg-black/50"
        style={{
          opacity: entered ? 1 : 0,
          transition: `opacity ${ENTER_MS}ms ${EASE}`,
        }}
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'pointer-events-auto w-full max-w-[340px] rounded-[24px] bg-[var(--bg-surface)] p-5 shadow-[0_16px_48px_rgba(2,4,7,0.28)]',
            className,
          )}
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
            transition: `opacity ${ENTER_MS}ms ${EASE}, transform ${ENTER_MS}ms ${EASE}`,
          }}
        >
          <h2
            className="font-[family-name:var(--font-display)] text-[26px] font-[600] leading-8"
            style={{ fontStretch: '115%' }}
          >
            {title}
          </h2>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
