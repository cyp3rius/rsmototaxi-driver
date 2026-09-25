'use client'

import Link from 'next/link'
import { Plus, Receipt, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { LoadingBlock } from '@/components/ui/Spinner'
import { InfiniteScrollSentinel, INFINITE_PAGE_SIZE } from '@/components/ui/InfiniteScrollSentinel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FilterChip } from '@/components/ui/FilterChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { receiptUiStatusFromRecord, ReceiptStatusBadge } from '@/components/ui/ReceiptSheet'
import { StatusChip } from '@/components/ui/StatusChip'
import { omClient } from '@/lib/om/client'
import { endOfDayIso, formatMoneyShort, formatTime, startOfDayIso } from '@/lib/format'
import { useListSearchParams } from '@/lib/useListSearchParams'
import {
  isAppScopedTrip,
  readTripMeta,
  tripPaymentLabel,
  tripRouteLabel,
  tripStatusChipLabel,
  tripTypeLabel,
} from '@/lib/tripMeta'

function TripListCard({ trip }: { trip: Record<string, unknown> }) {
  const receiptStatus = receiptUiStatusFromRecord(trip)
  const pending = Boolean(trip._pendingSync)
  const meta = readTripMeta(trip)
  const prepaid = Boolean(meta.prepaid || meta.isPrepayment || trip.prepayment || trip.isPrepayment)
  const payment = tripPaymentLabel(trip)
  const statusLabel = tripStatusChipLabel(trip.status)
  const typeLabel = trip.platform
    ? String(trip.platform)
    : tripTypeLabel(trip.tripType)
  const showCompletedChip =
    statusLabel === 'Zakończony' &&
    !pending &&
    String(trip.status) !== 'pending_authorization'

  return (
    <Link href={`/app/trips/${String(trip.id)}`} className="block">
      <SurfaceCard className="rounded-[20px]" padding="md">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-2.5">
            <span className="text-[17px] font-semibold tabular-nums">
              {formatTime(String(trip.startedAt || ''))}
              {trip.endedAt ? `–${formatTime(String(trip.endedAt))}` : ''}
            </span>
            <span className="text-[17px] font-semibold tabular-nums">
              {formatMoneyShort(trip.revenueAmount)}
            </span>
          </div>
          <p className="text-[16px] leading-[22px] text-[var(--text-primary)]">
            {tripRouteLabel(trip)}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {showCompletedChip ? (
              <StatusChip tone="success">{statusLabel}</StatusChip>
            ) : null}
            {String(trip.status) === 'in_progress' ? (
              <StatusChip tone="accent" pulse>
                W trakcie
              </StatusChip>
            ) : null}
            {String(trip.status) === 'scheduled' ? (
              <StatusChip tone="neutral">Zaplanowany</StatusChip>
            ) : null}
            {String(trip.status) === 'pending_authorization' ? (
              <StatusChip tone="accent">Czeka na autoryzację</StatusChip>
            ) : null}
            <StatusChip tone="neutral">{typeLabel}</StatusChip>
            {prepaid ? <StatusChip tone="accent">Przedpłata</StatusChip> : null}
            {receiptStatus === 'missing' ? (
              <StatusChip tone="warning">Brak paragonu</StatusChip>
            ) : receiptStatus ? (
              <ReceiptStatusBadge status={receiptStatus} />
            ) : null}
            {payment ? <StatusChip tone="neutral">{payment}</StatusChip> : null}
            {pending ? (
              <StatusChip tone="neutral">
                <RefreshCw size={14} strokeWidth={2} className="mr-0.5" />
                Sync
              </StatusChip>
            ) : null}
          </div>
        </div>
      </SurfaceCard>
    </Link>
  )
}

function TripsScreenInner() {
  const pathname = usePathname() || ''
  const { get, patch } = useListSearchParams()
  const onList = pathname === '/app/trips'
  const [scope, setScope] = useState<'today' | 'all'>(() =>
    get('scope') === 'all' || get('missing') === '1' ? 'all' : 'today',
  )
  const [missingOnly, setMissingOnly] = useState(() => get('missing') === '1')
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [missingCount, setMissingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageSize = INFINITE_PAGE_SIZE

  // Restore filters from URL when returning to this list (e.g. back from detail).
  useEffect(() => {
    if (!onList) return
    setScope(get('scope') === 'all' || get('missing') === '1' ? 'all' : 'today')
    setMissingOnly(get('missing') === '1')
  }, [onList, get])

  const syncUrl = useCallback(
    (nextScope: 'today' | 'all', nextMissing: boolean) => {
      if (!onList) return
      if (nextMissing) patch({ missing: '1', scope: 'all' })
      else if (nextScope === 'all') patch({ scope: 'all', missing: null })
      else patch({ scope: null, missing: null })
    },
    [onList, patch],
  )

  const load = useCallback(
    async (pageNum = 1, append = false, silent = false) => {
      if (append) setLoadingMore(true)
      else if (!silent) setLoading(true)
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
            ? omClient.getTrips({ pageSize: 100, missingReceipt: true })
            : Promise.resolve(null),
        ])
        const scopedItems = list.items.filter(isAppScopedTrip)
        const reachedEnd = scopedItems.length < pageSize
        setItems((prev) => {
          const next = append ? [...prev, ...scopedItems] : scopedItems
          // Prefer short-page as end signal (client filter can shrink rows vs server total).
          if (reachedEnd) setTotal(next.length)
          else if (typeof list.total === 'number') setTotal(Math.max(list.total, next.length + 1))
          else setTotal(next.length + pageSize)
          return next
        })
        setPage(pageNum)
        if (missing) {
          setMissingCount(missing.items.filter(isAppScopedTrip).length)
        } else if (missingOnly && pageNum === 1) {
          setMissingCount(scopedItems.length)
        }
      } finally {
        if (!silent) setLoading(false)
        setLoadingMore(false)
      }
    },
    [missingOnly, scope, pageSize],
  )

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
    <>
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
      <PullToRefresh onRefresh={() => load(1, false, true)}>
        <div className="px-5 pb-28 max-[390px]:px-5 sm:px-6">
          <SegmentedControl
            value={scope}
            onChange={(v) => {
              setScope(v)
              setMissingOnly(false)
              syncUrl(v, false)
            }}
            options={[
              { id: 'today', label: 'Dziś' },
              { id: 'all', label: 'Wszystkie' },
            ]}
          />
          <div className="mt-4 flex gap-2">
            <FilterChip
              tone="warning"
              active={missingOnly}
              onClick={() => {
                const next = !missingOnly
                setMissingOnly(next)
                if (next) setScope('all')
                syncUrl(next ? 'all' : scope, next)
              }}
              icon={<Receipt size={16} strokeWidth={2} />}
            >
              Brak paragonu{missingCount ? ` · ${missingCount}` : ''}
            </FilterChip>
          </div>

          {loading && items.length === 0 ? (
            <LoadingBlock className="mt-6" />
          ) : items.length === 0 ? (
            <p className="mt-6 text-[var(--text-secondary)]">
              {scope === 'today' && !missingOnly
                ? 'Na dziś nie masz zleceń.'
                : missingOnly
                  ? 'Brak kursów bez paragonu.'
                  : 'Brak kursów.'}
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="px-1 pb-2 pt-3 text-[15px] font-semibold text-[var(--text-secondary)] first-letter:uppercase">
                    {group.title}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((trip) => (
                      <li key={String(trip.id)}>
                        <TripListCard trip={trip} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <InfiniteScrollSentinel
            hasMore={hasMore}
            loading={loadingMore}
            disabled={loading}
            onLoadMore={() => {
              void load(page + 1, true)
            }}
          />
        </div>
      </PullToRefresh>
    </>
  )
}

export function TripsScreen() {
  return (
    <Suspense fallback={<LoadingBlock className="px-5 py-16" />}>
      <TripsScreenInner />
    </Suspense>
  )
}
