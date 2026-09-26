'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  attachEdgeSwipe,
  popDetail,
  pushDetail,
  type StackEls,
} from '@/lib/transitions/stackTransition'
import { BottomEdgeFade } from '@/components/ui/BottomEdgeFade'
import {
  lockAppViewport,
  pinFixedChromeToVisualViewport,
  requestViewportSettle,
  syncVisualViewportCssVars,
  unlockAppViewport,
  VIEWPORT_SETTLE_EVENT,
} from '@/lib/visualViewport'

type StackBackFn = () => void

const StackBackContext = createContext<StackBackFn | null>(null)

/** Back control for detail screens inside 1c stack (animates, then navigates). */
export function useStackBack(fallback?: () => void) {
  const stackBack = useContext(StackBackContext)
  const router = useRouter()
  return useCallback(() => {
    if (stackBack) {
      stackBack()
      return
    }
    if (fallback) {
      fallback()
      return
    }
    router.back()
  }, [stackBack, fallback, router])
}

/**
 * 1c · list (with bottom nav) under detail. Detail slides from the right;
 * list parallax −25% + dim. Edge swipe from 24px + programmatic back.
 */
export function StackLayer({
  open,
  detail,
  list,
  onClosed,
}: {
  open: boolean
  detail: ReactNode | null
  list: ReactNode
  onClosed: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)
  const closingRef = useRef(false)
  const [shown, setShown] = useState<ReactNode | null>(open ? detail : null)

  const els = useCallback((): StackEls | null => {
    if (!listRef.current || !dimRef.current || !detailRef.current) return null
    return { list: listRef.current, dim: dimRef.current, detail: detailRef.current }
  }, [])

  const finishClose = useCallback(() => {
    openRef.current = false
    setShown(null)
    onClosed()
    // Keep closingRef true until `open` prop flips false after router.back().
  }, [onClosed])

  const requestClose = useCallback(() => {
    if (closingRef.current || !openRef.current) return
    closingRef.current = true
    const e = els()
    if (!e) {
      finishClose()
      return
    }
    void popDetail(e).then(finishClose)
  }, [els, finishClose])

  useLayoutEffect(() => {
    const e = els()
    if (!e) return

    if (open) {
      // After animated close we call router.back(); ignore stale open=true until URL updates.
      if (closingRef.current) return
      setShown(detail)
      if (!openRef.current) {
        openRef.current = true
        void pushDetail(e)
      }
      return
    }

    closingRef.current = false
    if (openRef.current) {
      closingRef.current = true
      void popDetail(e).then(() => {
        openRef.current = false
        closingRef.current = false
        setShown(null)
      })
    }
  }, [open, detail, els])

  useEffect(() => {
    if (open && detail) setShown(detail)
  }, [open, detail])

  useEffect(() => {
    const e = els()
    if (!e || !shown || !openRef.current) return
    return attachEdgeSwipe(e, finishClose)
  }, [!!shown, els, finishClose])

  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return

    lockAppViewport()

    const pin = () => {
      pinFixedChromeToVisualViewport(el)
      syncVisualViewportCssVars()
    }

    pin()
    requestViewportSettle()
    pin()

    const timers = [50, 160, 400, 800, 1600].map((ms) => window.setTimeout(pin, ms))
    const vv = window.visualViewport
    vv?.addEventListener('resize', pin)
    window.addEventListener('resize', pin)
    window.addEventListener('orientationchange', pin)
    window.addEventListener(VIEWPORT_SETTLE_EVENT, pin)
    document.addEventListener('visibilitychange', pin)

    return () => {
      for (const t of timers) window.clearTimeout(t)
      vv?.removeEventListener('resize', pin)
      window.removeEventListener('resize', pin)
      window.removeEventListener('orientationchange', pin)
      window.removeEventListener(VIEWPORT_SETTLE_EVENT, pin)
      document.removeEventListener('visibilitychange', pin)
      unlockAppViewport()
    }
  }, [])

  return (
    <StackBackContext.Provider value={requestClose}>
      <div ref={rootRef} className="rs-driver-chrome z-0">
        <div ref={listRef} className="absolute inset-0 flex h-full min-h-0 flex-col">
          {list}
        </div>
        <div
          ref={dimRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[45]"
          style={{ background: '#020407', opacity: 0 }}
        />
        <div
          ref={detailRef}
          hidden
          className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[var(--bg-base)]"
          style={{
            transform: 'translateX(100%)',
            touchAction: 'pan-y',
            overscrollBehavior: 'none',
          }}
        >
          <div className="relative flex h-full min-h-0 flex-col" data-scroll-root>
            {shown}
            <BottomEdgeFade />
          </div>
        </div>
      </div>
    </StackBackContext.Provider>
  )
}
