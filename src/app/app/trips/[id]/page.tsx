'use client'

import { ChevronDown, ChevronUp, Lock, Plane, Receipt } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { ActionBar } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { ReceiptSheet, receiptUiStatusFromRecord, ReceiptStatusBadge } from '@/components/ui/ReceiptSheet'
import { SlideToConfirm } from '@/components/ui/SlideToConfirm'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { Toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { formatElapsed, formatMoneyShort, formatTime } from '@/lib/format'
import { readTripMeta, tripTypeLabel } from '@/lib/tripMeta'

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { me, refreshMe } = useAuth()
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    void omClient.getTrips({ id: params.id }).then((res) => {
      const found = res.items[0] ?? null
      setTrip(found)
      if (found && String(found.status) === 'in_progress') {
        router.replace('/app/trips/live')
      }
    })
  }, [params.id, router])

  const status = String(trip?.status || '')
  const isLive = status === 'in_progress'
  const onShift = me?.dashboardState === 'C'
  const meta = readTripMeta(trip)
  const platform = Boolean(trip?.platform)

  useEffect(() => {
    if (!isLive) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isLive])

  const liveTimer = !trip?.startedAt
    ? '0:00'
    : formatElapsed(now - new Date(String(trip.startedAt)).getTime())

  const shiftTimer = !me?.todayAssignment?.shiftStart
    ? null
    : formatElapsed(now - new Date(me.todayAssignment.shiftStart).getTime())

  async function setStatus(next: string) {
    if (!trip) return
    setBusy(true)
    try {
      await omClient.updateTrip({ id: trip.id, status: next })
      await refreshMe()
      const res = await omClient.getTrips({ id: params.id })
      setTrip(res.items[0] ?? null)
      setToast(next === 'in_progress' ? 'Kurs rozpoczęty' : 'Kurs zakończony')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Błąd aktualizacji')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  async function uploadReceipt(file: File, documentNumber: string) {
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('tripId', params.id)
      const uploaded = (await omClient.uploadAttachment(form)) as { id?: string }
      await omClient.updateTrip({
        id: params.id,
        receiptAttachmentId: uploaded.id,
        receiptDocumentNumber: documentNumber || null,
        completionMode: 'receipt',
        status: status === 'scheduled' ? 'completed' : status,
      })
      const res = await omClient.getTrips({ id: params.id })
      setTrip(res.items[0] ?? null)
      setReceiptOpen(false)
      setToast('Paragon dodany')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload nieudany')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  const receiptStatus = trip ? receiptUiStatusFromRecord(trip) : null
  const detailTitle = platform
    ? String(trip?.platform || 'Platforma')
    : isLive
      ? 'Kurs live'
      : status === 'scheduled'
        ? 'Kurs zaplanowany'
        : 'Szczegóły kursu'

  return (
    <AppShell hideNav={isLive}>
      <PageHeader title={detailTitle} onBack={() => router.back()} />

      {!trip ? (
        <p className="px-5 text-[var(--text-secondary)]">Ładowanie…</p>
      ) : (
        <div className="space-y-3 px-5 pb-36">
          {isLive && onShift ? (
            <div className="flex h-[52px] items-center gap-2.5 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5">
              <span className="size-2 rounded-full bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]" />
              <span className="text-[15px] font-semibold text-[var(--success)]">Na zmianie</span>
              {shiftTimer ? <span className="text-[17px] font-semibold tabular-nums">{shiftTimer}</span> : null}
              <span className="flex-1" />
              {me?.todayAssignment?.resourcePlate ? (
                <PlateBadge plate={me.todayAssignment.resourcePlate} size="sm" />
              ) : null}
            </div>
          ) : null}

          {platform ? (
            <div className="flex items-center gap-3 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-3.5 py-3 text-[15px] leading-5">
              <Lock size={20} className="flex-none text-[var(--text-secondary)]" strokeWidth={1.9} />
              Kurs z aplikacji platformy. Nie można go edytować.
            </div>
          ) : null}

          {isLive ? (
            <SurfaceCard className="rounded-[26px]" padding="lg">
              <p className="text-[15px] font-semibold text-[var(--accent)]">Kurs live w trakcie</p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-[64px] font-semibold leading-none tabular-nums" style={{ fontStretch: '112%' }}>
                {liveTimer}
              </p>
              <p className="mt-6 text-[15px] text-[var(--text-secondary)]">Skąd · od {formatTime(String(trip.startedAt || ''))}</p>
              <p className="text-[19px] font-semibold leading-[26px]">{meta.tripRequest?.from || 'Lokalizacja GPS'}</p>
              <p className="mt-4 text-[15px] leading-5 text-[var(--text-secondary)]">
                Po zakończeniu uzupełnisz trasę i szczegóły kursu. Nie zamykaj aplikacji: GPS działa tylko przy otwartym ekranie.
              </p>
            </SurfaceCard>
          ) : (
            <SurfaceCard padding="lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold text-[var(--accent)]">
                  {status === 'scheduled' ? 'Zaplanowany' : status === 'completed' || status === 'pending_authorization' ? 'Zakończony' : tripTypeLabel(trip.tripType)}
                </span>
                <span className="text-[15px] text-[var(--text-secondary)]">{formatMoneyShort(trip.revenueAmount)}</span>
              </div>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[52px] font-semibold leading-[1.05] tabular-nums" style={{ fontStretch: '112%' }}>
                {formatTime(String(trip.startedAt || ''))}
              </p>
              <div className="mt-3.5 grid grid-cols-[14px_1fr] gap-x-3">
                <span className="flex flex-col items-center pt-1.5">
                  <span className="size-2.5 rounded-full border-2 border-[var(--accent)]" />
                  <span className="my-1 w-0.5 flex-1 bg-[var(--separator)]" />
                  <span className="size-2.5 rounded-[2px] bg-[var(--accent)]" />
                </span>
                <span className="flex flex-col gap-3.5">
                  <span>
                    <span className="block text-[17px] font-semibold">{meta.tripRequest?.from || '—'}</span>
                    {meta.tripRequest?.fromNote ? (
                      <span className="block text-[15px] text-[var(--text-secondary)]">{meta.tripRequest.fromNote}</span>
                    ) : null}
                  </span>
                  <span>
                    <span className="block text-[17px] font-semibold">{meta.tripRequest?.to || '—'}</span>
                    {meta.tripRequest?.toNote ? (
                      <span className="block text-[15px] text-[var(--text-secondary)]">{meta.tripRequest.toNote}</span>
                    ) : null}
                  </span>
                </span>
              </div>
              {meta.tripRequest?.flightNumber ? (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-[var(--bg-surface-raised)] px-3 py-2.5 text-[15px]">
                  <Plane size={20} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
                  <span>
                    <b className="font-semibold">{meta.tripRequest.flightNumber}</b>
                    {meta.tripRequest.flightOrigin ? ` z ${meta.tripRequest.flightOrigin}` : ''}
                  </span>
                </div>
              ) : null}
            </SurfaceCard>
          )}

          {receiptStatus === 'missing' && status !== 'scheduled' && !platform ? (
            <div className="flex min-h-16 items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] tint-warning px-4 py-2">
              <Receipt size={22} className="text-[var(--warning)]" strokeWidth={1.8} />
              <span className="flex-1 text-[16px] font-semibold">Brak paragonu</span>
              <Button size="md" className="!h-12 !w-auto px-4" onClick={() => setReceiptOpen(true)}>
                Dodaj paragon
              </Button>
            </div>
          ) : null}

          {receiptStatus && receiptStatus !== 'missing' && !platform ? (
            <button type="button" onClick={() => setReceiptOpen(true)} className="text-left">
              <ReceiptStatusBadge status={receiptStatus} />
            </button>
          ) : null}

          {!platform ? (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex min-h-14 w-full items-center justify-between rounded-[18px] border border-[var(--separator)] px-4 text-[16px] font-semibold"
            >
              Więcej szczegółów
              {moreOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : null}

          {moreOpen || platform ? (
            <SurfaceCard className="overflow-hidden !p-0">
              {[
                ['Typ', platform ? String(trip.platform) : tripTypeLabel(trip.tripType)],
                ['Status', status],
                ['Start', formatTime(String(trip.startedAt || ''))],
                ['Koniec', trip.endedAt ? formatTime(String(trip.endedAt)) : '—'],
                ['Kwota', formatMoneyShort(trip.revenueAmount)],
                [
                  'Paragon',
                  receiptStatus === 'missing'
                    ? 'Brak paragonu'
                    : receiptStatus === 'processing'
                      ? 'Przetwarzanie'
                      : receiptStatus === 'needs_review'
                        ? 'Do sprawdzenia'
                        : receiptStatus === 'verified'
                          ? 'Zweryfikowany'
                          : receiptStatus === 'offline'
                            ? 'Czeka na synchronizację'
                            : 'nie dotyczy',
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-[var(--separator)] px-4 py-3 text-[15px] last:border-0">
                  <span className="text-[var(--text-secondary)]">{k}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
            </SurfaceCard>
          ) : null}

          {status === 'scheduled' && !platform ? (
            <button
              type="button"
              onClick={() => setReceiptOpen(true)}
              className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-[var(--separator)] px-4 py-3 text-left"
            >
              <Receipt size={20} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">Dodaj paragon</span>
                <span className="block text-[15px] text-[var(--text-secondary)]">
                  Dodanie paragonu oznaczy kurs jako zakończony
                </span>
              </span>
            </button>
          ) : null}
        </div>
      )}

      {!platform ? (
        <ActionBar>
          {status === 'scheduled' && onShift ? (
            <SlideToConfirm label="Przesuń, aby rozpocząć" onConfirm={() => setStatus('in_progress')} disabled={busy} />
          ) : null}
          {status === 'scheduled' && !onShift ? (
            <Button onClick={() => router.push('/app/shifts?start=1')}>Rozpocznij zmianę, żeby ruszyć</Button>
          ) : null}
          {isLive ? (
            <SlideToConfirm label="Przesuń, aby zakończyć" onConfirm={() => setStatus('completed')} disabled={busy} />
          ) : null}
        </ActionBar>
      ) : null}

      <ReceiptSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        busy={busy}
        onUpload={uploadReceipt}
        status={receiptStatus}
        initialDocumentNumber={String(trip?.receiptDocumentNumber || '')}
        subtitle={
          status === 'scheduled'
            ? 'Dodanie paragonu oznaczy kurs jako zakończony.'
            : 'Zrób zdjęcie lub wybierz plik (obraz albo PDF).'
        }
      />
      <Toast message={toast} />
    </AppShell>
  )
}
