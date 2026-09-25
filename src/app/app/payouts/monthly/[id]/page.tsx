'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { omClient } from '@/lib/om/client'

export default function MonthlyPayoutDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    void omClient.getMonthlySettlement(params.id).then((res) => setData(res as Record<string, unknown>))
  }, [params.id])

  const amount = data?.payoutAmount ?? data?.totalPayout ?? data?.netPayout ?? null

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button type="button" className="mb-3 text-[15px] text-[var(--accent)]" onClick={() => router.back()}>
          Wróć
        </button>
        <h1 className="text-[22px] font-semibold">Wypłata miesięczna</h1>
        <p className="mt-6 font-[family-name:var(--font-display)] text-[40px] font-semibold text-[var(--accent)]">
          {amount != null ? `${Number(amount).toFixed(2)} PLN` : '—'}
        </p>
        {data ? (
          <ul className="mt-6 space-y-2 text-[17px]">
            <li className="flex justify-between rounded-[14px] bg-[var(--bg-surface)] px-4 py-3">
              <span className="text-[var(--text-secondary)]">Status</span>
              <span>{String(data.status || '—')}</span>
            </li>
            <li className="flex justify-between rounded-[14px] bg-[var(--bg-surface)] px-4 py-3">
              <span className="text-[var(--text-secondary)]">Okres</span>
              <span>{String(data.monthLabel || data.periodLabel || '—')}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-4 text-[var(--text-secondary)]">Ładowanie…</p>
        )}
      </div>
    </AppShell>
  )
}
