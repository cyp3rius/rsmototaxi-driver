'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { ActionBar } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { formatTime } from '@/lib/format'

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

function ShiftsInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { me, refreshMe } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([])
  const [historyScope, setHistoryScope] = useState<'week' | 'all'>('week')
  const startMode = search.get('start') === '1'

  const allVehicles = me?.profile?.defaultResourceIds || []
  const available = me?.profile?.availableDefaultResourceIds?.length
    ? me.profile.availableDefaultResourceIds
    : allVehicles.filter((v) => v.available)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const effectiveSelectedId = selectedId ?? available[0]?.id ?? null

  useEffect(() => {
    void omClient.getAssignments().then((res) => {
      const items = Array.isArray(res)
        ? res
        : ((res as { items?: Record<string, unknown>[] }).items || [])
      setAssignments(items)
    })
  }, [])

  async function startShift() {
    if (!effectiveSelectedId || busy) return
    setBusy(true)
    try {
      if (me?.todayAssignment?.id && !me.todayAssignment.shiftStart) {
        await omClient.startAssignmentShift(me.todayAssignment.id, {
          action: 'start',
          resourceId: effectiveSelectedId,
        })
      } else {
        await omClient.startAdHocAssignment({ resourceId: effectiveSelectedId })
      }
      await refreshMe()
      const plate = available.find((v) => v.id === effectiveSelectedId)?.plate
      setToast(plate ? `Zmiana rozpoczęta · ${plate}` : 'Zmiana rozpoczęta')
      window.setTimeout(() => router.replace('/app'), 800)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się rozpocząć zmiany')
      setBusy(false)
    }
  }

  async function endShift() {
    if (!me?.todayAssignment?.id || busy) return
    setBusy(true)
    try {
      await omClient.startAssignmentShift(me.todayAssignment.id, { action: 'end' })
      await refreshMe()
      setToast('Zmiana zakończona')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zakończyć zmiany')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  const showStart =
    startMode ||
    me?.dashboardState === 'A' ||
    me?.dashboardState === 'B' ||
    me?.dashboardState === 'D'
  const onShift = me?.dashboardState === 'C'
  const planned = Boolean(me?.todayAssignment && !me.todayAssignment.shiftStart)

  const filteredAssignments = useMemo(() => {
    if (historyScope === 'all') return assignments
    const from = startOfWeek().getTime()
    return assignments.filter((item) => {
      const raw = String(item.assignmentDate || item.shiftStart || item.plannedShiftStart || '')
      const t = new Date(raw).getTime()
      return Number.isFinite(t) && t >= from
    })
  }, [assignments, historyScope])

  return (
    <AppShell>
      <PageHeader title="Zmiany" />
      <div className="space-y-3 px-5 pb-36">
        {onShift && me?.todayAssignment ? (
          <SurfaceCard padding="lg">
            <p className="text-[15px] font-semibold text-[var(--success)]">Zmiana w toku</p>
            <p className="mt-2 text-[17px] font-semibold">
              {me.todayAssignment.resourceName || me.todayAssignment.resourceLabel || '—'}
            </p>
            {me.todayAssignment.resourcePlate ? (
              <div className="mt-3">
                <PlateBadge plate={me.todayAssignment.resourcePlate} />
              </div>
            ) : null}
            <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
              od {formatTime(me.todayAssignment.shiftStart)}
            </p>
            <Button className="mt-4" variant="danger" size="md" loading={busy} onClick={() => void endShift()}>
              Zakończ zmianę
            </Button>
          </SurfaceCard>
        ) : null}

        {showStart && !onShift ? (
          <section className="space-y-3">
            <h2 className="text-[17px] font-semibold">
              {planned ? 'Potwierdź pojazd i rozpocznij' : 'Wybierz auto'}
            </h2>
            {planned && me?.todayAssignment ? (
              <SurfaceCard padding="lg" className="overflow-hidden !p-0">
                <div className="relative h-36 bg-[var(--bg-surface-raised)]">
                  <Image
                    src="/brand/fleet-hero-green.webp"
                    alt=""
                    fill
                    className="object-cover"
                    style={{ objectPosition: '50% 40%' }}
                  />
                </div>
                <div className="p-5">
                  <p className="text-[15px] text-[var(--text-secondary)]">Zaplanowana zmiana</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold tabular-nums" style={{ fontStretch: '112%' }}>
                    {formatTime(me.todayAssignment.plannedShiftStart)}–{formatTime(me.todayAssignment.plannedShiftEnd)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {me.todayAssignment.resourcePlate ? (
                      <PlateBadge plate={me.todayAssignment.resourcePlate} />
                    ) : (
                      <span />
                    )}
                    <span className="text-[15px] text-[var(--text-secondary)]">
                      {me.todayAssignment.resourceName || me.todayAssignment.resourceLabel}
                    </span>
                  </div>
                </div>
              </SurfaceCard>
            ) : null}

            {available.length === 0 ? (
              <p className="text-[15px] text-[var(--text-secondary)]">Brak dostępnych pojazdów.</p>
            ) : (
              available.map((vehicle, index) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedId(vehicle.id)}
                  className={`w-full rounded-[20px] border p-4 text-left ${
                    effectiveSelectedId === vehicle.id
                      ? 'border-[var(--accent)] tint-accent-soft'
                      : 'border-[var(--separator)] bg-[var(--bg-surface)]'
                  } ${index === 0 && !planned ? 'min-h-[96px]' : ''}`}
                >
                  <p className="font-semibold">{vehicle.name || vehicle.label}</p>
                  {vehicle.plate ? (
                    <div className="mt-2">
                      <PlateBadge plate={vehicle.plate} />
                    </div>
                  ) : null}
                </button>
              ))
            )}

            {allVehicles.filter((v) => !v.available).length ? (
              <div className="pt-2">
                <p className="mb-2 text-[15px] text-[var(--text-secondary)]">Zajęte</p>
                {allVehicles
                  .filter((v) => !v.available)
                  .map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex h-[52px] items-center justify-between border-b border-[var(--separator)] opacity-60"
                    >
                      <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-[0.04em]" style={{ fontStretch: '112%' }}>
                        {vehicle.plate || vehicle.label}
                      </span>
                      <span className="text-[15px] text-[var(--text-secondary)]">Zajęte</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {assignments.length > 0 ? (
          <section className="pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold">Historia</h2>
            </div>
            <SegmentedControl
              value={historyScope}
              onChange={setHistoryScope}
              options={[
                { id: 'week', label: 'Ten tydzień' },
                { id: 'all', label: 'Wszystkie' },
              ]}
            />
            <ul className="mt-3 space-y-3">
              {(historyScope === 'all' ? filteredAssignments.slice(0, 30) : filteredAssignments).map((item) => (
                <li key={String(item.id)}>
                  <SurfaceCard>
                    <p className="text-[15px] text-[var(--text-secondary)]">
                      {String(item.assignmentDate || '')}
                    </p>
                    <p className="mt-1 text-[17px] font-semibold">
                      {String(item.resourceName || item.resourceLabel || 'Zmiana')}
                    </p>
                    <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                      {formatTime(String(item.shiftStart || item.plannedShiftStart || ''))}–
                      {formatTime(String(item.shiftEnd || item.plannedShiftEnd || ''))}
                    </p>
                  </SurfaceCard>
                </li>
              ))}
            </ul>
            {filteredAssignments.length === 0 ? (
              <p className="mt-3 text-[15px] text-[var(--text-secondary)]">Brak zmian w tym zakresie.</p>
            ) : null}
          </section>
        ) : null}
      </div>

      {showStart && !onShift ? (
        <ActionBar>
          <Button loading={busy} disabled={!effectiveSelectedId} onClick={() => void startShift()}>
            {planned ? 'Rozpocznij zmianę' : 'Potwierdź i rozpocznij'}
          </Button>
        </ActionBar>
      ) : null}

      <Toast message={toast} />
    </AppShell>
  )
}

export default function ShiftsPage() {
  return (
    <Suspense fallback={<div className="p-6">Ładowanie…</div>}>
      <ShiftsInner />
    </Suspense>
  )
}
