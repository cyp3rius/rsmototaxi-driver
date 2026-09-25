'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, CalendarDays, Car, Home, Receipt } from 'lucide-react'
import { cn } from '@/lib/cn'

const tabs = [
  { href: '/app', label: 'Start', icon: Home },
  { href: '/app/trips', label: 'Kursy', icon: Car },
  { href: '/app/expenses', label: 'Koszty', icon: Receipt },
  { href: '/app/payouts', label: 'Wypłaty', icon: Banknote },
  { href: '/app/shifts', label: 'Zmiany', icon: CalendarDays },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] bg-[var(--bg-base)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/app' && pathname.startsWith(tab.href))
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[13px] font-medium',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]',
                )}
              >
                <Icon size={22} strokeWidth={2} />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
