'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function DashboardScreen() {
  const router = useRouter()
  const { me, refreshMe, logout } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const state = me?.dashboardState ?? 'A'
  const assignment = me?.todayAssignment
  const nextTrip = me?.nextTrip
  const liveTrip = me?.liveTrip

  const primary = useMemo(() => {
    switch (state) {
      case 'A':
        return { label: 'Rozpocznij zmianę', href: '/app/shifts?start=1' }
      case 'A2':
        return { label: 'Brak wolnego pojazdu', href: null }
      case 'B':
        return { label: 'Rozpocznij zaplanowaną zmianę', href: '/app/shifts?start=1' }
      case 'C':
        return liveTrip
          ? { label: 'Kontynuuj kurs live', href: `/app/trips/${String(liveTrip.id)}` }
          : { label: 'Nowy kurs', href: '/app/trips/new' }
      case 'D':
        return { label: 'Rozpocznij kolejną zmianę', href: '/app/shifts?start=1' }
      default:
        return { label: 'Odśwież', href: '/app' }
    }
  }, [state, liveTrip])

  async function endShift() {
    if (!assignment?.id || busy) return
    setBusy(true)
    try {
      await omClient.startAssignmentShift(assignment.id, { action: 'end' })
      await refreshMe()
      setToast('Zmiana zakończona')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zakończyć zmiany')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="space-y-4 px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            {state === 'C' ? 'Na zmianie' : state === 'B' ? 'Zmiana zaplanowana' : state === 'D' ? 'Zmiana zakończona' : 'Dziś'}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-7">
            {me?.member.firstName ? `Cześć, ${me.member.firstName}` : 'Start'}
          </h1>
        </div>
        <button type="button" className="text-[15px] text-[var(--text-secondary)]" onClick={() => void logout().then(() => router.replace('/'))}>
          Wyloguj
        </button>
      </header>

      {me?.impersonation?.active ? (
        <div className="rounded-[18px] tint-warning px-4 py-3 text-[15px]">
          Podgląd operatora — tryb tylko do odczytu
        </div>
      ) : null}

      {assignment ? (
        <section className="rounded-[22px] bg-[var(--bg-surface)] p-5">
          <p className="text-[15px] text-[var(--text-secondary)]">Pojazd</p>
          <p className="mt-1 text-[17px] font-semibold">{assignment.resourceName || assignment.resourceLabel || '—'}</p>
          {assignment.resourcePlate ? <p className="plate mt-2">{assignment.resourcePlate}</p> : null}
          <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
            {formatTime(assignment.shiftStart || assignment.plannedShiftStart)} –{' '}
            {formatTime(assignment.shiftEnd || assignment.plannedShiftEnd)}
          </p>
          {state === 'C' ? (
            <div className="mt-4">
              <Button variant="secondary" size="md" loading={busy} onClick={() => void endShift()}>
                Zakończ zmianę
              </Button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-[22px] bg-[var(--bg-surface)] p-5">
          <p className="text-[17px] font-semibold">Brak zmiany na dziś</p>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            {state === 'A2'
              ? 'Wszystkie przypisane auta są zajęte. Skontaktuj się z koordynatorem.'
              : 'Możesz rozpocząć zmianę ad hoc na domyślnym pojeździe.'}
          </p>
        </section>
      )}

      {nextTrip ? (
        <section className="rounded-[22px] bg-[var(--bg-surface)] p-5">
          <p className="text-[15px] text-[var(--text-secondary)]">Najbliższy kurs</p>
          <p className="numeric-xl mt-2 text-[40px]">{formatTime(String(nextTrip.startedAt || ''))}</p>
          <p className="mt-2 text-[17px] font-medium">
            {typeof nextTrip.metadata === 'object' && nextTrip.metadata && 'tripRequest' in nextTrip.metadata
              ? String((nextTrip.metadata as { tripRequest?: { from?: string } }).tripRequest?.from || 'Kurs')
              : 'Kurs'}
          </p>
          <Link href={`/app/trips/${String(nextTrip.id)}`} className="mt-3 inline-block text-[15px] font-semibold text-[var(--accent)]">
            Szczegóły
          </Link>
        </section>
      ) : null}

      <div className="pt-2">
        {primary.href ? (
          <Button onClick={() => router.push(primary.href!)}>{primary.label}</Button>
        ) : (
          <Button disabled>{primary.label}</Button>
        )}
      </div>

      <Toast message={toast} />
    </div>
  )
}
