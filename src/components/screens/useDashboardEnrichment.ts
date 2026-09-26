'use client'

import { useEffect, useState } from 'react'
import { omClient } from '@/lib/om/client'
import { endOfDayIso, startOfDayIso } from '@/lib/format'
import { isAppScopedTrip, isMissingReceiptTrip } from '@/lib/tripMeta'

const STAGE_MS = 200

export type DashboardEnrichment = {
  /** Vehicle row may crossfade (gate 0). */
  vehicleReady: boolean
  /** Trip / „Zaplanowane na dziś” (gate 1). */
  tripReady: boolean
  /** Stats Kursy / GPS / Przychód (gate 2). */
  statsReady: boolean
  todayStats: { trips: number; revenue: number }
  missingCount: number
  /** Scheduled / upcoming trips for „Zaplanowane na dziś” (state B). null = still loading. */
  plannedTrips: Record<string, unknown>[] | null
  /** True when we should show the trip skeleton card at all. */
  expectTripCard: boolean
}

async function fetchSecondary(needsPlannedFetch: boolean) {
  const [todayRes, missingRes] = await Promise.all([
    omClient.getTrips({
      pageSize: 100,
      startedFrom: startOfDayIso(),
      startedTo: endOfDayIso(),
    }),
    omClient.getTrips({ pageSize: 100, missingReceipt: true }),
  ])
  const scopedToday = todayRes.items.filter(isAppScopedTrip)
  const revenue = scopedToday.reduce((sum, t) => sum + (Number(t.revenueAmount) || 0), 0)
  const planned = needsPlannedFetch
    ? scopedToday.filter((t) => {
        const status = String(t.status || '')
        return status === 'scheduled' || status === 'pending_authorization'
      })
    : []
  return {
    todayStats: { trips: scopedToday.length, revenue },
    missingCount: missingRes.items.filter(isMissingReceiptTrip).length,
    plannedTrips: planned,
  }
}

/**
 * Secondary dashboard data + staged reveal gates:
 * Vehicle (0ms) → Trip (+200ms) → Statistics (+400ms).
 * Header / hours / primary CTA stay outside this hook (immediate from /me).
 */
export function useDashboardEnrichment(params: {
  today: string | undefined
  state: string
  /** From /me — if already known, trip card is expected. */
  hasMeTrip: boolean
  /** Bump to re-fetch secondary data (e.g. pull-to-refresh) without skeletons. */
  refreshToken?: number
}): DashboardEnrichment {
  const { today, state, hasMeTrip, refreshToken = 0 } = params

  const [gates, setGates] = useState({ vehicle: false, trip: false, stats: false })
  const [todayStats, setTodayStats] = useState<{ trips: number; revenue: number }>({
    trips: 0,
    revenue: 0,
  })
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [missingCount, setMissingCount] = useState(0)
  const [plannedTrips, setPlannedTrips] = useState<Record<string, unknown>[] | null>(null)

  const needsPlannedFetch = state === 'B'
  const expectTripCard = hasMeTrip || needsPlannedFetch

  useEffect(() => {
    setGates({ vehicle: false, trip: false, stats: false })
    setStatsLoaded(false)
    setPlannedTrips(needsPlannedFetch ? null : [])

    const tVehicle = window.setTimeout(() => {
      setGates((g) => ({ ...g, vehicle: true }))
    }, 0)
    const tTrip = window.setTimeout(() => {
      setGates((g) => ({ ...g, trip: true }))
    }, STAGE_MS)
    const tStats = window.setTimeout(() => {
      setGates((g) => ({ ...g, stats: true }))
    }, STAGE_MS * 2)

    let cancelled = false
    void (async () => {
      try {
        const next = await fetchSecondary(needsPlannedFetch)
        if (cancelled) return
        setTodayStats(next.todayStats)
        setMissingCount(next.missingCount)
        setPlannedTrips(next.plannedTrips)
        setStatsLoaded(true)
      } catch {
        if (cancelled) return
        setTodayStats({ trips: 0, revenue: 0 })
        setMissingCount(0)
        setPlannedTrips([])
        setStatsLoaded(true)
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(tVehicle)
      window.clearTimeout(tTrip)
      window.clearTimeout(tStats)
    }
  }, [today, state, needsPlannedFetch])

  useEffect(() => {
    if (refreshToken <= 0) return
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchSecondary(needsPlannedFetch)
        if (cancelled) return
        setTodayStats(next.todayStats)
        setMissingCount(next.missingCount)
        setPlannedTrips(next.plannedTrips)
        setStatsLoaded(true)
        setGates({ vehicle: true, trip: true, stats: true })
      } catch {
        // keep previous values visible
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken, needsPlannedFetch])

  const tripDataReady = !expectTripCard || hasMeTrip || plannedTrips !== null

  return {
    vehicleReady: gates.vehicle,
    tripReady: gates.trip && tripDataReady,
    statsReady: gates.stats && statsLoaded,
    todayStats,
    missingCount,
    plannedTrips,
    expectTripCard,
  }
}
