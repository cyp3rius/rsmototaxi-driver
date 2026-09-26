'use client'

import { usePathname } from 'next/navigation'
import { Banknote, CalendarDays, Car, Home, Receipt } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { isAppScopedTrip } from '@/lib/tripMeta'
import {
  forceFixedBottomReflow,
  pinFixedBottomElement,
  requestViewportSettle,
  VIEWPORT_SETTLE_EVENT,
} from '@/lib/visualViewport'

export const BOTTOM_NAV_TABS = [
  { href: '/app', label: 'Start', icon: Home },
  { href: '/app/trips', label: 'Kursy', icon: Car, badgeKey: 'receipts' as const },
  { href: '/app/expenses', label: 'Koszty', icon: Receipt },
  { href: '/app/payouts', label: 'Wypłaty', icon: Banknote },
  { href: '/app/shifts', label: 'Zmiany', icon: CalendarDays },
] as const

/** Icon + label row (content-box height — edge breath is additive below). */
export const BOTTOM_NAV_BAR_HEIGHT_PX = 64
/** Soft gradient above the nav — overlays list content (not empty padding). */
export const BOTTOM_NAV_FADE_HEIGHT_PX = 56
/** Shared with ActionBar / other chrome fades. */
export const CHROME_EDGE_FADE_GRADIENT =
  'linear-gradient(to top, var(--bg-base) 0%, color-mix(in srgb, var(--bg-base) 55%, transparent) 28%, color-mix(in srgb, var(--bg-base) 18%, transparent) 62%, transparent 100%)'
/** Breath under the icon row (part of .rs-bottom-nav-inner padding). */
export const BOTTOM_NAV_EDGE_BREATH_PX = 8

/**
 * Space content must leave for the opaque tab bar only.
 * Fade height is NOT included — the gradient overlays real list rows so it
 * reads as transparent→bg instead of a solid empty strip.
 */
export function bottomNavContentClearanceCss() {
  return `${BOTTOM_NAV_BAR_HEIGHT_PX + BOTTOM_NAV_EDGE_BREATH_PX}px`
}

const SETTLE_MS = [0, 32, 80, 160, 320, 640, 1200, 2000] as const

/**
 * Bottom nav — flush to the screen bottom.
 * Home-indicator band is part of the bar (8px breath only), not an empty gap.
 */
export function BottomNav({
  activeIndex,
  onNavigate,
  docked = true,
}: {
  activeIndex?: number
  onNavigate?: (index: number, href: string) => void
  docked?: boolean
} = {}) {
  const pathname = usePathname()
  const { session } = useAuth()
  const [missingReceipts, setMissingReceipts] = useState(0)
  const navRef = useRef<HTMLElement>(null)

  const resolvedActive =
    activeIndex ??
    BOTTOM_NAV_TABS.findIndex((tab, i) =>
      i === 0
        ? pathname === '/app' || pathname === '/app/'
        : pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    )

  useEffect(() => {
    if (!session) return
    let cancelled = false
    void omClient
      .getTrips({ pageSize: 100, missingReceipt: true })
      .then((res) => {
        if (cancelled) return
        setMissingReceipts(res.items.filter(isAppScopedTrip).length)
      })
      .catch(() => {
        if (!cancelled) setMissingReceipts(0)
      })
    return () => {
      cancelled = true
    }
  }, [session, pathname])

  useEffect(() => {
    if (docked) return
    const el = navRef.current
    if (!el) return

    const pin = () => pinFixedBottomElement(el)
    const settle = () => {
      forceFixedBottomReflow()
      pin()
    }
    settle()
    const timers = SETTLE_MS.map((ms) => window.setTimeout(settle, ms))
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      pin()
      raf2 = requestAnimationFrame(pin)
    })
    const vv = window.visualViewport
    vv?.addEventListener('resize', settle)
    window.addEventListener('resize', settle)
    window.addEventListener('orientationchange', settle)
    document.addEventListener('visibilitychange', settle)
    window.addEventListener(VIEWPORT_SETTLE_EVENT, settle)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      for (const t of timers) window.clearTimeout(t)
      vv?.removeEventListener('resize', settle)
      window.removeEventListener('resize', settle)
      window.removeEventListener('orientationchange', settle)
      document.removeEventListener('visibilitychange', settle)
      window.removeEventListener(VIEWPORT_SETTLE_EVENT, settle)
    }
  }, [pathname, docked])

  useEffect(() => {
    if (docked) return
    if (pathname !== '/app') return
    requestViewportSettle()
    const t = window.setTimeout(requestViewportSettle, 100)
    return () => window.clearTimeout(t)
  }, [pathname, docked])

  return (
    <nav
      ref={navRef}
      className={cn(
        'rs-bottom-nav z-20',
        docked ? 'absolute inset-x-0 bottom-0' : 'fixed inset-x-0 bottom-0',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full"
        style={{
          height: BOTTOM_NAV_FADE_HEIGHT_PX,
          background: CHROME_EDGE_FADE_GRADIENT,
        }}
      />
      <div className="rs-bottom-nav-inner">
        <ul className="mx-auto grid h-full max-w-lg grid-cols-5">
          {BOTTOM_NAV_TABS.map((tab, index) => {
            const active = index === resolvedActive
            const Icon = tab.icon
            const showBadge =
              'badgeKey' in tab && tab.badgeKey === 'receipts' && missingReceipts > 0
            return (
              <li key={tab.href} className="min-w-0">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  data-active={active ? 'true' : undefined}
                  onClick={() => {
                    if (onNavigate) onNavigate(index, tab.href)
                  }}
                  className={cn(
                    'relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[13px] leading-4',
                    active ? 'rs-nav-active font-semibold' : 'rs-nav-idle font-medium',
                  )}
                  style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  <span className="relative">
                    <Icon size={24} strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                    {showBadge ? (
                      <span
                        className="absolute -right-1.5 top-0 size-[9px] rounded-full border-2 border-[var(--bg-base)] bg-[var(--warning)]"
                        aria-label={`${missingReceipts} bez paragonu`}
                      />
                    ) : null}
                  </span>
                  <span className="max-w-full truncate px-0.5">{tab.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
