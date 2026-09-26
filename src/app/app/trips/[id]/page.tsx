'use client'

import { ChevronDown, ChevronUp, Lock, Plane, Receipt } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useStackBack } from '@/lib/transitions/react/StackLayer'
import { useEffect, useMemo, useState } from 'react'
import { ActionBar, actionBarContentPadCss } from '@/components/ui/ActionBar'
import { BOTTOM_EDGE_FADE_PAD_PX } from '@/components/ui/BottomEdgeFade'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { MissingReceiptBanner, NeedsReviewReceiptBanner } from '@/components/ui/AddReceiptControl'
import {
  ReceiptSheet,
  receiptUiStatusFromRecord,
  ReceiptStatusBadge,
  isReceiptChangeLocked,
} from '@/components/ui/ReceiptSheet'
import { SlideToConfirm } from '@/components/ui/SlideToConfirm'
import { StatusChip } from '@/components/ui/StatusChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { useStartShift } from '@/components/ui/StartShiftProvider'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { getActiveLiveTripDraft } from '@/lib/offline/liveTripDraft'
import { formatElapsedHms, formatMoneyShort, formatTime } from '@/lib/format'
import {
  buildTripDetailRows,
  isTripPrepaid,
  resolveTripRequest,
  tripDetailTitle,
  tripDropoffLabel,
  tripPaymentLabel,
  tripPickupLabel,
  tripRouteSubtitle,
  tripStatusChipLabel,
  tripTypeLabel,
  tripWhenLabel,
} from '@/lib/tripMeta'

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const stackBack = useStackBack()
  const { me, refreshMe } = useAuth()
  const toast = useToast()
  const { openStartShift } = useStartShift()
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [priceDraft, setPriceDraft] = useState('')
  const [distanceDraft, setDistanceDraft] = useState('')

  useEffect(() => {
    void (async () => {
      const draft = await getActiveLiveTripDraft()
      if (draft && draft.id === params.id) {
        router.replace(draft.phase === 'active' ? '/app/trips/live' : '/app/trips/live/finish')
        return
      }
      const res = await omClient.getTrips({ id: params.id })
      const found = res.items[0] ?? null
      setTrip(found)
      if (found) {
        const request = resolveTripRequest(found)
        setPriceDraft(
          found.revenueAmount != null && found.revenueAmount !== ''
            ? String(found.revenueAmount)
            : '',
        )
        setDistanceDraft(
          request.distanceKm != null && request.distanceKm !== ''
            ? String(request.distanceKm)
            : found.distanceKm != null
              ? String(found.distanceKm)
              : '',
        )
        const status = String(found.status || '')
        if (status === 'completed' || status === 'paid' || status === 'pending_authorization') {
          setMoreOpen(true)
        }
        // Pure live trips (no destination yet) keep the dedicated live screen
        if (status === 'in_progress') {
          const hasRoute = Boolean(tripPickupLabel(found) && tripDropoffLabel(found))
          if (!hasRoute) router.replace('/app/trips/live')
        }
      }
    })()
  }, [params.id, router])

  const status = String(trip?.status || '')
  const isLiveStyle = status === 'in_progress' && !tripDropoffLabel(trip)
  const isInProgress = status === 'in_progress'
  const isScheduled = status === 'scheduled'
  const isCompleted =
    status === 'completed' || status === 'paid' || status === 'pending_authorization'
  const onShift = me?.dashboardState === 'C'
  const platform = Boolean(trip?.platform)
  const prepaid = isTripPrepaid(trip)
  const request = useMemo(() => resolveTripRequest(trip), [trip])

  useEffect(() => {
    if (!isInProgress) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isInProgress])

  const liveTimer = !trip?.startedAt
    ? '0:00:00'
    : formatElapsedHms(now - new Date(String(trip.startedAt)).getTime())

  const shiftTimer = !me?.todayAssignment?.shiftStart
    ? null
    : formatElapsedHms(now - new Date(me.todayAssignment.shiftStart).getTime())

  async function persistCommercial(next?: { revenueAmount?: number | null; distanceKm?: number | null }) {
    if (!trip || platform) return
    const revenueAmount =
      next?.revenueAmount !== undefined
        ? next.revenueAmount
        : priceDraft
          ? Number(priceDraft.replace(',', '.'))
          : null
    const distanceKm =
      next?.distanceKm !== undefined
        ? next.distanceKm
        : distanceDraft
          ? Number(distanceDraft.replace(',', '.'))
          : null
    await omClient.updateTrip({
      id: trip.id,
      revenueAmount: Number.isFinite(revenueAmount as number) ? revenueAmount : null,
      distanceKm: Number.isFinite(distanceKm as number) ? distanceKm : null,
      metadata: {
        ...(typeof trip.metadata === 'object' && trip.metadata ? trip.metadata : {}),
        tripRequest: {
          ...request,
          distanceKm: Number.isFinite(distanceKm as number) ? distanceKm : request.distanceKm,
        },
      },
    })
  }

  async function setStatus(next: string) {
    if (!trip) return
    setBusy(true)
    try {
      if (isScheduled) await persistCommercial()
      await omClient.updateTrip({ id: trip.id, status: next })
      await refreshMe()
      const res = await omClient.getTrips({ id: params.id })
      setTrip(res.items[0] ?? null)
      toast.success(next === 'in_progress' ? 'Kurs rozpoczęty' : 'Kurs zakończony')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd aktualizacji')
    } finally {
      setBusy(false)
    }
  }

  async function uploadReceipt(file: File, documentNumber: string) {
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const uploaded = (await omClient.uploadAttachment(form, {
        recordId: params.id,
        purpose: 'trip',
      })) as { id?: string }
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
      setMoreOpen(true)
      toast.success('Paragon dodany')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload nieudany')
    } finally {
      setBusy(false)
    }
  }

  const receiptStatus = trip ? receiptUiStatusFromRecord(trip) : null
  const detailTitle = tripDetailTitle(trip)
  const statusLabel = tripStatusChipLabel(status)
  const whenLabel = tripWhenLabel(trip)
  const from = tripPickupLabel(trip)
  const to = tripDropoffLabel(trip)
  const fromSub = request.fromNote || null
  const toNote = request.toNote || null
  const routeStats = (() => {
    if (toNote) return null
    const km =
      request.distanceKm != null && request.distanceKm !== ''
        ? Number(request.distanceKm)
        : trip?.distanceKm != null
          ? Number(trip.distanceKm)
          : null
    const duration =
      request.durationText ||
      (request.durationMin != null ? `${request.durationMin} min` : null)
    if ((km == null || !Number.isFinite(km)) && !duration) return null
    const parts: string[] = []
    if (km != null && Number.isFinite(km)) {
      parts.push(`ok. ${km.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`)
    }
    if (duration) parts.push(duration)
    return parts.join(' · ')
  })()
  const payment = tripPaymentLabel(trip)
  const detailRows = trip ? buildTripDetailRows(trip) : []
  const showActionBar =
    !platform &&
    ((isScheduled && onShift) || (isScheduled && !onShift) || (isInProgress && !isLiveStyle))
  const heroTime =
    isCompleted && trip?.endedAt
      ? `${formatTime(String(trip.startedAt || ''))}–${formatTime(String(trip.endedAt))}`
      : isInProgress
        ? formatTime(String(trip?.startedAt || ''))
        : formatTime(String(trip?.startedAt || ''))

  const statusTone =
    isCompleted
      ? 'success'
      : isInProgress
        ? 'accent'
        : isScheduled
          ? 'neutral'
          : 'neutral'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={detailTitle} onBack={stackBack} />

      {!trip ? (
        <LoadingBlock className="min-h-0 flex-1 px-5" />
      ) : (
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pt-3"
          data-scroll
          style={{
            paddingBottom: showActionBar ? actionBarContentPadCss() : BOTTOM_EDGE_FADE_PAD_PX,
          }}
        >
          {isInProgress && onShift ? (
            <div className="flex h-[52px] items-center gap-2.5 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] px-3.5">
              <span className="size-2 rounded-full bg-[var(--success)] animate-[rsPulse_1.6s_ease-out_infinite]" />
              <span className="text-[15px] font-semibold text-[var(--success)]">Na zmianie</span>
              {shiftTimer ? (
                <span className="text-[17px] font-semibold tabular-nums">{shiftTimer}</span>
              ) : null}
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

          {isLiveStyle ? (
            <SurfaceCard className="rounded-[26px]" padding="lg">
              <p className="text-[15px] font-semibold text-[var(--accent)]">Kurs live w trakcie</p>
              <p
                className="mt-1.5 font-[family-name:var(--font-display)] text-[64px] font-semibold leading-none tabular-nums"
                style={{ fontStretch: '112%' }}
              >
                {liveTimer}
              </p>
              <p className="mt-6 text-[15px] text-[var(--text-secondary)]">
                Skąd · od {formatTime(String(trip.startedAt || ''))}
              </p>
              <p className="text-[19px] font-semibold leading-[26px]">
                {from || 'Lokalizacja GPS'}
              </p>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="rounded-[22px]" padding="lg">
              <div className="flex items-center justify-between gap-2">
                <StatusChip
                  tone={statusTone === 'success' ? 'success' : statusTone === 'accent' ? 'accent' : 'neutral'}
                  pulse={isInProgress ? true : isCompleted ? false : undefined}
                  className={
                    isScheduled
                      ? '!bg-[var(--bg-surface-raised)] !text-[var(--text-primary)]'
                      : undefined
                  }
                >
                  {isInProgress && trip.startedAt
                    ? `W trakcie · od ${formatTime(String(trip.startedAt))}`
                    : statusLabel || tripTypeLabel(trip.tripType)}
                </StatusChip>
                <span className="text-[15px] text-[var(--text-secondary)]">
                  {whenLabel || formatMoneyShort(trip.revenueAmount)}
                </span>
              </div>

              <p
                className="mt-2 font-[family-name:var(--font-display)] text-[52px] font-semibold leading-[1.05] tabular-nums"
                style={{ fontStretch: '112%' }}
              >
                {isInProgress ? liveTimer : heroTime}
              </p>

              <div className="mt-3.5 grid grid-cols-[14px_1fr] gap-x-3">
                <span className="flex flex-col items-center">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-[var(--accent)]" />
                  <span className="my-1 w-0.5 flex-1 bg-[var(--separator)]" />
                </span>
                <span className="min-w-0 pb-3.5">
                  <span className="block text-[17px] font-semibold leading-[22px]">{from || '—'}</span>
                  {fromSub ? (
                    <span className="mt-0.5 block text-[15px] leading-5 text-[var(--text-secondary)]">
                      {fromSub}
                    </span>
                  ) : null}
                  {routeStats ? (
                    <span className="mt-1.5 block text-[15px] leading-5 text-[var(--text-secondary)]">
                      {routeStats}
                    </span>
                  ) : null}
                </span>
                <span className="flex justify-center pt-1.5">
                  <span className="size-2.5 shrink-0 rounded-[2px] bg-[var(--accent)]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-[22px]">{to || '—'}</span>
                  {toNote ? (
                    <span className="mt-0.5 block text-[15px] leading-5 text-[var(--text-secondary)]">
                      {toNote}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {prepaid ? <StatusChip tone="success">Przedpłata</StatusChip> : null}
                {request.meetAndGreet ? <StatusChip tone="neutral">Tabliczka</StatusChip> : null}
                {request.childSeat || Number(request.childSeats) > 0 ? (
                  <StatusChip tone="neutral">Fotelik</StatusChip>
                ) : null}
                {request.englishSpeakingDriver ? (
                  <StatusChip tone="neutral">Kierowca EN</StatusChip>
                ) : null}
                {isCompleted ? (
                  <>
                    <StatusChip tone="neutral">
                      {platform ? String(trip.platform) : tripTypeLabel(trip.tripType)}
                    </StatusChip>
                    {payment ? <StatusChip tone="neutral">{payment}</StatusChip> : null}
                    <StatusChip tone="neutral" className="!text-[var(--text-primary)]">
                      {formatMoneyShort(trip.revenueAmount)}
                    </StatusChip>
                  </>
                ) : null}
              </div>

              {request.flightNumber ? (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-[var(--bg-surface-raised)] px-3 py-2.5 text-[15px]">
                  <Plane size={20} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
                  <span>
                    <b className="font-semibold">{request.flightNumber}</b>
                    {request.flightOrigin ? ` z ${request.flightOrigin}` : ''}
                    {request.estimatedArrival
                      ? ` · planowo ${formatTime(request.estimatedArrival)}`
                      : ''}
                  </span>
                </div>
              ) : null}
            </SurfaceCard>
          )}

          {isScheduled && !platform ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-2 block text-[15px] font-medium text-[var(--text-secondary)]">
                    Cena
                  </span>
                  <div
                    className={`flex h-14 items-center gap-2 rounded-[14px] px-3.5 text-[20px] font-semibold tabular-nums ${
                      prepaid
                        ? 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)]'
                        : 'border border-[var(--separator)] bg-[var(--bg-surface-raised)]'
                    }`}
                  >
                    {prepaid ? <Lock size={16} strokeWidth={2} /> : null}
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={prepaid || busy}
                      value={priceDraft}
                      onChange={(e) => setPriceDraft(e.target.value)}
                      onBlur={() => void persistCommercial().catch(() => undefined)}
                      className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                      aria-label="Cena"
                    />
                    <span className="text-[16px] font-medium text-[var(--text-secondary)]">zł</span>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[15px] font-medium">Dystans</span>
                  <div className="flex h-14 items-center justify-between gap-2 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-3.5 text-[20px] font-semibold tabular-nums">
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={busy}
                      value={distanceDraft}
                      onChange={(e) => setDistanceDraft(e.target.value)}
                      onBlur={() => void persistCommercial().catch(() => undefined)}
                      className="w-full bg-transparent outline-none"
                      aria-label="Dystans"
                    />
                    <span className="text-[16px] font-medium text-[var(--text-secondary)]">km</span>
                  </div>
                </label>
              </div>
              {prepaid ? (
                <p className="-mt-1 text-[15px] leading-5 text-[var(--text-secondary)]">
                  Przedpłata online: można zmienić tylko dystans.
                </p>
              ) : null}
            </>
          ) : null}

          {isInProgress && !isLiveStyle && !platform ? (
            <div className="rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-4 py-4 text-[16px] leading-[23px] tint-accent">
              Kurs trwa. Zakończ, gdy pasażer wysiądzie. Zmieni się tylko godzina końca.
            </div>
          ) : null}

          {receiptStatus === 'missing' && isCompleted && !platform ? (
            <MissingReceiptBanner onAdd={() => setReceiptOpen(true)} />
          ) : null}

          {receiptStatus === 'needs_review' && isCompleted && !platform ? (
            <NeedsReviewReceiptBanner onCheck={() => setReceiptOpen(true)} />
          ) : null}

          {receiptStatus &&
          receiptStatus !== 'missing' &&
          receiptStatus !== 'needs_review' &&
          isCompleted &&
          !platform ? (
            isReceiptChangeLocked(trip) ? (
              <div className="space-y-2">
                <ReceiptStatusBadge status={receiptStatus} />
                <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
                  Paragon został zweryfikowany i nie można go już zmienić.
                </p>
              </div>
            ) : (
              <button type="button" onClick={() => setReceiptOpen(true)} className="text-left">
                <ReceiptStatusBadge status={receiptStatus} />
              </button>
            )
          ) : null}

          {!platform && (isScheduled || isInProgress) ? (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex min-h-14 w-full items-center justify-between rounded-[18px] border border-[var(--separator)] px-4 text-[16px] font-semibold"
            >
              Więcej szczegółów
              {moreOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : null}

          {(moreOpen || platform || isCompleted) && !isLiveStyle ? (
            <div className="overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
              {isCompleted && !platform ? (
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex min-h-[52px] w-full items-center justify-between border-b border-[var(--separator)] px-4 text-[16px] font-semibold"
                >
                  Więcej szczegółów
                  {moreOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              ) : null}
              {(moreOpen || platform) &&
                detailRows.map((row) => (
                  <div
                    key={row.k}
                    className="flex justify-between gap-3 border-b border-[var(--separator)] px-4 py-2.5 text-[15px] last:border-0"
                  >
                    <span className="text-[var(--text-secondary)]">{row.k}</span>
                    <span className="text-right font-medium">{row.v}</span>
                  </div>
                ))}
            </div>
          ) : null}

          {isScheduled && !platform ? (
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

      {showActionBar ? (
        <ActionBar>
          {isScheduled && onShift ? (
            <SlideToConfirm
              label="Przesuń, aby rozpocząć"
              onConfirm={() => setStatus('in_progress')}
              disabled={busy}
            />
          ) : null}
          {isScheduled && !onShift ? (
            <Button
              onClick={() => openStartShift()}
              variant="secondary"
              className="!h-16 border border-[var(--separator)] bg-[var(--bg-surface)]"
            >
              Rozpocznij zmianę, żeby ruszyć
            </Button>
          ) : null}
          {isInProgress && !isLiveStyle ? (
            <SlideToConfirm
              label="Przesuń, aby zakończyć"
              onConfirm={() => setStatus('completed')}
              disabled={busy}
            />
          ) : null}
        </ActionBar>
      ) : null}

      <ReceiptSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        busy={busy}
        onUpload={uploadReceipt}
        status={receiptStatus === 'missing' ? null : receiptStatus}
        attachmentId={
          typeof trip?.receiptAttachmentId === 'string' ? trip.receiptAttachmentId : null
        }
        initialDocumentNumber={
          typeof trip?.receiptDocumentNumber === 'string'
            ? trip.receiptDocumentNumber
            : typeof (trip?.metadata as { receiptDocumentNumber?: string } | null)?.receiptDocumentNumber ===
                'string'
              ? String(
                  (trip?.metadata as { receiptDocumentNumber?: string }).receiptDocumentNumber,
                )
              : ''
        }
        subtitle={
          status === 'scheduled'
            ? 'Dodanie paragonu oznaczy kurs jako zakończony.'
            : 'Zrób zdjęcie lub wybierz plik (obraz albo PDF).'
        }
        reviewHint={
          Array.isArray(trip?.warnings) && trip.warnings.length
            ? 'Sprawdź wynik rozpoznania: porównaj kwotę na paragonie z kwotą kursu.'
            : receiptStatus === 'needs_review'
              ? 'Sprawdź wynik rozpoznania: porównaj kwotę na paragonie z kwotą kursu.'
              : null
        }
      />
    </div>
  )
}
