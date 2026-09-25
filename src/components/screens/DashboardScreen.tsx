'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fuel, Plane, Plus, Phone, Receipt, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DriverProfileSheet } from '@/components/ui/DriverProfileSheet'
import { EndShiftSheet } from '@/components/ui/EndShiftSheet'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { StatusChip } from '@/components/ui/StatusChip'
import { useStartShift } from '@/components/ui/StartShiftProvider'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { endOfDayIso, formatMoneyShort, startOfDayIso } from '@/lib/format'
import {
  driverFirstName,
  isAppScopedTrip,
  polishCourseWord,
  resolveVehicleColor,
  tripDropoffLabel,
  tripPickupLabel,
  tripRouteLabel,
  type TripMeta,
  readTripMeta,
} from '@/lib/tripMeta'

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

export function DashboardScreen() {
  const router = useRouter()
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const { openStartShift } = useStartShift()
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [endOpen, setEndOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [missingTrips, setMissingTrips] = useState<Array<{ id: string; label: string }>>([])
  const [missingCount, setMissingCount] = useState(0)
  const [todayStats, setTodayStats] = useState<{ trips: number; revenue: number }>({
    trips: 0,
    revenue: 0,
  })

  const state = me?.dashboardState ?? 'A'
  const assignment = me?.todayAssignment
  const nextTrip = me?.nextTrip
  const liveTrip = me?.liveTrip
  const plate = assignment?.resourcePlate || me?.profile?.defaultResourcePlate || null
  const vehicleColor = resolveVehicleColor(
    assignment?.resourceColor,
    me?.profile?.defaultResourceColor,
  )
  // resourceName preferred; label may include plate — cleaned below as vehicleModel

  useEffect(() => {
    if (state !== 'C' && state !== 'D') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [state])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [today, missing] = await Promise.all([
          omClient.getTrips({ pageSize: 100, startedFrom: startOfDayIso(), startedTo: endOfDayIso() }),
          omClient.getTrips({ pageSize: 100, missingReceipt: true }),
        ])
        if (cancelled) return
        const scopedToday = today.items.filter(isAppScopedTrip)
        const revenue = scopedToday.reduce((sum, t) => sum + (Number(t.revenueAmount) || 0), 0)
        setTodayStats({ trips: scopedToday.length, revenue })
        setMissingCount(missing.items.filter(isAppScopedTrip).length)
      } catch {
        // keep defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [me?.today, state])

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

  const firstName = driverFirstName(me?.member)
  const tripMeta = readTripMeta(nextTrip)
  const mins = minutesUntil(nextTrip ? String(nextTrip.startedAt || '') : null)
  const occupied = (me?.profile?.defaultResourceIds || []).filter((v) => !v.available)
  const vehicleModel = (() => {
    const raw =
      assignment?.resourceName ||
      assignment?.resourceLabel ||
      me?.profile?.defaultResourceName ||
      me?.profile?.defaultResourceLabel ||
      ''
    if (!raw) return null
    // Strip plate if it was concatenated into the label
    if (plate && raw.includes(plate)) {
      return raw
        .replace(plate, '')
        .replace(/[•·|]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || null
    }
    return raw
  })()

  async function openEndShift() {
    try {
      const missing = await omClient.getTrips({ pageSize: 50, missingReceipt: true })
      setMissingTrips(
        missing.items.filter(isAppScopedTrip).map((trip) => ({
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
      toast.success('Zmiana zakończona')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zakończyć zmiany')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col px-5 pb-28"
      style={{ paddingTop: 'calc(var(--safe-top) + 4px)' }}
    >
      <header className="flex items-start justify-between gap-3 px-0 pt-2 pb-2.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex max-w-full items-center gap-1.5 text-left"
            aria-label="Otwórz profil kierowcy"
          >
            <h1 className="display-dash-hdr min-w-0 truncate">
              Witaj, <span className="text-[var(--accent)]">{firstName}</span>
            </h1>
            <ChevronDown
              size={22}
              strokeWidth={2.2}
              className="mt-1 flex-none text-[var(--text-secondary)]"
            />
          </button>
          <p className="mt-0.5 capitalize text-[15px] leading-5 text-[var(--text-secondary)]">{dateLabel}</p>
        </div>
        {state === 'C' ? (
          <StatusChip tone="success" pulse className="pl-2.5 pr-3">
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

      <div className="flex flex-1 flex-col gap-3 pt-0.5">
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
            <div className="flex justify-between text-[15px] leading-5 text-[var(--text-secondary)]">
              <span>Czas zmiany</span>
              <span>od {formatTime(assignment?.shiftStart)}</span>
            </div>
            <p className="numeric-xl mt-1.5 tracking-[-0.01em]">{shiftTimer}</p>
            <div className="mt-[18px] flex items-center justify-between gap-3">
              {plate ? (
                <PlateBadge plate={plate} />
              ) : (
                <span />
              )}
              {vehicleModel ? (
                <span className="flex items-center gap-2 text-[15px] text-[var(--text-secondary)]">
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: vehicleColor }}
                  />
                  {vehicleModel}
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
              {plate ? (
                <PlateBadge plate={plate} />
              ) : (
                <span />
              )}
              {vehicleModel ? (
                <span className="flex items-center gap-2 text-[15px] text-[var(--text-secondary)]">
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: vehicleColor }}
                  />
                  {vehicleModel}
                </span>
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
              <Stat label="Kursy" value={String(todayStats.trips)} />
              <Stat
                label="GPS"
                value={
                  assignment?.gpsDistanceKm != null
                    ? `${Number(assignment.gpsDistanceKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
                    : '—'
                }
              />
              <Stat
                label="Przychód"
                value={todayStats.revenue > 0 ? formatMoneyShort(todayStats.revenue) : '—'}
              />
            </div>
          </section>
        ) : null}

        <div className="pt-0.5">
          {state === 'C' ? (
            <Button onClick={() => router.push('/app/trips/new')}>
              <Plus size={22} strokeWidth={2.3} />
              Dodaj kurs
            </Button>
          ) : null}
          {state === 'B' ? (
            <Button onClick={() => openStartShift()}>Rozpocznij zmianę</Button>
          ) : null}
          {state === 'A' ? (
            <Button onClick={() => openStartShift()}>Rozpocznij zmianę ad hoc</Button>
          ) : null}
          {state === 'D' ? (
            <Button onClick={() => openStartShift()}>Rozpocznij kolejną zmianę</Button>
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
            <Stat label="Kursy" value={String(todayStats.trips)} />
            <Stat
              label="GPS"
              value={
                assignment?.gpsDistanceKm != null
                  ? `${Number(assignment.gpsDistanceKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
                  : '—'
              }
            />
            <Stat
              label="Przychód"
              value={todayStats.revenue > 0 ? formatMoneyShort(todayStats.revenue) : '—'}
            />
          </section>
        ) : null}

        {missingCount > 0 && (state === 'C' || state === 'D') ? (
          <Link
            href="/app/trips?missing=1"
            className="flex min-h-14 items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] px-4 tint-warning"
          >
            <Receipt size={22} className="text-[var(--warning)]" strokeWidth={1.8} />
            <span className="flex-1 text-[16px] font-medium">
              {missingCount} {polishCourseWord(missingCount)} bez paragonu
            </span>
            <span className="text-[16px] font-semibold text-[var(--warning)]">Dodaj</span>
          </Link>
        ) : null}

        <div className="mt-3 flex flex-col gap-2">
          {state === 'B' ? (
            <Button variant="secondary" size="md" onClick={() => router.push('/app/trips')}>
              Podgląd kursów
            </Button>
          ) : null}
          {state === 'D' ? (
            <Button variant="secondary" size="md" onClick={() => router.push('/app/trips')}>
              Kursy z tej zmiany
            </Button>
          ) : null}
          {state !== 'A2' ? (
            <Button variant="secondary" size="md" onClick={() => router.push('/app/expenses/new')}>
              <Fuel size={20} strokeWidth={1.8} />
              Zarejestruj koszt
            </Button>
          ) : null}
          {state === 'C' ? (
            <button
              type="button"
              disabled={busy || !!me?.impersonation?.active}
              onClick={() => void openEndShift()}
              className="flex h-14 items-center justify-center text-[17px] font-semibold text-[var(--danger)] disabled:opacity-[0.38]"
            >
              Zakończ zmianę
            </button>
          ) : null}
          {state === 'A' || state === 'A2' || state === 'B' ? (
            <button
              type="button"
              onClick={() => router.push('/app/shifts')}
              className="flex h-14 items-center justify-center text-[17px] font-medium text-[var(--text-secondary)]"
            >
              Pokaż grafik
            </button>
          ) : null}
        </div>
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
      <DriverProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
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
  const from = tripPickupLabel(trip)
  const to = tripDropoffLabel(trip)
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
