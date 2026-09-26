'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { EndShiftSheet } from '@/components/ui/EndShiftSheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { InfiniteScrollSentinel, INFINITE_PAGE_SIZE } from '@/components/ui/InfiniteScrollSentinel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusChip } from '@/components/ui/StatusChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { useStartShift } from '@/components/ui/StartShiftProvider'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { endOfDayIso, formatTime, formatWeekdayLongDate, startOfDayIso, toLocalDateKey, relativeDaySectionTitle, todayIsoDate } from '@/lib/format'
import { useListSearchParams } from '@/lib/useListSearchParams'
import { useRegisterTabRefresh } from '@/lib/transitions/react/TabRefresh'
import { isMissingReceiptTrip, tripRouteLabel } from '@/lib/tripMeta'

type Assignment = Record<string, unknown>

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

function endOfWeek(d = new Date()) {
  const s = startOfWeek(d)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 23, 59, 59, 999)
}

function shiftSortInstant(item: Assignment) {
  const raw =
    item.plannedShiftStart || item.shiftStart || item.assignmentDate || item.plannedShiftEnd || ''
  const t = new Date(String(raw)).getTime()
  return Number.isFinite(t) ? t : 0
}

function vehicleLine(item: Assignment) {
  const plate = typeof item.resourcePlate === 'string' ? item.resourcePlate.trim() : ''
  const name = String(item.resourceName || item.resourceLabel || '').trim()
  const cleaned =
    plate && name.includes(plate)
      ? name.replace(plate, '').replace(/[·•|,]+/g, ' ').trim()
      : name
  if (cleaned && plate) return `${cleaned} · ${plate}`
  return cleaned || plate || '—'
}

function shiftChip(item: Assignment): {
  label: string
  tone: 'success' | 'neutral' | 'accent'
} {
  if (item.shiftStart && !item.shiftEnd) return { label: 'Na zmianie', tone: 'success' }
  if (item.shiftEnd) return { label: 'Zakończona', tone: 'neutral' }
  return { label: 'Zaplanowana', tone: 'neutral' }
}

function planRange(item: Assignment) {
  const active = Boolean(item.shiftStart && !item.shiftEnd)
  const start = active
    ? item.shiftStart || item.plannedShiftStart
    : item.plannedShiftStart || item.shiftStart
  const end = active ? item.plannedShiftEnd : item.plannedShiftEnd || item.shiftEnd
  const startLabel = formatTime(String(start || ''))
  if (active && !end) return `${startLabel}–…`
  return `${startLabel}–${formatTime(String(end || ''))}`
}

function metaLine(item: Assignment) {
  const parts: string[] = []
  if (item.shiftStart && !item.shiftEnd) {
    parts.push(`Start ${formatTime(String(item.shiftStart))}`)
  } else if (item.shiftStart && item.shiftEnd) {
    parts.push(
      `Rzeczywiście ${formatTime(String(item.shiftStart))}–${formatTime(String(item.shiftEnd))}`,
    )
  }
  const plate = typeof item.resourcePlate === 'string' ? item.resourcePlate.trim() : ''
  if (plate) parts.push(plate)
  else {
    const name = String(item.resourceName || item.resourceLabel || '').trim()
    if (name) parts.push(name)
  }
  if (item.gpsDistanceKm != null && Number(item.gpsDistanceKm) > 0) {
    parts.push(
      `${Number(item.gpsDistanceKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`,
    )
  }
  return parts.join(' · ')
}

function ShiftsScreenInner() {
  const search = useSearchParams()
  const pathname = usePathname() || ''
  const { get, patch } = useListSearchParams()
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const { openStartShift } = useStartShift()
  const onList = pathname === '/app/shifts'
  const [scope, setScope] = useState<'week' | 'all'>(() => (get('scope') === 'all' ? 'all' : 'week'))
  const [items, setItems] = useState<Assignment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [missingTrips, setMissingTrips] = useState<Array<{ id: string; label: string }>>([])

  const pageSize = INFINITE_PAGE_SIZE

  useEffect(() => {
    if (!onList) return
    setScope(get('scope') === 'all' ? 'all' : 'week')
  }, [onList, get])

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (!replace) setLoadingMore(true)
      try {
        const params: {
          page: number
          pageSize: number
          dateFrom?: string
          dateTo?: string
        } = { page: nextPage, pageSize }
        if (scope === 'week') {
          params.dateFrom = toLocalDateKey(startOfWeek().toISOString())
          params.dateTo = toLocalDateKey(endOfWeek().toISOString())
        }
        const res = await omClient.getAssignments(params)
        const payload = res as { items?: Assignment[]; total?: number }
        const list = payload.items || (Array.isArray(res) ? (res as Assignment[]) : [])
        const reachedEnd = list.length < pageSize
        setItems((prev) => {
          const next = replace ? list : [...prev, ...list]
          if (reachedEnd) setTotal(next.length)
          else if (typeof payload.total === 'number') setTotal(Math.max(payload.total, next.length + 1))
          else setTotal(next.length + pageSize)
          return next
        })
        setPage(nextPage)
      } finally {
        setLoadingMore(false)
      }
    },
    [scope, pageSize],
  )

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true)
      void load(1, true).finally(() => setLoading(false))
    })
  }, [load])

  useEffect(() => {
    if (search.get('start') === '1') {
      openStartShift()
      // Drop only the start flag; keep scope/filter query params.
      patch({ start: null })
    }
  }, [search, openStartShift, patch])

  const todayKey = me?.today || todayIsoDate()

  const groups = useMemo(() => {
    const byDay = new Map<string, Assignment[]>()
    for (const item of items) {
      const key =
        toLocalDateKey(item.assignmentDate || item.plannedShiftStart || item.shiftStart) || 'unknown'
      const list = byDay.get(key) || []
      list.push(item)
      byDay.set(key, list)
    }

    const dayKeys = Array.from(byDay.keys()).sort((a, b) => {
      // Future → past (descending calendar day). Unknown dates last.
      if (a === 'unknown') return 1
      if (b === 'unknown') return -1
      return b.localeCompare(a)
    })

    return dayKeys.map((key) => {
      const dayItems = [...(byDay.get(key) || [])].sort((a, b) => {
        const aActive = a.shiftStart && !a.shiftEnd ? 0 : 1
        const bActive = b.shiftStart && !b.shiftEnd ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return shiftSortInstant(a) - shiftSortInstant(b)
      })
      return {
        title: key === 'unknown' ? 'Bez daty' : relativeDaySectionTitle(key, todayKey),
        items: dayItems,
      }
    })
  }, [items, todayKey])

  async function openEndShift() {
    try {
      const res = await omClient.getTrips({
        pageSize: 50,
        missingReceipt: true,
        startedFrom: startOfDayIso(),
        startedTo: endOfDayIso(),
      })
      setMissingTrips(
        res.items.filter(isMissingReceiptTrip).map((t) => ({
          id: String(t.id),
          label: tripRouteLabel(t) || 'Kurs',
        })),
      )
    } catch {
      setMissingTrips([])
    }
    setEndOpen(true)
  }

  async function endShift() {
    if (!me?.todayAssignment?.id || busy) return
    setBusy(true)
    try {
      await omClient.startAssignmentShift(me.todayAssignment.id, { action: 'end' })
      await refreshMe()
      setEndOpen(false)
      toast.success('Zmiana zakończona')
      await load(1, true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zakończyć zmiany')
    } finally {
      setBusy(false)
    }
  }

  const hasMore = items.length < total

  useRegisterTabRefresh(4, async () => {
    await Promise.all([refreshMe(), load(1, true)])
  })

  return (
    <>
      <PageHeader title="Zmiany" />
      <div className="px-5">
        <SegmentedControl
          value={scope}
          onChange={(v) => {
            setScope(v)
            if (onList) patch({ scope: v === 'all' ? 'all' : null })
          }}
          options={[
            { id: 'week', label: 'Ten tydzień' },
            { id: 'all', label: 'Wszystkie' },
          ]}
        />
      </div>

      <div className="px-5 pb-6 pt-4">
          {loading && items.length === 0 ? (
            <LoadingBlock className="py-16" />
          ) : groups.length === 0 ? (
            <p className="text-[var(--text-secondary)]">Brak zmian w tym zakresie.</p>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="px-1 pb-0 pt-3 text-[15px] font-[600] text-[var(--text-secondary)]">
                    {group.title}
                  </p>
                  <ul className="mt-2 space-y-3">
                    {group.items.map((item) => {
                      const chip = shiftChip(item)
                      const active = Boolean(item.shiftStart && !item.shiftEnd)
                      const meta = metaLine(item)
                      return (
                        <li key={String(item.id)}>
                          <SurfaceCard
                            className={
                              active
                                ? 'flex flex-col gap-1.5 !border-2 !border-[var(--success)]'
                                : 'flex flex-col gap-1.5'
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[17px] font-[600]">
                                {formatWeekdayLongDate(toLocalDateKey(item.assignmentDate))}
                              </span>
                              <StatusChip tone={chip.tone === 'success' ? 'success' : chip.tone === 'accent' ? 'accent' : 'neutral'}>
                                {chip.label}
                              </StatusChip>
                            </div>
                            <p
                              className="font-[family-name:var(--font-display)] text-[24px] font-[600] tabular-nums"
                              style={{ fontStretch: '112%' }}
                            >
                              {planRange(item)}
                            </p>
                            {meta ? (
                              <p className="text-[15px] text-[var(--text-secondary)]">{meta}</p>
                            ) : (
                              <p className="text-[15px] text-[var(--text-secondary)]">
                                {vehicleLine(item)}
                              </p>
                            )}
                            {active ? (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  disabled={
                                    busy ||
                                    Boolean(me?.impersonation?.active) ||
                                    Boolean(me?.liveTrip)
                                  }
                                  onClick={() => {
                                    if (me?.liveTrip) return
                                    void openEndShift()
                                  }}
                                  className="flex h-14 w-full items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] text-[17px] font-[600] text-[var(--danger)] disabled:opacity-[0.38]"
                                >
                                  Zakończ zmianę
                                </button>
                                {me?.liveTrip ? (
                                  <p className="mt-2 text-center text-[15px] leading-5 text-[var(--text-secondary)]">
                                    Masz kurs w trakcie, zakończ go żeby zakończyć zmianę.
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </SurfaceCard>
                        </li>
                      )
                    })}
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
              void load(page + 1, false)
            }}
          />
        </div>

      <EndShiftSheet
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={() => void endShift()}
        busy={busy}
        shiftStart={me?.todayAssignment?.shiftStart}
        plate={me?.todayAssignment?.resourcePlate}
        gpsKm={me?.todayAssignment?.gpsDistanceKm}
        missingReceiptTrips={missingTrips}
      />
    </>
  )
}

export function ShiftsScreen() {
  return (
    <Suspense fallback={<LoadingBlock className="min-h-dvh py-24" />}>
      <ShiftsScreenInner />
    </Suspense>
  )
}
