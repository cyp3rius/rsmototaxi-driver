'use client'

import { ArrowDown, Check } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'
import { PtrRefreshingContext } from '@/components/ui/ptrContext'

const THRESHOLD = 72
const HOLD = 64
const RESISTANCE = 0.5
const MAX_PULL = 120
const PILL_MS = 1200
/** Extra space between the PTR spinner and the sliding content (design: not flush). */
const CONTENT_GAP = 14
const LAST_OK_KEY = 'rs-driver-ptr-last-ok'

type Phase = 'idle' | 'pulling' | 'refreshing'

type Pill = {
  offline: boolean
  at: Date
}

function readLastOk(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_OK_KEY)
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function writeLastOk(date: Date) {
  try {
    localStorage.setItem(LAST_OK_KEY, date.toISOString())
  } catch {
    // ignore
  }
}

function formatPillTime(date: Date) {
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function ProgressRing({
  progress,
  armed,
  refreshing,
}: {
  progress: number
  armed: boolean
  refreshing: boolean
}) {
  const size = 36
  const stroke = 2.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, progress))

  if (refreshing) {
    return <Spinner aria-hidden />
  }

  return (
    <span
      className={cn(
        'relative flex size-9 items-center justify-center rounded-full transition-colors duration-200',
        armed ? 'bg-[var(--accent)]' : 'bg-transparent',
      )}
      aria-hidden
    >
      {!armed ? (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--separator)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
          />
        </svg>
      ) : null}
      <ArrowDown
        size={18}
        strokeWidth={2.2}
        className={cn(
          'relative transition-transform duration-200',
          armed ? 'rotate-180 text-[var(--accent-on)]' : 'rotate-0 text-[var(--accent)]',
        )}
      />
    </span>
  )
}

function readActiveScroller(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null
  const pane = root.querySelector<HTMLElement>('[data-tab-pane]:not([hidden])')
  if (pane) return pane
  return root.querySelector<HTMLElement>('[data-scroll]')
}

/**
 * Shell-level pull-to-refresh (design 5.5).
 * Wraps the tab panes once — do not nest inside individual screens (avoids 2× scroll).
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const tracking = useRef(false)
  const pullRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')

  const [pull, setPull] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [pill, setPill] = useState<Pill | null>(null)
  const [lastOk, setLastOk] = useState<Date | null>(null)

  useEffect(() => {
    setLastOk(readLastOk())
  }, [])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    pullRef.current = pull
  }, [pull])

  const setPullBoth = useCallback((value: number) => {
    pullRef.current = value
    setPull(value)
  }, [])

  const canStartPull = useCallback(() => {
    if (disabled) return false
    if (phaseRef.current === 'refreshing') return false
    if (typeof window === 'undefined') return false
    if (window.scrollY > 1) return false
    const scroller = readActiveScroller(rootRef.current)
    if (scroller && scroller.scrollTop > 1) return false
    return true
  }, [disabled])

  const finishRefresh = useCallback(async () => {
    setPhase('refreshing')
    setPullBoth(HOLD)
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    try {
      if (offline) throw new Error('offline')
      await onRefresh()
      const now = new Date()
      writeLastOk(now)
      setLastOk(now)
      setPill({ offline: false, at: now })
    } catch {
      const at = readLastOk() || lastOk || new Date()
      setPill({ offline: true, at })
    } finally {
      setPullBoth(0)
      setPhase('idle')
      tracking.current = false
      startY.current = 0
      window.setTimeout(() => setPill(null), PILL_MS)
    }
  }, [lastOk, onRefresh, setPullBoth])

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (disabled || !canStartPull()) {
        tracking.current = false
        return
      }
      tracking.current = true
      startY.current = e.touches[0]?.clientY ?? 0
      setPhase('pulling')
    },
    [canStartPull, disabled],
  )

  const onTouchEnd = useCallback(() => {
    if (!tracking.current && phaseRef.current !== 'pulling') return
    const current = pullRef.current
    tracking.current = false
    startY.current = 0
    if (current >= THRESHOLD && phaseRef.current !== 'refreshing') {
      void finishRefresh()
      return
    }
    setPullBoth(0)
    setPhase('idle')
  }, [finishRefresh, setPullBoth])

  useEffect(() => {
    const el = rootRef.current
    if (!el || disabled) return

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || phaseRef.current === 'refreshing') return
      if (!canStartPull() && pullRef.current <= 0) {
        tracking.current = false
        return
      }
      const y = e.touches[0]?.clientY ?? 0
      const dy = y - startY.current
      if (dy <= 0) {
        setPullBoth(0)
        return
      }
      const next = Math.min(MAX_PULL, dy * RESISTANCE)
      setPullBoth(next)
      if (next > 0) e.preventDefault()
    }

    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [canStartPull, disabled, setPullBoth])

  useEffect(() => {
    if (!disabled) return
    tracking.current = false
    setPullBoth(0)
    setPhase('idle')
  }, [disabled, setPullBoth])

  const offset = phase === 'refreshing' ? HOLD : pull
  const progress = Math.min(1, pull / THRESHOLD)
  const armed = pull >= THRESHOLD
  const showHint = armed && phase === 'pulling'
  const refreshing = phase === 'refreshing'

  return (
    <PtrRefreshingContext.Provider value={refreshing}>
      <div
        ref={rootRef}
        className={cn('relative flex min-h-0 flex-1 flex-col', className)}
        style={{ overscrollBehaviorY: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {pill ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-5"
            style={{ top: 'calc(var(--safe-top) + 6px)' }}
          >
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5 shadow-[var(--sheet-shadow)]">
              {pill.offline ? null : (
                <Check size={16} strokeWidth={2.4} className="text-[var(--success)]" aria-hidden />
              )}
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                {pill.offline
                  ? `Ostatnie dane · ${formatPillTime(pill.at)}`
                  : `Zaktualizowano · ${formatPillTime(pill.at)}`}
              </span>
            </div>
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center justify-end gap-1.5 overflow-hidden pb-1"
          style={{
            top: 'var(--safe-top)',
            height: offset > 0 ? offset : 0,
          }}
        >
          {offset > 10 ? (
            <>
              <ProgressRing
                progress={refreshing ? 1 : progress}
                armed={armed || refreshing}
                refreshing={refreshing}
              />
              {showHint ? (
                <span className="pb-1 text-[13px] font-medium text-[var(--text-secondary)]">
                  Puść, aby odświeżyć
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{
            transform: offset > 0 ? `translate3d(0, ${offset + CONTENT_GAP}px, 0)` : undefined,
            transition: phase === 'pulling' ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: offset > 0 ? 'transform' : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </PtrRefreshingContext.Provider>
  )
}
