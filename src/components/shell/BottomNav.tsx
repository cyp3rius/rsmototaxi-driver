'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, CalendarDays, Car, Home, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'

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
      .getTrips({ pageSize: 1, missingReceipt: true })
      .then((res) => {
        if (!cancelled) setMissingReceipts(res.total || 0)
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] bg-[var(--bg-base)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/app' && pathname.startsWith(tab.href))
          const Icon = tab.icon
          const showBadge = tab.badgeKey === 'receipts' && missingReceipts > 0
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 text-[15px] font-medium leading-5',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]',
                )}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={2} />
                  {showBadge ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[11px] font-semibold text-white">
                      {missingReceipts > 9 ? '9+' : missingReceipts}
                    </span>
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
