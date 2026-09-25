'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'
import { formatTime } from '@/lib/format'

function vehicleTitle(v: {
  name?: string | null
  label?: string | null
  plate?: string | null
}) {
  const raw = (v.name || v.label || '').trim()
  const plate = v.plate?.trim()
  if (!raw) return plate || 'Pojazd'
  if (plate && raw.includes(plate)) return raw.replace(plate, '').replace(/[·•|,]+/g, ' ').trim() || plate
  return raw
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
    () => me?.profile?.defaultResourceIds ?? [],
    [me?.profile?.defaultResourceIds],
  )
  const available = useMemo(() => {
    const list = me?.profile?.availableDefaultResourceIds?.length
      ? me.profile.availableDefaultResourceIds
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
      const plate = selected?.plate
      toast.success(plate ? `Zmiana rozpoczęta · ${plate}` : 'Zmiana została rozpoczęta')
      onClose()
      onStarted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.')
      setBusy(false)
    }
  }

  const title = planned ? 'Potwierdź pojazd' : 'Start zmiany Ad-hoc'
  const subtitle = planned
    ? 'Potwierdź auto przypisane do dzisiejszej zmiany albo wybierz inne.'
    : 'Rozpoczynasz zmianę tym pojazdem:'

  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {planned && me?.todayAssignment && !pickOther ? (
          <div className="overflow-hidden rounded-[20px] border border-[var(--separator)] bg-[var(--bg-surface)]">
            <div className="relative h-36 bg-[var(--bg-surface-raised)]">
              <Image
                src="/brand/fleet-hero-green.webp"
                alt=""
                fill
                className="object-cover"
                style={{ objectPosition: '50% 40%' }}
              />
            </div>
            <div className="space-y-3 p-4">
              <p className="text-[15px] text-[var(--text-secondary)]">Zaplanowana zmiana</p>
              <p
                className="font-[family-name:var(--font-display)] text-[28px] font-[600] tabular-nums"
                style={{ fontStretch: '112%' }}
              >
                {formatTime(me.todayAssignment.plannedShiftStart)}–
                {formatTime(me.todayAssignment.plannedShiftEnd)}
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-[600]">
                    {vehicleTitle({
                      name: me.todayAssignment.resourceName,
                      label: me.todayAssignment.resourceLabel,
                      plate: me.todayAssignment.resourcePlate,
                    })}
                  </p>
                  {me.todayAssignment.resourcePlate ? (
                    <div className="mt-2">
                      <PlateBadge plate={me.todayAssignment.resourcePlate} />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="flex-none text-[15px] font-[600] text-[var(--accent)]"
                  onClick={() => setPickOther(true)}
                >
                  Wybierz inne auto
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {(!planned || pickOther) && selected ? (
          <button
            type="button"
            onClick={() => setSelectedId(selected.id)}
            className="w-full rounded-[20px] border-2 border-[var(--accent)] bg-[var(--bg-surface)] p-4 text-left tint-accent-soft"
          >
            <p className="text-[17px] font-[600]">
              {vehicleTitle(selected)}
              {selected.plate ? ` · ${selected.plate}` : ''}
            </p>
            {selected.plate ? (
              <div className="mt-2.5">
                <PlateBadge plate={selected.plate} />
              </div>
            ) : null}
          </button>
        ) : null}

        {(!planned || pickOther) && available.length > 1 ? (
          <div className="space-y-2">
            <p className="text-[15px] font-[500] text-[var(--text-secondary)]">Inne dostępne</p>
            {available
              .filter((v) => v.id !== selectedId)
              .map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedId(vehicle.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--separator)] bg-[var(--bg-surface)] px-4 py-3.5 text-left"
                >
                  <span className="min-w-0 truncate text-[16px] font-[600]">
                    {vehicleTitle(vehicle)}
                  </span>
                  {vehicle.plate ? <PlateBadge plate={vehicle.plate} size="sm" /> : null}
                </button>
              ))}
          </div>
        ) : null}

        {(!planned || pickOther) && available.length === 0 ? (
          <p className="text-[15px] text-[var(--text-secondary)]">Brak dostępnych pojazdów.</p>
        ) : null}

        {occupied.length > 0 && (!planned || pickOther) ? (
          <div>
            <p className="mb-2 text-[15px] text-[var(--text-secondary)]">Zajęte</p>
            {occupied.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex h-[52px] items-center justify-between border-b border-[var(--separator)] opacity-60"
              >
                <span
                  className="font-[family-name:var(--font-display)] text-[17px] font-[600] tracking-[0.04em]"
                  style={{ fontStretch: '112%' }}
                >
                  {vehicle.plate || vehicleTitle(vehicle)}
                </span>
                <span className="text-[15px] text-[var(--text-secondary)]">Zajęte</span>
              </div>
            ))}
          </div>
        ) : null}

        <Button loading={busy} disabled={!selectedId} onClick={() => void startShift()}>
          Rozpocznij zmianę
        </Button>
        {!selectedId ? (
          <p className="text-center text-[15px] text-[var(--text-secondary)]">Wybierz pojazd</p>
        ) : null}
      </div>
    </BottomSheet>
  )
}
