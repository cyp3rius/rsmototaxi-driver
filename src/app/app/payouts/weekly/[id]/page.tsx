'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { omClient } from '@/lib/om/client'

export default function WeeklyPayoutDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    void omClient.getSettlement(params.id).then((res) => setData(res as Record<string, unknown>))
  }, [params.id])

  const amount = data?.payoutAmount ?? data?.totalPayout ?? data?.netPayout ?? null

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button type="button" className="mb-3 text-[15px] text-[var(--accent)]" onClick={() => router.back()}>
          Wróć
        </button>
        <h1 className="text-[22px] font-semibold">Rozliczenie tygodniowe</h1>
        <p className="mt-6 font-[family-name:var(--font-display)] text-[40px] font-semibold text-[var(--accent)]">
          {amount != null ? `${Number(amount).toFixed(2)} PLN` : '—'}
        </p>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">Podgląd kontrolny — bez edycji.</p>
        {data ? (
          <pre className="mt-6 overflow-auto rounded-[18px] bg-[var(--bg-surface)] p-4 text-[12px] text-[var(--text-secondary)]">
            {JSON.stringify(
              {
                status: data.status,
                weekStart: data.weekStart,
                weekEnd: data.weekEnd,
                totalDistanceKm: data.totalDistanceKm,
                revenueAmount: data.revenueAmount,
              },
              null,
              2,
            )}
          </pre>
        ) : (
          <p className="mt-4 text-[var(--text-secondary)]">Ładowanie…</p>
        )}
      </div>
    </AppShell>
  )
}
