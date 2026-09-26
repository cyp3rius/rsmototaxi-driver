'use client'

import { useParams } from 'next/navigation'
import { useStackBack } from '@/lib/transitions/react/StackLayer'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BOTTOM_EDGE_FADE_PAD_PX } from '@/components/ui/BottomEdgeFade'
import { SettlementContactNote } from '@/components/ui/SettlementContactNote'
import { LoadingBlock } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { omClient } from '@/lib/om/client'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import {
  formatWeekTitle,
  settlementStatusLabel,
  settlementStatusTone,
  weeklyBreakdownRows,
  weeklyDetailNote,
} from '@/lib/settlementUi'

export default function WeeklyPayoutDetailPage() {
  const params = useParams<{ id: string }>()
  const stackBack = useStackBack()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    void omClient
      .getSettlement(params.id)
      .then((res) => setData(res as Record<string, unknown>))
      .catch(() => setError(true))
  }, [params.id])

  const amount = data?.payoutAmount ?? data?.totalPayout ?? data?.netPayout ?? data?.amount ?? null
  const rows = useMemo(() => (data ? weeklyBreakdownRows(data) : []), [data])
  const title = data ? formatWeekTitle(data.weekStart || data.periodLabel || data.weekLabel, { withYear: true }) : '—'
  const status = settlementStatusLabel(data?.status)
  const tone = settlementStatusTone(data?.status)
  const note = data ? weeklyDetailNote(data.weekStart) : ''

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Rozliczenie tygodniowe" onBack={stackBack} />
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 pt-3"
        data-scroll
        style={{ paddingBottom: BOTTOM_EDGE_FADE_PAD_PX }}
      >
        {error ? (
          <p className="mt-6 text-[15px] text-[var(--text-secondary)]">
            Nie udało się wczytać rozliczenia.
          </p>
        ) : !data ? (
          <LoadingBlock className="mt-10" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[17px] font-semibold">{title}</span>
              <StatusChip tone={tone}>{status}</StatusChip>
            </div>

            <p className="mt-6 text-[15px] text-[var(--text-secondary)]">Wypłata końcowa</p>
            <p
              className="font-[family-name:var(--font-display)] text-[44px] font-semibold leading-[1.05] tabular-nums text-[var(--accent)]"
              style={{ fontStretch: '125%' }}
            >
              {formatMoney(amount)}
            </p>
            {note ? <p className="mt-1.5 text-[15px] text-[var(--text-secondary)]">{note}</p> : null}

            <SurfaceCard className="mt-6 overflow-hidden !rounded-[20px] !p-0">
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className={cn(
                    'flex justify-between gap-3 px-4 py-3.5',
                    index < rows.length - 1 ? 'border-b border-[var(--separator)]' : null,
                    row.strong ? 'bg-[var(--bg-surface-raised)] text-[17px] font-semibold' : 'text-[16px] font-normal',
                  )}
                >
                  <span className={row.strong ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                    {row.label}
                  </span>
                  <span className="tabular-nums">{row.value}</span>
                </div>
              ))}
            </SurfaceCard>

            <SettlementContactNote />
          </>
        )}
      </div>
    </div>
  )
}
