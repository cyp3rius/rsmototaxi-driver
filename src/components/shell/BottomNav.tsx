'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, CalendarDays, Car, Home, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { isAppScopedTrip } from '@/lib/tripMeta'

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

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)]"
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
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-[3px] text-[15px] leading-5 transition-colors',
                  active
                    ? 'font-semibold text-[var(--accent)]'
                    : 'font-medium text-[var(--text-secondary)]',
                )}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={active ? 2.1 : 1.8} />
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
