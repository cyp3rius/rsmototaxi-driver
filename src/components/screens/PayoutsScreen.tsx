'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusChip } from '@/components/ui/StatusChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { omClient } from '@/lib/om/client'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useListSearchParams } from '@/lib/useListSearchParams'
import { useRegisterTabRefresh } from '@/lib/transitions/react/TabRefresh'
import {
  formatMonthTitle,
  formatWeekTitle,
  monthlyListLabel,
  settlementStatusLabel,
  settlementStatusTone,
} from '@/lib/settlementUi'

function PayoutsScreenInner() {
  const pathname = usePathname() || ''
  const { get, patch } = useListSearchParams()
  const onList = pathname === '/app/payouts'
  const [tab, setTab] = useState<'monthly' | 'weekly'>(() =>
    get('tab') === 'weekly' ? 'weekly' : 'monthly',
  )
  const [monthly, setMonthly] = useState<Record<string, unknown>[]>([])
  const [weekly, setWeekly] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!onList) return
    setTab(get('tab') === 'weekly' ? 'weekly' : 'monthly')
  }, [onList, get])

  const reload = useCallback(async () => {
    const [m, w] = await Promise.all([omClient.getMonthlySettlements(), omClient.getSettlements()])
    setMonthly((m as { items?: Record<string, unknown>[] }).items || [])
    setWeekly((w as { items?: Record<string, unknown>[] }).items || [])
  }, [])

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [reload])

  useRegisterTabRefresh(3, async () => {
    await reload()
  })

  const items = tab === 'monthly' ? monthly : weekly

  return (
    <>
      <PageHeader title="Wypłaty" />
      <div className="px-5 pb-6 pt-1">
          <SegmentedControl
            value={tab}
            onChange={(v) => {
              setTab(v)
              if (onList) patch({ tab: v === 'weekly' ? 'weekly' : null })
            }}
            options={[
              { id: 'monthly', label: 'Miesięczne' },
              { id: 'weekly', label: 'Tygodniowe' },
            ]}
          />
          <p className="mt-3 px-1 text-[15px] leading-5 text-[var(--text-secondary)]">
            {tab === 'monthly'
              ? 'Tylko podgląd. Rozliczenia akceptuje flota.'
              : 'Tygodniowe są kontrolne. Wypłata liczy się z rozliczenia miesięcznego.'}
          </p>

          {loading && items.length === 0 ? (
            <LoadingBlock className="mt-10" />
          ) : items.length === 0 ? (
            <p className="mt-6 text-[15px] text-[var(--text-secondary)]">
              {tab === 'monthly' ? 'Brak wypłat miesięcznych.' : 'Brak rozliczeń tygodniowych.'}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item, index) => {
                const hero = index === 0
                const href =
                  tab === 'monthly'
                    ? `/app/payouts/monthly/${String(item.id)}`
                    : `/app/payouts/weekly/${String(item.id)}`
                const title =
                  tab === 'monthly'
                    ? formatMonthTitle(item.monthStart || item.periodLabel || item.monthLabel)
                    : formatWeekTitle(item.weekStart || item.periodLabel || item.weekLabel)
                const label =
                  tab === 'monthly' ? monthlyListLabel(item.status) : 'Wypłata końcowa'
                const amount =
                  item.payoutAmount ?? item.totalPayout ?? item.netPayout ?? item.amount
                const status = settlementStatusLabel(item.status)
                const tone = settlementStatusTone(item.status)

                return (
                  <li key={String(item.id)}>
                    <Link href={href} className="block active:scale-[0.98] transition-transform duration-100">
                      <SurfaceCard
                        padding={hero ? 'lg' : 'md'}
                        className={cn(hero ? 'p-5' : 'p-4')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[17px] font-semibold">{title}</span>
                          <StatusChip tone={tone}>{status}</StatusChip>
                        </div>
                        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">{label}</p>
                        <p
                          className={cn(
                            'mt-0.5 font-[family-name:var(--font-display)] font-semibold tabular-nums leading-[1.1]',
                            hero
                              ? 'text-[38px] text-[var(--accent)]'
                              : 'text-[24px] text-[var(--text-primary)]',
                          )}
                          style={{ fontStretch: hero ? '125%' : '112%' }}
                        >
                          {formatMoney(amount)}
                        </p>
                      </SurfaceCard>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
    </>
  )
}

export function PayoutsScreen() {
  return (
    <Suspense fallback={<LoadingBlock className="px-5 py-16" />}>
      <PayoutsScreenInner />
    </Suspense>
  )
}
