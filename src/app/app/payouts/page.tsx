'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { omClient } from '@/lib/om/client'
import { formatMoney } from '@/lib/format'

export default function PayoutsPage() {
  const [tab, setTab] = useState<'monthly' | 'weekly'>('monthly')
  const [monthly, setMonthly] = useState<Record<string, unknown>[]>([])
  const [weekly, setWeekly] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    void Promise.all([omClient.getMonthlySettlements(), omClient.getSettlements()]).then(([m, w]) => {
      setMonthly((m as { items?: Record<string, unknown>[] }).items || [])
      setWeekly((w as { items?: Record<string, unknown>[] }).items || [])
    })
  }, [])

  const items = tab === 'monthly' ? monthly : weekly

  return (
    <AppShell>
      <PageHeader title="Wypłaty" />
      <div className="px-5 pb-28">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { id: 'monthly', label: 'Miesięczne' },
            { id: 'weekly', label: 'Tygodniowe' },
          ]}
        />
        <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
          {tab === 'monthly'
            ? 'Wypłaty miesięczne — tylko podgląd.'
            : 'Rozliczenia tygodniowe mają charakter kontrolny.'}
        </p>

        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const href =
              tab === 'monthly'
                ? `/app/payouts/monthly/${String(item.id)}`
                : `/app/payouts/weekly/${String(item.id)}`
            const amount = item.payoutAmount ?? item.totalPayout ?? item.netPayout ?? item.amount ?? null
            return (
              <li key={String(item.id)}>
                <Link href={href}>
                  <SurfaceCard padding="lg">
                    <p className="text-[15px] text-[var(--text-secondary)]">
                      {String(
                        item.periodLabel || item.weekLabel || item.monthLabel || item.status || 'Rozliczenie',
                      )}
                    </p>
                    <p
                      className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[var(--accent)]"
                      style={{ fontStretch: '115%' }}
                    >
                      {formatMoney(amount)}
                    </p>
                  </SurfaceCard>
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
