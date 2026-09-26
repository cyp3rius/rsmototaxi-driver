'use client'

import { Check, ChevronRight, Lock, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { cn } from '@/lib/cn'

const FLEET_COORDINATOR_TEL = '+48508222321'
const FLEET_COORDINATOR_LABEL = '508 222 321'

type Vehicle = {
  id: string
  label: string
  name: string | null
  plate: string | null
  color: string | null
  available: boolean
}

function vehicleTitle(v: { name?: string | null; label?: string | null; plate?: string | null }) {
  const raw = (v.name || v.label || '').trim()
  const plate = v.plate?.trim()
  if (!raw) return plate || 'Pojazd'
  if (plate && raw.includes(plate)) return raw.replace(plate, '').replace(/[·•|,]+/g, ' ').trim() || plate
  return raw
}

function colorDot(color: string | null | undefined) {
  const c = (color || '').trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c
  return 'var(--accent)'
}

/** CRM photos later — fixed-height placeholder matching design card photo band. */
function VehiclePhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-[var(--bg-surface-raised)]',
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--bg-surface-raised)_0_12px,var(--bg-surface)_12px_24px)] opacity-80" />
      <span className="relative text-[13px] font-medium text-[var(--text-tertiary)]">Zdjęcie pojazdu</span>
    </div>
  )
}

function SheetCancel({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-[52px] w-full items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function StartShiftSheet({
  open,
  onClose,
  onStarted,
}: {
  open: boolean
  onClose: () => void
  onStarted?: () => void
}) {
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickOther, setPickOther] = useState(false)

  const planned = Boolean(me?.todayAssignment && !me.todayAssignment.shiftStart)
  const allVehicles = useMemo(
    () => (me?.profile?.defaultResourceIds ?? []) as Vehicle[],
    [me?.profile?.defaultResourceIds],
  )
  const available = useMemo(() => {
    const list = me?.profile?.availableDefaultResourceIds?.length
      ? (me.profile.availableDefaultResourceIds as Vehicle[])
      : allVehicles.filter((v) => v.available)
    return list
  }, [me, allVehicles])

  const occupied = allVehicles.filter((v) => !available.some((a) => a.id === v.id))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setPickOther(false)
      setBusy(false)
      const preferred =
        (planned && me?.todayAssignment?.resourceId) ||
        available[0]?.id ||
        me?.profile?.defaultResourceId ||
        null
      setSelectedId(preferred)
    })
  }, [open, planned, me, available])

  const selected =
    available.find((v) => v.id === selectedId) ||
    allVehicles.find((v) => v.id === selectedId) ||
    null

  const confirmAssigned = planned && !pickOther
  const noVehicles = available.length === 0

  async function startShift() {
    if (!selectedId || busy) return
    setBusy(true)
    try {
      if (planned && me?.todayAssignment?.id) {
        await omClient.startAssignmentShift(me.todayAssignment.id, {
          action: 'start',
          resourceId: selectedId,
        })
      } else {
        await omClient.startAdHocAssignment({ resourceId: selectedId })
      }
      await refreshMe()
      const plate = selected?.plate || me?.todayAssignment?.resourcePlate
      toast.success(plate ? `Zmiana rozpoczęta · ${plate}` : 'Zmiana została rozpoczęta')
      onClose()
      onStarted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.')
      setBusy(false)
    }
  }

  const assignedPlate = me?.todayAssignment?.resourcePlate
  const assignedName = vehicleTitle({
    name: me?.todayAssignment?.resourceName,
    label: me?.todayAssignment?.resourceLabel,
    plate: me?.todayAssignment?.resourcePlate,
  })
  const assignedColor = me?.todayAssignment?.resourceColor

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pb-2">
        {noVehicles && !confirmAssigned ? (
          <>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
              style={{ fontStretch: '115%' }}
            >
              Start zmiany Ad-hoc
            </h2>
            <p className="mt-1.5 text-[16px] leading-[23px] text-[var(--text-secondary)]">
              Nie masz dostępnych żadnych pojazdów. Skontaktuj się z koordynatorem floty:
            </p>
            <a
              href={`tel:${FLEET_COORDINATOR_TEL}`}
              className="mt-4 inline-flex items-center gap-2 text-[17px] font-semibold tabular-nums text-[var(--accent)]"
            >
              <Phone size={18} strokeWidth={2} aria-hidden />
              {FLEET_COORDINATOR_LABEL}
            </a>
            <div className="mt-6">
              <SheetCancel label="Zamknij" onClick={onClose} />
            </div>
          </>
        ) : null}

        {confirmAssigned ? (
          <>
            <p className="mt-2 text-[15px] font-semibold text-[var(--accent)]">
              Przypisany przez dyspozytora
            </p>
            <h2
              className="mt-1.5 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
              style={{ fontStretch: '115%' }}
            >
              Potwierdź pojazd na tę zmianę
            </h2>
            <div className="mt-4 overflow-hidden rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)]">
              <VehiclePhotoPlaceholder className="h-[180px]" />
              <div className="flex items-center justify-between gap-3 p-4">
                {assignedPlate ? (
                  <PlateBadge plate={assignedPlate} size="lg" />
                ) : (
                  <span className="text-[17px] font-semibold">{assignedName}</span>
                )}
                <span className="flex items-center gap-1.5 text-[15px] text-[var(--text-secondary)]">
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: colorDot(assignedColor) }}
                  />
                  {assignedName}
                </span>
              </div>
            </div>
            <Button className="mt-6" loading={busy} onClick={() => void startShift()}>
              Rozpocznij zmianę
            </Button>
            <button
              type="button"
              className="mt-2 flex h-14 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] text-[17px] font-medium"
              onClick={() => setPickOther(true)}
            >
              Wybierz inne auto
              <ChevronRight size={18} strokeWidth={2} aria-hidden />
            </button>
          </>
        ) : null}

        {!noVehicles && (!planned || pickOther) ? (
          <>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
              style={{ fontStretch: '115%' }}
            >
              {planned ? 'Potwierdź pojazd na tę zmianę' : 'Start zmiany Ad-hoc'}
            </h2>
            <p className="mt-1.5 text-[16px] leading-[23px] text-[var(--text-secondary)]">
              {planned
                ? 'Dyspozytor przypisał Ci ten pojazd. Możesz wybrać inny.'
                : 'Wybierz jeden ze swoich pojazdów.'}
            </p>

            {selected ? (
              <button
                type="button"
                className="mt-4 w-full rounded-[22px] border-2 border-[var(--accent)] p-[18px] text-left"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 9%, var(--bg-surface))',
                }}
                onClick={() => setSelectedId(selected.id)}
              >
                <VehiclePhotoPlaceholder className="mb-3.5 h-32 rounded-[14px]" />
                <div className="flex items-center justify-between gap-3">
                  {selected.plate ? (
                    <PlateBadge plate={selected.plate} size="xl" />
                  ) : (
                    <span className="text-[19px] font-semibold">{vehicleTitle(selected)}</span>
                  )}
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-on)]">
                    <Check size={16} strokeWidth={3.2} aria-hidden />
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[16px] text-[var(--text-primary)]">
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: colorDot(selected.color) }}
                  />
                  <span>
                    {vehicleTitle(selected)}
                    {selected.id === me?.profile?.defaultResourceId ? ' · Pojazd domyślny' : ''}
                  </span>
                </p>
              </button>
            ) : null}

            {(available.filter((v) => v.id !== selectedId).length > 0 || occupied.length > 0) && (
              <>
                <p className="mb-2 mt-4 text-[15px] font-semibold text-[var(--text-secondary)]">
                  Inne pojazdy
                </p>
                <div className="overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
                  {available
                    .filter((v) => v.id !== selectedId)
                    .map((vehicle, index, arr) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => setSelectedId(vehicle.id)}
                        className={cn(
                          'flex min-h-[60px] w-full items-center gap-3 px-3.5 text-left',
                          (index < arr.length - 1 || occupied.length > 0) &&
                            'border-b border-[var(--separator)]',
                        )}
                      >
                        <span
                          className="font-[family-name:var(--font-display)] text-[19px] font-semibold tracking-[0.04em]"
                          style={{ fontStretch: '112%' }}
                        >
                          {vehicle.plate || vehicleTitle(vehicle)}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] text-[var(--text-secondary)]">
                          <span
                            className="size-2.5 flex-none rounded-full"
                            style={{ background: colorDot(vehicle.color) }}
                          />
                          <span className="truncate">{vehicleTitle(vehicle)}</span>
                        </span>
                        <span className="size-[26px] flex-none rounded-full border-[1.5px] border-[var(--separator)]" />
                      </button>
                    ))}
                  {occupied.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex min-h-[52px] items-center gap-2.5 px-3.5 text-[15px] text-[var(--text-tertiary)]"
                    >
                      <Lock size={16} strokeWidth={2} className="flex-none" aria-hidden />
                      <span className="text-[var(--text-secondary)]">
                        {vehicle.plate || vehicleTitle(vehicle)} · w użyciu
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button
              className="mt-6"
              loading={busy}
              disabled={!selectedId}
              onClick={() => void startShift()}
            >
              Rozpocznij zmianę
            </Button>
            {!selectedId ? (
              <p className="mt-2 text-center text-[15px] text-[var(--text-secondary)]">Wybierz pojazd</p>
            ) : (
              <SheetCancel label="Anuluj" onClick={onClose} />
            )}
          </>
        ) : null}
      </div>
    </BottomSheet>
  )
}
