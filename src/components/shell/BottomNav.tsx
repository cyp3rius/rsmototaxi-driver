'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, CalendarDays, Car, Home, Receipt } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { isAppScopedTrip } from '@/lib/tripMeta'
import {
  forceFixedBottomReflow,
  readVisualViewportBottomY,
  syncVisualViewportCssVars,
} from '@/lib/visualViewport'

const tabs = [
  { href: '/app', label: 'Start', icon: Home },
  { href: '/app/trips', label: 'Kursy', icon: Car, badgeKey: 'receipts' as const },
  { href: '/app/expenses', label: 'Koszty', icon: Receipt },
  { href: '/app/payouts', label: 'Wypłaty', icon: Banknote },
  { href: '/app/shifts', label: 'Zmiany', icon: CalendarDays },
]

export function BottomNav() {
  const pathname = usePathname()
  const { session } = useAuth()
  const [missingReceipts, setMissingReceipts] = useState(0)
  const navRef = useRef<HTMLElement>(null)

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
    const el = navRef.current
    if (!el) return

    const pin = () => {
      syncVisualViewportCssVars()
      const vvBottom = readVisualViewportBottomY()
      const height = el.offsetHeight
      if (!window.visualViewport) {
        el.style.top = ''
        el.style.bottom = '0px'
        return
      }
      // Pin the nav’s bottom edge to the visual viewport bottom (not stale layout bottom).
      el.style.bottom = 'auto'
      el.style.top = `${Math.max(0, vvBottom - height)}px`
    }

    pin()
    forceFixedBottomReflow()
    pin()

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      pin()
      raf2 = requestAnimationFrame(pin)
    })
    // After morph → dashboard, Safari often settles VV one tick later.
    const t1 = window.setTimeout(pin, 50)
    const t2 = window.setTimeout(() => {
      forceFixedBottomReflow()
      pin()
    }, 180)
    const t3 = window.setTimeout(pin, 400)

    const vv = window.visualViewport
    vv?.addEventListener('resize', pin)
    vv?.addEventListener('scroll', pin)
    window.addEventListener('resize', pin)
    window.addEventListener('orientationchange', pin)
    document.addEventListener('visibilitychange', pin)

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      vv?.removeEventListener('resize', pin)
      vv?.removeEventListener('scroll', pin)
      window.removeEventListener('resize', pin)
      window.removeEventListener('orientationchange', pin)
      document.removeEventListener('visibilitychange', pin)
    }
  }, [pathname])

  return (
    <nav
      ref={navRef}
      className="rs-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)]"
      style={{
        paddingBottom: 'var(--safe-bottom)',
        background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || (tab.href !== '/app' && pathname.startsWith(tab.href))
          const Icon = tab.icon
          const showBadge = tab.badgeKey === 'receipts' && missingReceipts > 0
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : undefined}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-[3px] text-[15px] leading-5',
                  active ? 'rs-nav-active font-semibold' : 'rs-nav-idle font-medium',
                )}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                  {showBadge ? (
                    <span
                      className="absolute -right-1.5 top-0 size-[9px] rounded-full border-2 border-[var(--bg-surface)] bg-[var(--warning)]"
                      aria-label={`${missingReceipts} bez paragonu`}
                    />
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
