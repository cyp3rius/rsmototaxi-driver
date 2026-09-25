'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'

function ShiftsInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { me, refreshMe } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const startMode = search.get('start') === '1'

  const vehicles = me?.profile?.availableDefaultResourceIds?.length
    ? me.profile.availableDefaultResourceIds
    : me?.profile?.defaultResourceIds || []
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && vehicles[0]) setSelectedId(vehicles[0].id)
  }, [vehicles, selectedId])

  async function startShift() {
    if (!selectedId || busy) return
    setBusy(true)
    try {
      if (me?.todayAssignment?.id && !me.todayAssignment.shiftStart) {
        await omClient.startAssignmentShift(me.todayAssignment.id, {
          action: 'start',
          resourceId: selectedId,
        })
      } else {
        await omClient.startAdHocAssignment({ resourceId: selectedId })
      }
      await refreshMe()
      const plate = vehicles.find((v) => v.id === selectedId)?.plate
      setToast(plate ? `Zmiana rozpoczęta · ${plate}` : 'Zmiana rozpoczęta')
      window.setTimeout(() => router.replace('/app'), 800)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się rozpocząć zmiany')
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <h1 className="text-[22px] font-semibold">Zmiany</h1>

        {me?.todayAssignment ? (
          <section className="mt-4 rounded-[22px] bg-[var(--bg-surface)] p-5">
            <p className="text-[15px] text-[var(--text-secondary)]">Dzisiejsza zmiana</p>
            <p className="mt-1 text-[17px] font-semibold">
              {me.todayAssignment.resourceName || me.todayAssignment.resourceLabel || '—'}
            </p>
            {me.todayAssignment.resourcePlate ? (
              <p className="plate mt-2">{me.todayAssignment.resourcePlate}</p>
            ) : null}
            <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
              Status: {me.todayAssignment.shiftStart && !me.todayAssignment.shiftEnd ? 'w toku' : me.todayAssignment.status}
            </p>
          </section>
        ) : (
          <p className="mt-4 text-[15px] text-[var(--text-secondary)]">Brak zaplanowanej zmiany — start ad hoc.</p>
        )}

        {(startMode || me?.dashboardState === 'A' || me?.dashboardState === 'B' || me?.dashboardState === 'D') &&
        me?.dashboardState !== 'C' ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-[17px] font-semibold">Wybierz auto</h2>
            {vehicles.length === 0 ? (
              <p className="text-[15px] text-[var(--text-secondary)]">Brak dostępnych pojazdów.</p>
            ) : (
              vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  disabled={!vehicle.available}
                  onClick={() => setSelectedId(vehicle.id)}
                  className={`w-full rounded-[18px] p-4 text-left ${
                    selectedId === vehicle.id
                      ? 'tint-accent'
                      : 'bg-[var(--bg-surface)]'
                  } ${!vehicle.available ? 'opacity-50' : ''}`}
                >
                  <p className="font-semibold">{vehicle.name || vehicle.label}</p>
                  <p className="plate mt-1 text-[20px]">{vehicle.plate || '—'}</p>
                  {!vehicle.available ? (
                    <p className="mt-1 text-[15px] text-[var(--text-secondary)]">Zajęte</p>
                  ) : null}
                </button>
              ))
            )}
            <div className="pt-2">
              <Button loading={busy} disabled={!selectedId} onClick={() => void startShift()}>
                Potwierdź i rozpocznij
              </Button>
            </div>
          </section>
        ) : null}

        <Toast message={toast} />
      </div>
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
