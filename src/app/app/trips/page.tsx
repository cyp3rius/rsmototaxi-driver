'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { omClient } from '@/lib/om/client'

export default function TripsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [missingOnly, setMissingOnly] = useState(false)
  const [missingCount, setMissingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const [list, missing] = await Promise.all([
          omClient.getTrips({ pageSize: 50, missingReceipt: missingOnly || undefined }),
          missingOnly
            ? Promise.resolve(null)
            : omClient.getTrips({ pageSize: 1, missingReceipt: true }),
        ])
        if (cancelled) return
        setItems(list.items)
        if (missing) setMissingCount(missing.total)
        else if (missingOnly) setMissingCount(list.total)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [missingOnly])

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold">Kursy</h1>
          <Link href="/app/trips/new">
            <Button size="md" className="!w-auto px-5">
              Nowy
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMissingOnly((v) => !v)}
          className={`mb-4 rounded-[10px] px-3 py-2 text-[15px] font-medium ${
            missingOnly
              ? 'tint-accent text-[var(--accent)]'
              : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]'
          }`}
        >
          Brak paragonu{missingCount ? ` · ${missingCount}` : ''}
        </button>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Brak kursów.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((trip) => (
              <li key={String(trip.id)}>
                <Link
                  href={`/app/trips/${String(trip.id)}`}
                  className="block rounded-[18px] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[17px] font-semibold">
                      {trip.startedAt
                        ? new Date(String(trip.startedAt)).toLocaleString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : '—'}
                    </span>
                    <span className="text-[15px] text-[var(--text-secondary)]">{String(trip.status)}</span>
                  </div>
                  <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                    {String(trip.tripType || '')}
                    {trip.platform ? ` · ${String(trip.platform)}` : ''}
                  </p>
                  {!trip.receiptAttachmentId && trip.tripType !== 'internal' ? (
                    <p className="mt-2 text-[15px] font-medium text-[var(--warning)]">Brak paragonu</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
