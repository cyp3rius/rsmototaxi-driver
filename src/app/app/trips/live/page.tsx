'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { ActionBar } from '@/components/ui/ActionBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { SlideToConfirm } from '@/components/ui/SlideToConfirm'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { Toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { formatElapsed, formatTime } from '@/lib/format'
import { readTripMeta } from '@/lib/tripMeta'

export default function LiveTripPage() {
  const router = useRouter()
  const { me, refreshMe } = useAuth()
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [gpsKm, setGpsKm] = useState(0)
  const [gpsPoints, setGpsPoints] = useState(0)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastPos = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await refreshMe()
      const live = me?.liveTrip
      if (live?.id) {
        if (!cancelled) setTrip(live)
        return
      }
      const res = await omClient.getTrips({ pageSize: 10 })
      const found = res.items.find((item) => item.status === 'in_progress') || null
      if (!cancelled) {
        setTrip(found)
        if (!found) router.replace('/app/trips')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!trip?.id || !me?.todayAssignment?.id) return
    if (!navigator.geolocation) return

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        setGpsPoints((n) => n + 1)
        if (lastPos.current) {
          const d = haversineKm(lastPos.current.lat, lastPos.current.lon, lat, lon)
          setGpsKm((km) => km + d)
        }
        lastPos.current = { lat, lon }
        void omClient
          .postLocation({
            assignmentId: me.todayAssignment?.id,
            tripId: trip.id,
            latitude: lat,
            longitude: lon,
            recordedAt: new Date().toISOString(),
          })
          .catch(() => undefined)
        void omClient
          .reverseGeocode(lat, lon)
          .then((res) => setAddress(res.label || res.address || null))
          .catch(() => undefined)
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watch)
  }, [trip?.id, me?.todayAssignment?.id])

  const liveTimer = !trip?.startedAt
    ? '0:00'
    : formatElapsed(now - new Date(String(trip.startedAt)).getTime())

  const shiftTimer = !me?.todayAssignment?.shiftStart
    ? null
    : formatElapsed(now - new Date(me.todayAssignment.shiftStart).getTime())

  const meta = readTripMeta(trip)

  async function endTrip() {
    if (!trip?.id || busy) return
    setBusy(true)
    try {
      await omClient.updateTrip({ id: trip.id, status: 'completed' })
      await refreshMe()
      setToast('Kurs zakończony')
      window.setTimeout(() => router.replace(`/app/trips/${String(trip.id)}`), 500)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zakończyć')
      setBusy(false)
    }
  }

  return (
    <AppShell hideNav>
      <PageHeader title="Kurs live" onBack={() => router.push('/app')} />
      <div className="space-y-3 px-5 pb-36">
        <div className="flex h-[52px] items-center gap-2.5 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5">
          <span className="size-2 rounded-full bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]" />
          <span className="text-[15px] font-semibold text-[var(--success)]">Na zmianie</span>
          {shiftTimer ? <span className="text-[17px] font-semibold tabular-nums">{shiftTimer}</span> : null}
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
            Skąd · od {formatTime(String(trip?.startedAt || ''))}
          </p>
          <p className="text-[19px] font-semibold leading-[26px]">
            {address || meta.tripRequest?.from || 'Lokalizacja GPS…'}
          </p>
          <div className="mt-4.5 grid grid-cols-2 gap-2.5 border-t border-[var(--separator)] pt-4">
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
          Po zakończeniu uzupełnisz trasę i szczegóły kursu. Nie zamykaj aplikacji: GPS działa tylko przy otwartym
          ekranie.
        </p>
      </div>

      <ActionBar>
        <SlideToConfirm label="Przesuń, aby zakończyć" onConfirm={() => void endTrip()} disabled={busy} />
      </ActionBar>
      <Toast message={toast} />
    </AppShell>
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
