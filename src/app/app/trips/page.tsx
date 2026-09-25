'use client'

import Link from 'next/link'
import { Plus, Receipt, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FilterChip } from '@/components/ui/FilterChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { receiptUiStatusFromRecord, ReceiptStatusBadge } from '@/components/ui/ReceiptSheet'
import { omClient } from '@/lib/om/client'
import { endOfDayIso, formatMoneyShort, formatTime, startOfDayIso } from '@/lib/format'
import { tripRouteLabel, tripTypeLabel } from '@/lib/tripMeta'
import { Suspense } from 'react'

function TripsInner() {
  const search = useSearchParams()
  const [scope, setScope] = useState<'today' | 'all'>('today')
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [missingOverride, setMissingOverride] = useState<boolean | null>(null)
  const missingOnly = missingOverride ?? search.get('missing') === '1'
  const [missingCount, setMissingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageSize = 20

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params: Parameters<typeof omClient.getTrips>[0] = {
        page: pageNum,
        pageSize,
        missingReceipt: missingOnly || undefined,
      }
      if (scope === 'today' && !missingOnly) {
        params.startedFrom = startOfDayIso()
        params.startedTo = endOfDayIso()
      }
      const [list, missing] = await Promise.all([
        omClient.getTrips(params),
        pageNum === 1 && !missingOnly
          ? omClient.getTrips({ pageSize: 1, missingReceipt: true })
          : Promise.resolve(null),
      ])
      setItems((prev) => (append ? [...prev, ...list.items] : list.items))
      setTotal(list.total)
      setPage(pageNum)
      if (missing) setMissingCount(missing.total)
      else if (missingOnly && pageNum === 1) setMissingCount(list.total)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [missingOnly, scope])

  useEffect(() => {
    queueMicrotask(() => {
      void load(1, false)
    })
  }, [load])

  const hasMore = items.length < total

  const groups = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const sa = String(a.status)
      const sb = String(b.status)
      const rank = (s: string) => (s === 'in_progress' ? 0 : s === 'scheduled' ? 1 : 2)
      const ra = rank(sa)
      const rb = rank(sb)
      if (ra !== rb) return ra - rb
      const ta = new Date(String(a.startedAt || 0)).getTime()
      const tb = new Date(String(b.startedAt || 0)).getTime()
      if (ra === 1) return ta - tb
      return tb - ta
    })

    if (missingOnly || scope === 'all') {
      const map = new Map<string, Record<string, unknown>[]>()
      for (const trip of sorted) {
        const key = trip.startedAt
          ? new Date(String(trip.startedAt)).toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
          : 'Bez daty'
        const list = map.get(key) || []
        list.push(trip)
        map.set(key, list)
      }
      return Array.from(map.entries()).map(([title, groupItems]) => ({ title, items: groupItems }))
    }
    const live = sorted.filter((t) => t.status === 'in_progress')
    const scheduled = sorted.filter((t) => t.status === 'scheduled')
    const done = sorted.filter((t) => t.status !== 'scheduled' && t.status !== 'in_progress')
    const result: Array<{ title: string; items: Record<string, unknown>[] }> = []
    if (live.length) result.push({ title: 'W trakcie', items: live })
    if (scheduled.length) result.push({ title: 'Zaplanowane', items: scheduled })
    if (done.length) result.push({ title: 'Zakończone', items: done })
    if (!result.length && sorted.length) result.push({ title: 'Dziś', items: sorted })
    return result
  }, [items, missingOnly, scope])

  return (
    <AppShell>
      <PageHeader
        title="Kursy"
        action={
          <Link
            href="/app/trips/new"
            className="inline-flex h-12 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-[16px] font-semibold text-[var(--accent-on)]"
          >
            <Plus size={18} strokeWidth={2.4} />
            Nowy kurs
          </Link>
        }
      />
      <PullToRefresh onRefresh={() => load(1, false)}>
        <div className="px-5 pb-28 max-[390px]:px-5 sm:px-6">
          <SegmentedControl
            value={scope}
            onChange={(v) => {
              setScope(v)
              if (v === 'today') setMissingOverride(false)
            }}
            options={[
              { id: 'today', label: 'Dziś' },
              { id: 'all', label: 'Wszystkie' },
            ]}
          />
          <div className="mt-4 flex gap-2">
            <FilterChip
              active={missingOnly}
              onClick={() => setMissingOverride(!missingOnly)}
              icon={<Receipt size={16} strokeWidth={2} />}
            >
              Brak paragonu{missingCount ? ` · ${missingCount}` : ''}
            </FilterChip>
          </div>

          {loading ? (
            <p className="mt-6 text-[var(--text-secondary)]">Ładowanie…</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-[var(--text-secondary)]">Brak kursów.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="px-1 pb-2 pt-3 text-[15px] font-semibold capitalize text-[var(--text-secondary)]">
                    {group.title}
                  </p>
                  <ul className="space-y-3">
                    {group.items.map((trip) => {
                      const receiptStatus = receiptUiStatusFromRecord(trip)
                      const pending = Boolean(trip._pendingSync)
                      return (
                        <li key={String(trip.id)}>
                          <Link href={`/app/trips/${String(trip.id)}`}>
                            <SurfaceCard>
                              <div className="flex justify-between gap-2.5">
                                <span className="text-[17px] font-semibold tabular-nums">
                                  {formatTime(String(trip.startedAt || ''))}
                                  {trip.endedAt ? `–${formatTime(String(trip.endedAt))}` : ''}
                                </span>
                                <span className="text-[17px] font-semibold tabular-nums">
                                  {formatMoneyShort(trip.revenueAmount)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[16px] leading-[22px]">{tripRouteLabel(trip)}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="inline-flex h-[30px] items-center rounded-[10px] bg-[var(--bg-surface-raised)] px-2.5 text-[15px] font-medium text-[var(--text-secondary)]">
                                  {trip.platform ? String(trip.platform) : tripTypeLabel(trip.tripType)}
                                </span>
                                {trip.prepayment || trip.isPrepayment ? (
                                  <span className="inline-flex h-[30px] items-center rounded-[10px] tint-accent px-2.5 text-[15px] font-medium text-[var(--accent)]">
                                    Przedpłata
                                  </span>
                                ) : null}
                                {receiptStatus === 'missing' ? (
                                  <span className="inline-flex h-[30px] items-center rounded-[10px] px-2.5 text-[15px] font-medium tint-warning text-[var(--warning)]">
                                    Brak paragonu
                                  </span>
                                ) : receiptStatus ? (
                                  <span className="inline-flex [&_.inline-flex]:h-[30px] [&_.inline-flex]:rounded-[10px]">
                                    <ReceiptStatusBadge status={receiptStatus} />
                                  </span>
                                ) : null}
                                {pending ? (
                                  <span className="inline-flex h-[30px] items-center gap-1 rounded-[10px] bg-[var(--bg-surface-raised)] px-2.5 text-[15px] font-medium text-[var(--text-secondary)]">
                                    <RefreshCw size={14} strokeWidth={2} />
                                    Sync
                                  </span>
                                ) : null}
                                {String(trip.status) === 'pending_authorization' ? (
                                  <span className="inline-flex h-[30px] items-center rounded-[10px] tint-accent px-2.5 text-[15px] font-medium text-[var(--accent)]">
                                    Czeka na autoryzację
                                  </span>
                                ) : null}
                              </div>
                            </SurfaceCard>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {hasMore && !loading ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(page + 1, true)}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-[14px] border border-[var(--separator)] text-[16px] font-semibold"
            >
              {loadingMore ? 'Ładowanie…' : 'Pokaż więcej'}
            </button>
          ) : null}
        </div>
      </PullToRefresh>
    </AppShell>
  )
}

export default function TripsPage() {
  return (
    <Suspense fallback={<AppShell><div className="px-5 py-6 text-[var(--text-secondary)]">Ładowanie…</div></AppShell>}>
      <TripsInner />
    </Suspense>
  )
}
