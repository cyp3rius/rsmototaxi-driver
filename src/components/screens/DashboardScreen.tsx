'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plane, Plus, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EndShiftSheet } from '@/components/ui/EndShiftSheet'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { StatusChip } from '@/components/ui/StatusChip'
import { Toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { tripRouteLabel } from '@/lib/tripMeta'

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h} h ${String(m).padStart(2, '0')} min`
}

function formatElapsed(ms: number) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function minutesUntil(iso: string | null | undefined) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.round((t - Date.now()) / 60000)
}

type TripMeta = {
  tripRequest?: {
    from?: string
    to?: string
    fromNote?: string
    toNote?: string
    flightNumber?: string
    flightOrigin?: string
    estimatedArrival?: string
    childSeat?: boolean
    boosterSeat?: boolean
    englishSpeakingDriver?: boolean
    meetAndGreet?: boolean
  }
  distanceKm?: number
  durationMin?: number
  prepaid?: boolean
}

function readTripMeta(trip: Record<string, unknown> | null | undefined): TripMeta {
  if (!trip || typeof trip.metadata !== 'object' || !trip.metadata) return {}
  return trip.metadata as TripMeta
}

export function DashboardScreen() {
  const router = useRouter()
  const { me, refreshMe, logout } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [endOpen, setEndOpen] = useState(false)
  const [missingTrips, setMissingTrips] = useState<Array<{ id: string; label: string }>>([])

  const state = me?.dashboardState ?? 'A'
  const assignment = me?.todayAssignment
  const nextTrip = me?.nextTrip
  const liveTrip = me?.liveTrip
  const plate = assignment?.resourcePlate || me?.profile?.defaultResourcePlate || null
  const vehicleName =
    assignment?.resourceName || assignment?.resourceLabel || me?.profile?.defaultResourceName || me?.profile?.defaultResourceLabel

  useEffect(() => {
    if (state !== 'C' && state !== 'D') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [state])

  const shiftTimer = (() => {
    if (!assignment?.shiftStart) return '00:00:00'
    const start = new Date(assignment.shiftStart).getTime()
    const end = assignment.shiftEnd ? new Date(assignment.shiftEnd).getTime() : now
    return formatElapsed(end - start)
  })()

  const shiftDurationLabel =
    assignment?.shiftStart && assignment?.shiftEnd
      ? formatDuration(new Date(assignment.shiftEnd).getTime() - new Date(assignment.shiftStart).getTime())
      : null

  const dateLabel = (me?.today ? new Date(`${me.today}T12:00:00`) : new Date()).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const firstName = me?.member.firstName || me?.member.displayName?.split(/\s+/)[0] || 'kierowco'
  const tripMeta = readTripMeta(nextTrip)
  const mins = minutesUntil(nextTrip ? String(nextTrip.startedAt || '') : null)
  const occupied = (me?.profile?.defaultResourceIds || []).filter((v) => !v.available)

  async function openEndShift() {
    try {
      const missing = await omClient.getTrips({ pageSize: 20, missingReceipt: true })
      setMissingTrips(
        missing.items.map((trip) => ({
          id: String(trip.id),
          label: tripRouteLabel(trip),
        })),
      )
    } catch {
      setMissingTrips([])
    }
    setEndOpen(true)
  }

  async function endShift() {
    if (!assignment?.id || busy) return
    setBusy(true)
    try {
      await omClient.startAssignmentShift(assignment.id, { action: 'end' })
      await refreshMe()
      setEndOpen(false)
      setToast('Zmiana zakończona')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zakończyć zmiany')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-28 max-[390px]:px-5 sm:px-6" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <header className="flex items-start justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <h1 className="display-hello truncate" style={{ viewTransitionName: 'driver-hello' }}>
            Witaj, <span className="text-[var(--accent)]">{firstName}</span>
          </h1>
          <p className="mt-0.5 capitalize text-[15px] text-[var(--text-secondary)]">{dateLabel}</p>
        </div>
        {state === 'C' ? (
          <StatusChip tone="success" pulse>
            Na zmianie
          </StatusChip>
        ) : (
          <StatusChip pulse={false}>Poza zmianą</StatusChip>
        )}
      </header>

      {me?.impersonation?.active ? (
        <div className="mb-2.5 flex items-start gap-3 rounded-[18px] tint-accent px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[var(--accent)]">Podgląd tylko do odczytu</p>
            <p className="mt-0.5 text-[15px] text-[var(--text-secondary)]">
              Operator: {me.impersonation.displayName || '—'}. Zmiany są wyłączone.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3">
        {state === 'C' && liveTrip ? (
          <Link
            href="/app/trips/live"
            className="flex items-center gap-3 rounded-[18px] bg-[var(--accent)] px-4 py-3.5 text-[var(--accent-on)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Kurs live w trakcie</p>
              <p className="mt-0.5 truncate text-[15px] opacity-80">
                Od {formatTime(String(liveTrip.startedAt || ''))}
              </p>
            </div>
          </Link>
        ) : null}

        {state === 'C' && nextTrip ? (
          <>
            <div className="flex h-14 items-center gap-3 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5">
              <span className="text-[15px] text-[var(--text-secondary)]">Zmiana</span>
              <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold tabular-nums" style={{ fontStretch: '112%' }}>
                {shiftTimer}
              </span>
              <span className="flex-1" />
              {plate ? <PlateBadge plate={plate} size="sm" /> : null}
            </div>
            <TripHeroCard
              trip={nextTrip}
              meta={tripMeta}
              mins={mins}
              href={`/app/trips/${String(nextTrip.id)}`}
            />
          </>
        ) : null}

        {state === 'C' && !nextTrip && !liveTrip ? (
          <section className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
            <div className="flex justify-between text-[15px] text-[var(--text-secondary)]">
              <span>Czas zmiany</span>
              <span>od {formatTime(assignment?.shiftStart)}</span>
            </div>
            <p className="numeric-xl mt-1.5">{shiftTimer}</p>
            <div className="mt-4.5 flex items-center justify-between gap-3">
              {plate ? <PlateBadge plate={plate} /> : <span />}
              {vehicleName ? (
                <span className="flex items-center gap-2 text-[15px] text-[var(--text-secondary)]">
                  <span className="size-2 rounded-full bg-[var(--success)]" />
                  {vehicleName}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {state === 'B' ? (
          <section className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
            <span className="text-[15px] font-semibold text-[var(--accent)]">Zmiana zaplanowana</span>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[46px] font-semibold leading-none tabular-nums" style={{ fontStretch: '112%' }}>
              {formatTime(assignment?.plannedShiftStart)}
              <span className="text-[var(--text-tertiary)]">–</span>
              {formatTime(assignment?.plannedShiftEnd)}
            </p>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">Możesz zacząć wcześniej w oknie startu.</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              {plate ? <PlateBadge plate={plate} /> : <span />}
              {vehicleName ? (
                <span className="text-[15px] text-[var(--text-secondary)]">{vehicleName}</span>
              ) : null}
            </div>
          </section>
        ) : null}

        {state === 'A' ? (
          <section className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
            <span className="text-[15px] font-medium text-[var(--text-secondary)]">Na dziś nie masz zaplanowanej zmiany</span>
            <h2 className="display-l mt-2">Brak zmiany na dziś</h2>
            <p className="mt-2 text-[16px] leading-[23px] text-[var(--text-secondary)]">
              Możesz zacząć zmianę ad hoc na jednym ze swoich pojazdów.
              {plate ? (
                <>
                  {' '}
                  Domyślny: <b className="font-semibold text-[var(--text-primary)]">{plate}</b>.
                </>
              ) : null}
            </p>
          </section>
        ) : null}

        {state === 'A2' ? (
          <section className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
            <span className="text-[15px] font-medium text-[var(--text-secondary)]">Poza zmianą</span>
            <h2 className="display-l mt-2">Brak wolnego pojazdu</h2>
            <p className="mt-2 text-[16px] leading-[23px] text-[var(--text-secondary)]">
              Wszystkie Twoje pojazdy są dziś przydzielone. Poproś dyspozytora o pojazd.
            </p>
            {occupied.length ? (
              <div className="mt-3.5 flex flex-col border-t border-[var(--separator)]">
                {occupied.map((v) => (
                  <div key={v.id} className="flex h-[52px] items-center justify-between border-b border-[var(--separator)] last:border-0">
                    <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-[0.04em]" style={{ fontStretch: '112%' }}>
                      {v.plate || v.label}
                    </span>
                    <span className="text-[15px] text-[var(--text-secondary)]">Zajęte</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {state === 'D' ? (
          <section className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
            <span className="text-[15px] font-medium text-[var(--text-secondary)]">Zmiana zakończona</span>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[46px] font-semibold leading-none tabular-nums" style={{ fontStretch: '112%' }}>
              {shiftDurationLabel || shiftTimer}
            </p>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
              {formatTime(assignment?.shiftStart)}–{formatTime(assignment?.shiftEnd)}
              {plate ? ` · ${plate}` : ''}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--separator)] pt-3.5">
              <Stat label="Kursy" value="—" />
              <Stat
                label="GPS"
                value={
                  assignment?.gpsDistanceKm != null
                    ? `${Number(assignment.gpsDistanceKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
                    : '—'
                }
              />
              <Stat label="Przychód" value="—" />
            </div>
          </section>
        ) : null}

        <div className="pt-3">
          {state === 'C' ? (
            <Button onClick={() => router.push('/app/trips/new')}>
              <Plus size={22} strokeWidth={2.3} />
              Dodaj kurs
            </Button>
          ) : null}
          {state === 'B' ? (
            <Button onClick={() => router.push('/app/shifts?start=1')}>Rozpocznij zmianę</Button>
          ) : null}
          {state === 'A' ? (
            <Button onClick={() => router.push('/app/shifts?start=1')}>Rozpocznij zmianę ad hoc</Button>
          ) : null}
          {state === 'D' ? (
            <Button onClick={() => router.push('/app/shifts?start=1')}>Rozpocznij kolejną zmianę</Button>
          ) : null}
          {state === 'A2' ? (
            <Button variant="secondary" onClick={() => (window.location.href = 'tel:+48508222321')}>
              <Phone size={20} strokeWidth={1.9} />
              Zadzwoń do dyspozytora
            </Button>
          ) : null}
        </div>

        {state === 'C' ? (
          <section className="grid grid-cols-3 gap-2 rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] px-5 py-4">
            <Stat label="Kursy" value="—" />
            <Stat
              label="GPS"
              value={
                assignment?.gpsDistanceKm != null
                  ? `${Number(assignment.gpsDistanceKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
                  : '—'
              }
            />
            <Stat label="Przychód" value="—" />
          </section>
        ) : null}

        {state === 'C' ? (
          <button
            type="button"
            disabled={busy || !!me?.impersonation?.active}
            onClick={() => void openEndShift()}
            className="py-3 text-center text-[15px] font-medium text-[var(--text-secondary)] disabled:opacity-38"
          >
            Zakończ zmianę
          </button>
        ) : null}

        <button
          type="button"
          className="py-2 text-center text-[15px] text-[var(--text-tertiary)]"
          onClick={() => void logout().then(() => router.replace('/'))}
        >
          Wyloguj
        </button>
      </div>

      <EndShiftSheet
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={() => void endShift()}
        busy={busy}
        shiftStart={assignment?.shiftStart}
        plate={plate}
        gpsKm={assignment?.gpsDistanceKm}
        missingReceiptTrips={missingTrips}
      />
      <Toast message={toast} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[15px] text-[var(--text-secondary)]">{label}</div>
      <div className="text-[20px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function TripHeroCard({
  trip,
  meta,
  mins,
  href,
}: {
  trip: Record<string, unknown>
  meta: TripMeta
  mins: number | null
  href: string
}) {
  const from = meta.tripRequest?.from || 'Kurs'
  const to = meta.tripRequest?.to
  const amount =
    trip.revenueAmount != null
      ? `${Number(trip.revenueAmount).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`
      : null

  return (
    <Link
      href={href}
      className="dash-sheet-in block rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5"
      style={{ viewTransitionName: 'trip-hero' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-[var(--accent)]">
          Najbliższy kurs{mins != null && mins >= 0 ? ` · za ${mins} min` : ''}
        </span>
        {amount ? <span className="text-[15px] text-[var(--text-secondary)]">{amount}</span> : null}
      </div>
      <p className="numeric-xl mt-1">{formatTime(String(trip.startedAt || ''))}</p>
      <div className="mt-3.5 grid grid-cols-[14px_1fr] gap-x-3">
        <span className="flex flex-col items-center pt-1.5">
          <span className="size-2.5 rounded-full border-2 border-[var(--accent)]" />
          <span className="my-1 w-0.5 flex-1 bg-[var(--separator)]" />
          <span className="size-2.5 rounded-[2px] bg-[var(--accent)]" />
        </span>
        <span className="flex flex-col gap-3.5">
          <span>
            <span className="block text-[17px] font-semibold">{from}</span>
            {meta.tripRequest?.fromNote ? (
              <span className="block text-[15px] text-[var(--text-secondary)]">{meta.tripRequest.fromNote}</span>
            ) : null}
          </span>
          {to ? (
            <span>
              <span className="block text-[17px] font-semibold">{to}</span>
              {meta.distanceKm != null || meta.durationMin != null ? (
                <span className="block text-[15px] text-[var(--text-secondary)]">
                  {meta.distanceKm != null ? `ok. ${meta.distanceKm} km` : ''}
                  {meta.distanceKm != null && meta.durationMin != null ? ' · ' : ''}
                  {meta.durationMin != null
                    ? `${Math.floor(meta.durationMin / 60) ? `${Math.floor(meta.durationMin / 60)} h ` : ''}${meta.durationMin % 60} min`
                    : ''}
                </span>
              ) : meta.tripRequest?.toNote ? (
                <span className="block text-[15px] text-[var(--text-secondary)]">{meta.tripRequest.toNote}</span>
              ) : null}
            </span>
          ) : null}
        </span>
      </div>

      {meta.tripRequest?.flightNumber ? (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-[var(--bg-surface-raised)] px-3 py-2.5">
          <Plane size={20} className="flex-none text-[var(--text-secondary)]" strokeWidth={1.8} />
          <span className="text-[15px]">
            <b className="font-semibold">{meta.tripRequest.flightNumber}</b>
            {meta.tripRequest.flightOrigin ? ` z ${meta.tripRequest.flightOrigin}` : ''}
            {meta.tripRequest.estimatedArrival
              ? ` · planowo ${formatTime(meta.tripRequest.estimatedArrival)}`
              : ''}
          </span>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {meta.prepaid ? (
          <span className="inline-flex h-[30px] items-center rounded-[10px] px-2.5 text-[15px] font-medium tint-success text-[var(--success)]">
            Przedpłata
          </span>
        ) : null}
        {meta.tripRequest?.childSeat ? (
          <span className="inline-flex h-[30px] items-center rounded-[10px] bg-[var(--bg-surface-raised)] px-2.5 text-[15px] font-medium text-[var(--text-secondary)]">
            Fotelik
          </span>
        ) : null}
        {meta.tripRequest?.englishSpeakingDriver ? (
          <span className="inline-flex h-[30px] items-center rounded-[10px] bg-[var(--bg-surface-raised)] px-2.5 text-[15px] font-medium text-[var(--text-secondary)]">
            Kierowca EN
          </span>
        ) : null}
      </div>
    </Link>
  )
}
