'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { omClient } from '@/lib/om/client'

export default function PayoutsPage() {
  const [tab, setTab] = useState<'monthly' | 'weekly'>('monthly')
  const [monthly, setMonthly] = useState<Record<string, unknown>[]>([])
  const [weekly, setWeekly] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    void Promise.all([omClient.getMonthlySettlements(), omClient.getSettlements()]).then(
      ([m, w]) => {
        const mItems = (m as { items?: Record<string, unknown>[] }).items || []
        const wItems = (w as { items?: Record<string, unknown>[] }).items || []
        setMonthly(mItems)
        setWeekly(wItems)
      },
    )
  }, [])

  const items = tab === 'monthly' ? monthly : weekly

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <h1 className="text-[22px] font-semibold">Wypłaty</h1>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('monthly')}
            className={`rounded-full px-4 py-2 text-[15px] font-medium ${
              tab === 'monthly' ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--bg-surface-raised)]'
            }`}
          >
            Miesięczne
          </button>
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className={`rounded-full px-4 py-2 text-[15px] font-medium ${
              tab === 'weekly' ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--bg-surface-raised)]'
            }`}
          >
            Tygodniowe
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const href =
              tab === 'monthly'
                ? `/app/payouts/monthly/${String(item.id)}`
                : `/app/payouts/weekly/${String(item.id)}`
            const amount =
              item.payoutAmount ?? item.totalPayout ?? item.netPayout ?? item.amount ?? null
            return (
              <li key={String(item.id)}>
                <Link href={href} className="block rounded-[18px] bg-[var(--bg-surface)] p-4">
                  <p className="text-[15px] text-[var(--text-secondary)]">
                    {String(item.periodLabel || item.weekLabel || item.monthLabel || item.status || 'Rozliczenie')}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--accent)]">
                    {amount != null ? `${Number(amount).toFixed(2)} PLN` : '—'}
                  </p>
                </Link>
              </li>
            )
          })}
          {items.length === 0 ? <p className="text-[var(--text-secondary)]">Brak pozycji.</p> : null}
        </ul>
      </div>
    </AppShell>
  )
}
