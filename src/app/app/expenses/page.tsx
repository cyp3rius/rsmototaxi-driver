'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { omClient } from '@/lib/om/client'

export default function ExpensesPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void omClient
      .getExpenses({ pageSize: 50 })
      .then((res) => {
        const payload = res as { items?: Record<string, unknown>[] }
        setItems(payload.items || (Array.isArray(res) ? (res as Record<string, unknown>[]) : []))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold">Koszty</h1>
          <Link href="/app/expenses/new">
            <Button size="md" className="!w-auto px-5">
              Nowy
            </Button>
          </Link>
        </div>
        {loading ? (
          <p className="text-[var(--text-secondary)]">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Brak kosztów.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={String(item.id)} className="rounded-[18px] bg-[var(--bg-surface)] p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{String(item.costType || item.type || 'Koszt')}</span>
                  <span className="font-semibold tabular-nums">
                    {item.amountGross != null ? `${Number(item.amountGross).toFixed(2)} PLN` : '—'}
                  </span>
                </div>
                <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                  {item.occurredAt
                    ? new Date(String(item.occurredAt)).toLocaleDateString('pl-PL')
                    : item.createdAt
                      ? new Date(String(item.createdAt)).toLocaleDateString('pl-PL')
                      : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
