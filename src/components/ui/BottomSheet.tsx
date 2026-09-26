'use client'

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { BottomEdgeFade, BOTTOM_EDGE_FADE_PAD_PX } from '@/components/ui/BottomEdgeFade'
import { cn } from '@/lib/cn'

const ENTER_MS = 360
const EXIT_MS = 320
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  titleClassName,
  expanded,
  zClassName = 'z-50',
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  titleClassName?: string
  expanded?: boolean
  /** Stack sheets: default z-50; use z-[55]+ for sheets above another sheet. */
  zClassName?: string
}) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const dragActive = useRef(false)
  const pointerId = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const dragYRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [keyboardPad, setKeyboardPad] = useState(0)
  const [closingByDrag, setClosingByDrag] = useState(false)
  const closingByDragRef = useRef(false)

  function setDrag(y: number) {
    dragYRef.current = y
    setDragY(y)
  }

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (open) {
      let raf2 = 0
      queueMicrotask(() => {
        closingByDragRef.current = false
        setClosingByDrag(false)
        setMounted(true)
        setDrag(0)
        setDragging(false)
        setEntered(false)
      })
      const raf1 = requestAnimationFrame(() => {
        // Force layout so translateY(100%) paints before we animate to 0
        void panelRef.current?.getBoundingClientRect()
        raf2 = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }

    queueMicrotask(() => {
      setEntered(false)
      if (!closingByDragRef.current) setDrag(0)
    })
    const t = window.setTimeout(() => {
      setMounted(false)
      setDrag(0)
      setDragging(false)
      closingByDragRef.current = false
      setClosingByDrag(false)
    }, EXIT_MS)
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

  function beginDrag(clientY: number) {
    if (!entered || closingByDrag || !open) return false
    const scrollEl = scrollRef.current
    if (!scrollEl || scrollEl.scrollTop > 0) return false
    startY.current = clientY
    dragActive.current = true
    setDragging(true)
    return true
  }

  function moveDrag(clientY: number) {
    if (!dragActive.current) return
    const dy = clientY - startY.current
    if (dy > 0) setDrag(Math.min(dy, window.innerHeight * 0.92))
  }

  function endDrag() {
    if (!dragActive.current) return
    dragActive.current = false
    pointerId.current = null
    const threshold = Math.min(110, window.innerHeight * 0.16)
    if (dragYRef.current > threshold) {
      closingByDragRef.current = true
      setClosingByDrag(true)
      setDragging(false)
      setDrag(window.innerHeight)
      window.setTimeout(() => onClose(), EXIT_MS)
    } else {
      setDragging(false)
      setDrag(0)
    }
    startY.current = 0
  }

  function onHandlePointerDown(e: ReactPointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (!beginDrag(e.clientY)) return
    pointerId.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onHandlePointerMove(e: ReactPointerEvent) {
    if (!dragActive.current || pointerId.current !== e.pointerId) return
    moveDrag(e.clientY)
  }

  function onHandlePointerUp(e: ReactPointerEvent) {
    if (pointerId.current !== null && pointerId.current !== e.pointerId) return
    endDrag()
  }

  if (!mounted || !portalReady) return null

  const usingPx = closingByDrag || dragY > 0 || dragging
  const panelTransform = usingPx
    ? `translate3d(0, ${dragY}px, 0)`
    : entered
      ? 'translate3d(0, 0, 0)'
      : 'translate3d(0, 100%, 0)'

  const backdropOpacity = !entered
    ? 0
    : dragY > 0
      ? Math.max(0, 1 - dragY / 320)
      : 1

  // Portal to body so overflow/transform on tab chrome cannot clip or bury the sheet under the nav.
  return createPortal(
    <div className={cn('fixed inset-0', zClassName)}>
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 bg-black/50"
        style={{
          opacity: backdropOpacity,
          transition: dragging ? 'none' : `opacity ${ENTER_MS}ms ${EASE}`,
        }}
        onClick={() => {
          if (closingByDrag) return
          onClose()
        }}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[32px] border-t border-transparent bg-[var(--bg-surface)] shadow-[var(--sheet-shadow)] will-change-transform dark:border-[var(--separator)]',
          expanded
            ? 'max-h-[calc(100dvh-var(--safe-top))] min-h-[72dvh] max-[390px]:min-h-[calc(100dvh-var(--safe-top))]'
            : 'max-h-[92dvh]',
          className,
        )}
        data-sheet-panel
        style={{
          transform: panelTransform,
          transition: dragging ? 'none' : `transform ${entered ? ENTER_MS : EXIT_MS}ms ${EASE}`,
          overscrollBehavior: 'none',
        }}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto px-6 pt-2.5"
          data-scroll
          style={{
            paddingBottom: `calc(var(--safe-bottom) + ${BOTTOM_EDGE_FADE_PAD_PX}px + ${keyboardPad}px)`,
            overscrollBehavior: 'none',
          }}
        >
          <div
            className="mx-auto mb-1.5 flex touch-none select-none justify-center py-2.5"
            data-sheet-handle
            style={{ touchAction: 'none', cursor: 'grab' }}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
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
        <BottomEdgeFade fromVar="--bg-surface" />
      </div>
    </div>,
    document.body,
  )
}
