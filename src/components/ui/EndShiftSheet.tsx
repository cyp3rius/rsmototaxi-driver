'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { formatElapsed, formatTime } from '@/lib/format'

export function EndShiftSheet({
  open,
  onClose,
  onConfirm,
  busy,
  shiftStart,
  shiftEnd,
  plate,
  gpsKm,
  missingReceiptTrips,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  busy?: boolean
  shiftStart?: string | null
  shiftEnd?: string | null
  plate?: string | null
  gpsKm?: number | string | null
  missingReceiptTrips: Array<{ id: string; label: string }>
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open || shiftEnd) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [open, shiftEnd])
  const duration =
    shiftStart != null
      ? formatElapsed((shiftEnd ? new Date(shiftEnd).getTime() : now) - new Date(shiftStart).getTime())
      : '—'

  return (
    <BottomSheet open={open} onClose={onClose} title="Zakończ zmianę" subtitle="Podsumowanie przed zamknięciem.">
      <div className="space-y-4">
        <div className="rounded-[18px] bg-[var(--bg-surface-raised)] p-4">
          <p className="text-[15px] text-[var(--text-secondary)]">Czas zmiany</p>
          <p
            className="mt-1 font-[family-name:var(--font-display)] text-[32px] font-semibold tabular-nums"
            style={{ fontStretch: '112%' }}
          >
            {duration}
          </p>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            {formatTime(shiftStart)}–{shiftEnd ? formatTime(shiftEnd) : 'teraz'}
            {plate ? ` · ${plate}` : ''}
          </p>
          {gpsKm != null ? (
            <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
              GPS {Number(gpsKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km
            </p>
          ) : null}
          {plate ? (
            <div className="mt-3">
              <PlateBadge plate={plate} />
            </div>
          ) : null}
        </div>

        {missingReceiptTrips.length > 0 ? (
          <div>
            <p className="text-[15px] font-semibold">{missingReceiptTrips.length} kursy czekają na paragon.</p>
            <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
              To informacja — nie blokuje zakończenia zmiany.
            </p>
            <ul className="mt-3 space-y-2">
              {missingReceiptTrips.map((trip) => (
                <li key={trip.id}>
                  <a
                    href={`/app/trips/${trip.id}`}
                    className="flex min-h-14 items-center justify-between rounded-[14px] border border-[var(--separator)] px-4 text-[15px] font-medium"
                  >
                    <span>{trip.label}</span>
                    <span className="text-[var(--accent)]">Dodaj paragon</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Button loading={busy} onClick={() => void onConfirm()}>
          Zakończ zmianę
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Wróć do zmiany
        </Button>
      </div>
    </BottomSheet>
  )
}
