'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { omClient } from '@/lib/om/client'
import { formatMoney } from '@/lib/format'

function rowsFromSettlement(data: Record<string, unknown> | null) {
  if (!data) return []
  const candidates: Array<[string, unknown]> = [
    ['Przychód', data.revenueAmount ?? data.grossRevenue ?? data.totalRevenue],
    ['Koszty', data.expensesAmount ?? data.totalExpenses ?? data.costsAmount],
    ['Netto', data.netAmount ?? data.netRevenue],
    ['Procent wypłaty', data.payoutPercent != null ? `${data.payoutPercent}%` : null],
    ['Udział kierowcy', data.driverShare ?? data.shareAmount],
    ['Bonus', data.bonusAmount ?? data.bonus],
    ['Rekompensata', data.compensationAmount ?? data.compensation],
    ['Wypłata końcowa', data.payoutAmount ?? data.totalPayout ?? data.netPayout ?? data.amount],
  ]
  return candidates.filter(([, v]) => v != null && v !== '')
}

export default function MonthlyPayoutDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    void omClient.getMonthlySettlement(params.id).then((res) => setData(res as Record<string, unknown>))
  }, [params.id])

  const amount = data?.payoutAmount ?? data?.totalPayout ?? data?.netPayout ?? null
  const rows = useMemo(() => rowsFromSettlement(data), [data])

  return (
    <AppShell hideNav>
      <PageHeader title="Wypłata miesięczna" onBack={() => router.back()} />
      <div className="px-5 pb-10">
        <p className="text-[15px] text-[var(--text-secondary)]">
          {String(data?.monthLabel || data?.periodLabel || '—')}
        </p>
        <p
          className="mt-2 font-[family-name:var(--font-display)] text-[40px] font-semibold text-[var(--accent)]"
          style={{ fontStretch: '118%' }}
        >
          {formatMoney(amount)}
        </p>

        {data ? (
          <SurfaceCard className="mt-6 overflow-hidden !p-0">
            {rows.map(([label, value], index) => {
              const isFinal = label === 'Wypłata końcowa' || label === 'Netto'
              return (
                <div
                  key={`${label}-${index}`}
                  className="flex justify-between gap-3 border-b border-[var(--separator)] px-4 py-3.5 text-[15px] last:border-0"
                >
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className={`text-right font-medium tabular-nums ${isFinal ? 'font-semibold text-[var(--text-primary)]' : ''}`}>
                    {typeof value === 'string' && value.includes('%') ? value : formatMoney(value)}
                  </span>
                </div>
              )
            })}
            <div className="flex justify-between gap-3 px-4 py-3.5 text-[15px]">
              <span className="text-[var(--text-secondary)]">Status</span>
              <span className="font-medium">{String(data.status || '—')}</span>
            </div>
          </SurfaceCard>
        ) : (
          <p className="mt-4 text-[var(--text-secondary)]">Ładowanie…</p>
        )}
      </div>
    </AppShell>
  )
}
