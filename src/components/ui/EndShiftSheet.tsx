'use client'

import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
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
  tripCount,
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
  /** Total trips on this shift (for Paragony X z Y). */
  tripCount?: number | null
  missingReceiptTrips: Array<{ id: string; label: string; meta?: string }>
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open || shiftEnd) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [open, shiftEnd])

  const durationMs =
    shiftStart != null
      ? (shiftEnd ? new Date(shiftEnd).getTime() : now) - new Date(shiftStart).getTime()
      : null
  const duration = durationMs != null ? formatElapsed(durationMs) : '—'
  const gpsLabel =
    gpsKm != null
      ? `${Number(gpsKm).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
      : '—'
  const totalTrips = tripCount ?? Math.max(missingReceiptTrips.length, 0)
  const withReceipt = Math.max(0, totalTrips - missingReceiptTrips.length)
  const receiptsLabel =
    totalTrips > 0 ? `${withReceipt} z ${totalTrips}` : missingReceiptTrips.length > 0 ? '—' : '—'
  const receiptsWarn = missingReceiptTrips.length > 0

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pb-2">
        <h2
          className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
          style={{ fontStretch: '115%' }}
        >
          Zakończyć zmianę?
        </h2>
        <p className="mt-1.5 text-[16px] text-[var(--text-secondary)]">
          Od {formatTime(shiftStart)}, trwa {duration}
          {plate ? ` · ${plate}` : ''}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[18px] bg-[var(--bg-surface-raised)] px-5 py-4">
          <div>
            <div className="text-[15px] text-[var(--text-secondary)]">Kursy</div>
            <div className="text-[20px] font-semibold tabular-nums">{totalTrips}</div>
          </div>
          <div>
            <div className="text-[15px] text-[var(--text-secondary)]">GPS</div>
            <div className="text-[20px] font-semibold tabular-nums">{gpsLabel}</div>
          </div>
          <div>
            <div className="text-[15px] text-[var(--text-secondary)]">Paragony</div>
            <div
              className={`text-[20px] font-semibold tabular-nums ${receiptsWarn ? 'text-[var(--warning)]' : ''}`}
            >
              {receiptsLabel}
            </div>
          </div>
        </div>

        {missingReceiptTrips.length > 0 ? (
          <>
            <p className="mt-4 text-[15px] font-medium leading-5 text-[var(--warning)]">
              Bez paragonu. Możesz dodać go teraz albo później.
            </p>
            <div className="mt-2 overflow-hidden rounded-[18px] border border-[var(--separator)]">
              {missingReceiptTrips.map((trip) => (
                <a
                  key={trip.id}
                  href={`/app/trips/${trip.id}`}
                  className="flex min-h-16 items-center gap-3 bg-[var(--bg-surface)] px-3.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--text-primary)]">
                    {trip.label}
                  </span>
                  <span className="flex flex-none items-center gap-1 text-[15px] font-semibold text-[var(--accent)]">
                    Dodaj paragon
                    <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                  </span>
                </a>
              ))}
            </div>
          </>
        ) : null}

        <Button className="mt-6" loading={busy} onClick={() => void onConfirm()}>
          Zakończ zmianę
        </Button>
        <button
          type="button"
          className="flex h-[52px] w-full items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
          onClick={onClose}
        >
          Wróć do zmiany
        </button>
      </div>
    </BottomSheet>
  )
}
