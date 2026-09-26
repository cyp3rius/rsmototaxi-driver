'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ActionBar, actionBarContentPadCss } from '@/components/ui/ActionBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { SlideToConfirm } from '@/components/ui/SlideToConfirm'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import {
  getActiveLiveTripDraft,
  upsertLiveTripDraft,
  type LiveTripDraft,
} from '@/lib/offline/liveTripDraft'
import { formatElapsedHms, formatTime } from '@/lib/format'
import { useStackBack } from '@/lib/transitions/react/StackLayer'

export default function LiveTripPage() {
  const router = useRouter()
  const stackBack = useStackBack(() => router.push('/app'))
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState<LiveTripDraft | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [gpsKm, setGpsKm] = useState(0)
  const [gpsPoints, setGpsPoints] = useState(0)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const lastPos = useRef<{ lat: number; lon: number } | null>(null)
  const draftRef = useRef<LiveTripDraft | null>(null)
  const gpsKmRef = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const local = await getActiveLiveTripDraft()
      if (cancelled) return
      if (local?.phase === 'ended' || local?.phase === 'finishing') {
        router.replace('/app/trips/live/finish')
        return
      }
      if (local?.phase === 'active') {
        draftRef.current = local
        gpsKmRef.current = local.gpsDistanceKm || 0
        setDraft(local)
        setGpsKm(local.gpsDistanceKm || 0)
        setGpsPoints(local.track.length)
        await refreshMe()
        return
      }
      // No local live draft — nothing to track.
      router.replace('/app/trips')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draft || draft.phase !== 'active') return
    if (!navigator.geolocation) return
    const assignmentId = draft.assignmentId || me?.todayAssignment?.id || null

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        const recordedAt = new Date(pos.timestamp).toISOString()
        setGpsPoints((n) => n + 1)
        let nextKm = gpsKmRef.current
        if (lastPos.current) {
          const d = haversineKm(lastPos.current.lat, lastPos.current.lon, lat, lon)
          nextKm = gpsKmRef.current + d
          gpsKmRef.current = nextKm
          setGpsKm(nextKm)
        }
        lastPos.current = { lat, lon }

        const current = draftRef.current
        if (current) {
          const next: LiveTripDraft = {
            ...current,
            gpsDistanceKm: Number(nextKm.toFixed(3)),
            track: [...current.track, { lat, lon, recordedAt }].slice(-2000),
            assignmentId: current.assignmentId || assignmentId,
          }
          draftRef.current = next
          // Persist periodically (every ~10 points) to avoid thrashing IndexedDB.
          if (next.track.length % 10 === 0) {
            void upsertLiveTripDraft(next)
          }
        }

        if (assignmentId) {
          void omClient
            .postLocation({
              assignmentId,
              latitude: lat,
              longitude: lon,
              recordedAt,
            })
            .catch(() => undefined)
        }
        void omClient
          .reverseGeocode(lat, lon)
          .then((res) => setAddress(res.label || res.address || null))
          .catch(() => undefined)
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watch)
    // gpsKm intentionally omitted — we read via closure + lastPos; avoid re-subscribing each tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.phase, me?.todayAssignment?.id])

  const liveTimer = !draft?.startedAt
    ? '0:00:00'
    : formatElapsedHms(now - new Date(String(draft.startedAt)).getTime())

  const shiftTimer = !me?.todayAssignment?.shiftStart
    ? null
    : formatElapsedHms(now - new Date(me.todayAssignment.shiftStart).getTime())

  async function endTrip() {
    if (!draft || busy) return
    setBusy(true)
    try {
      const endedAt = new Date().toISOString()
      const current = draftRef.current || draft
      const next = await upsertLiveTripDraft({
        ...current,
        phase: 'ended',
        endedAt,
        gpsDistanceKm: Number(gpsKmRef.current.toFixed(3)),
      })
      draftRef.current = next
      await refreshMe()
      router.replace('/app/trips/live/finish')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zakończyć')
      setBusy(false)
    }
  }

  if (!draft) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader title="Kurs live" onBack={stackBack} />
        <div className="flex flex-1 items-center justify-center px-5 text-[15px] text-[var(--text-secondary)]">
          Ładowanie…
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Kurs live" onBack={stackBack} />
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pt-3"
        data-scroll
        style={{ paddingBottom: actionBarContentPadCss() }}
      >
        <div className="flex h-[52px] items-center gap-2.5 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5">
          <span className="size-2 rounded-full bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]" />
          <span className="text-[15px] font-semibold text-[var(--success)]">Na zmianie</span>
          {shiftTimer ? (
            <span className="text-[17px] font-semibold tabular-nums">{shiftTimer}</span>
          ) : null}
          <span className="flex-1" />
          {me?.todayAssignment?.resourcePlate ? (
            <PlateBadge plate={me.todayAssignment.resourcePlate} size="sm" />
          ) : null}
        </div>

        <SurfaceCard className="rounded-[26px]" padding="lg">
          <p className="text-[15px] font-semibold text-[var(--accent)]">Kurs live w trakcie</p>
          <p
            className="mt-1.5 font-[family-name:var(--font-display)] text-[64px] font-semibold leading-none tabular-nums"
            style={{ fontStretch: '112%' }}
          >
            {liveTimer}
          </p>
          <p className="mt-6 text-[15px] text-[var(--text-secondary)]">
            Skąd · od {formatTime(String(draft.startedAt || ''))}
          </p>
          <p className="text-[19px] font-semibold leading-[26px]">
            {address || draft.from || 'Lokalizacja GPS…'}
          </p>
          {draft.to ? (
            <p className="mt-1 text-[15px] text-[var(--text-secondary)]">Dokąd · {draft.to}</p>
          ) : null}
          <div className="mt-[18px] grid grid-cols-2 gap-2.5 border-t border-[var(--separator)] pt-4">
            <div>
              <div className="text-[15px] text-[var(--text-secondary)]">Dystans z GPS</div>
              <div className="text-[24px] font-semibold tabular-nums">
                {gpsKm.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km
              </div>
            </div>
            <div>
              <div className="text-[15px] text-[var(--text-secondary)]">Punkty GPS</div>
              <div className="text-[24px] font-semibold tabular-nums">{gpsPoints}</div>
            </div>
          </div>
        </SurfaceCard>

        <p className="px-1 text-[15px] leading-5 text-[var(--text-secondary)]">
          Kurs jest zapisany tylko w telefonie. Po zakończeniu uzupełnisz szczegóły i kwotę — wtedy
          trafi do floty. Nie zamykaj aplikacji: GPS działa tylko przy otwartym ekranie.
        </p>
      </div>

      <ActionBar>
        <SlideToConfirm label="Przesuń, aby zakończyć" onConfirm={() => void endTrip()} disabled={busy} />
      </ActionBar>
    </div>
  )
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
