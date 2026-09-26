'use client'

import { useRouter } from 'next/navigation'
import { useStackBack } from '@/lib/transitions/react/StackLayer'
import {
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Ellipsis,
  History,
  Landmark,
  Lock,
  MapPin,
  Plus,
  Smartphone,
  Star,
  Trash2,
  User,
  Wallet,
  Zap,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { AddressField } from '@/components/ui/AddressField'
import { ActionBar, actionBarContentPadCss } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { AddReceiptControl, useAddReceiptState } from '@/components/ui/AddReceiptControl'
import { SelectTile } from '@/components/ui/SelectTile'
import { CustomerPicker, type SelectedCustomer } from '@/components/ui/CustomerSheet'
import { TextField } from '@/components/ui/TextField'
import { useStartShift } from '@/components/ui/StartShiftProvider'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { translateApiError } from '@/lib/om/errors'
import { getActiveLiveTripDraft, startLiveTripDraft } from '@/lib/offline/liveTripDraft'
import { formatEndedAtCaption, resolveAutoEndedAtLocal } from '@/lib/route/endedAt'
import { translateRouteError } from '@/lib/route/errors'
import { PAYMENT_OPTIONS, TRIP_TYPE_OPTIONS, tripTypeRequiresReceipt } from '@/lib/tripMeta'
import {
  nowLocalInput,
  shiftWindowBounds,
  todayStartLocalInput,
  tomorrowAt8LocalInput,
  dayAfterTomorrowAt8LocalInput,
  validateTripTimes,
  yesterdayStartLocalInput,
  type TripCreateMode,
} from '@/lib/tripValidation'

type Mode = 'choose' | TripCreateMode
type Step = 1 | 2

const tripIcons = {
  user: User,
  'map-pin': MapPin,
  building: Building2,
  lock: Lock,
  ellipsis: Ellipsis,
} as const

const payIcons = {
  wallet: Wallet,
  'credit-card': CreditCard,
  landmark: Landmark,
  smartphone: Smartphone,
  star: Star,
} as const

export default function NewTripPage() {
  const router = useRouter()
  const stackBack = useStackBack()
  const toast = useToast()
  const { openStartShift } = useStartShift()
  const { me, refreshMe } = useAuth()
  const onShift = me?.dashboardState === 'C'
  const plate = me?.todayAssignment?.resourcePlate || me?.profile?.defaultResourcePlate
  const bounds = shiftWindowBounds(me)

  const [mode, setMode] = useState<Mode>('choose')
  const [step, setStep] = useState<Step>(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [stops, setStops] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [endVisible, setEndVisible] = useState(false)
  const [tripType, setTripType] = useState<(typeof TRIP_TYPE_OPTIONS)[number]['id']>('client')
  const [payment, setPayment] = useState<(typeof PAYMENT_OPTIONS)[number]['id']>('cash')
  const [amount, setAmount] = useState('')
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [durationText, setDurationText] = useState<string | null>(null)
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null)
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const receipt = useAddReceiptState()

  const needsReceipt = mode === 'past' && tripTypeRequiresReceipt(tripType)

  const title = useMemo(() => {
    if (mode === 'live') return 'Kurs live'
    if (mode === 'schedule') return 'Zaplanuj kurs'
    if (mode === 'past') return 'Kurs przeszły'
    return 'Nowy kurs'
  }, [mode])

  function pickMode(next: Mode) {
    if (next === 'live' && !onShift) {
      openStartShift()
      return
    }
    if (next === 'live') {
      void (async () => {
        const draft = await getActiveLiveTripDraft()
        if (draft) {
          router.replace('/app/trips/live')
          return
        }
        setMode('live')
        setStep(1)
        setFieldError(null)
        setEndVisible(false)
        setDistanceKm(null)
        setDurationText(null)
        setDurationSeconds(null)
        setAmount('')
        setStartedAt(nowLocalInput())
        setEndedAt('')
      })()
      return
    }
    setMode(next)
    setStep(1)
    setFieldError(null)
    setEndVisible(false)
    setDistanceKm(null)
    setDurationText(null)
    setDurationSeconds(null)
    setAmount('')
    if (next === 'schedule') {
      const d = new Date()
      d.setHours(d.getHours() + 1, 0, 0, 0)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      setStartedAt(d.toISOString().slice(0, 16))
      setEndedAt('')
    } else if (next === 'past') {
      setStartedAt(todayStartLocalInput())
      setEndedAt('')
    }
  }

  function revealAutoEnd(nextDurationSeconds?: number | null, startLocal = startedAt) {
    if (mode === 'live' || !startLocal) return null
    const seconds =
      typeof nextDurationSeconds === 'number' && nextDurationSeconds > 0
        ? nextDurationSeconds
        : durationSeconds
    const nextEnd = resolveAutoEndedAtLocal(startLocal, seconds)
    if (nextEnd) {
      setEndedAt(nextEnd)
      setEndVisible(true)
    }
    return nextEnd
  }

  async function recalculate(options?: { silent?: boolean }): Promise<{
    ok: boolean
    endedAtLocal: string | null
    durationSeconds: number | null
  }> {
    if (!from.trim() || !to.trim()) {
      if (!options?.silent) toast.warning('Podaj adresy skąd i dokąd')
      return { ok: false, endedAtLocal: null, durationSeconds: null }
    }
    setQuoteBusy(true)
    try {
      const stopPayload = [
        { address: from.trim() },
        ...stops.filter((s) => s.trim()).map((address) => ({ address: address.trim() })),
        { address: to.trim() },
      ]
      const dist = (await omClient.routeDistance({
        stops: stopPayload,
        from: from.trim(),
        to: to.trim(),
        lang: 'pl',
      })) as {
        distanceKm?: number
        durationText?: string
        distanceText?: string
        durationSeconds?: number
      }

      const km = typeof dist.distanceKm === 'number' ? dist.distanceKm : null
      const seconds =
        typeof dist.durationSeconds === 'number' && Number.isFinite(dist.durationSeconds)
          ? Math.max(0, Math.round(dist.durationSeconds))
          : null
      const resolvedSeconds = seconds && seconds > 0 ? seconds : null
      setDistanceKm(km)
      setDurationText(dist.durationText || dist.distanceText || null)
      setDurationSeconds(resolvedSeconds)
      const endedAtLocal = revealAutoEnd(resolvedSeconds)

      if (km && km > 0 && (startedAt || mode === 'live')) {
        const start = new Date(startedAt || nowLocalInput())
        const date = start.toISOString().slice(0, 10)
        const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
        const quote = (await omClient.quote({
          serviceType: 'local',
          passengers: 1,
          distanceKm: km,
          date,
          time,
        })) as { totalPrice?: number; currency?: string }
        if (typeof quote.totalPrice === 'number') {
          setAmount(String(quote.totalPrice.toFixed(2)).replace('.', ','))
          if (!options?.silent) {
            const label = mode === 'live' ? 'Orientacyjna kwota' : 'Sugerowana kwota'
            toast.success(
              `${label}: ${quote.totalPrice.toFixed(2).replace('.', ',')} ${quote.currency || 'PLN'}`,
            )
          }
        } else if (!options?.silent) {
          toast.success(km ? `Dystans ≈ ${km.toFixed(1)} km` : 'Przeliczono trasę')
        }
      } else if (!options?.silent) {
        toast.warning('Nie udało się wyliczyć dystansu')
      }
      return { ok: true, endedAtLocal, durationSeconds: resolvedSeconds }
    } catch (err) {
      const message = translateRouteError(err instanceof Error ? err.message : null)
      toast.error(message)
      return { ok: false, endedAtLocal: null, durationSeconds: null }
    } finally {
      setQuoteBusy(false)
    }
  }

  async function goStep2() {
    if (mode === 'choose') return

    let resolvedEnd = endedAt
    let resolvedDuration = durationSeconds

    if (mode !== 'live') {
      if (!endVisible || !endedAt || distanceKm == null || !amount) {
        const result = await recalculate({ silent: true })
        if (result.endedAtLocal) resolvedEnd = result.endedAtLocal
        if (result.durationSeconds != null) resolvedDuration = result.durationSeconds
        if (!resolvedEnd) {
          resolvedEnd = revealAutoEnd(resolvedDuration) || ''
        }
      } else if (!endVisible) {
        resolvedEnd = revealAutoEnd(resolvedDuration) || resolvedEnd
      }
    }

    const err = validateTripTimes({
      mode,
      onShift,
      startedAt,
      endedAt: resolvedEnd || (mode !== 'live' ? resolveAutoEndedAtLocal(startedAt, resolvedDuration) || '' : ''),
      me,
    })
    if (err) {
      setFieldError(err)
      toast.warning(err)
      return
    }
    setFieldError(null)
    setStep(2)
  }

  async function save() {
    if (mode === 'choose') return

    // Live: keep the trip on-device until the driver finishes and submits full details.
    if (mode === 'live') {
      if (!from.trim() || !to.trim()) {
        toast.warning('Podaj adresy skąd i dokąd')
        return
      }
      if (!onShift) {
        toast.warning('Kurs live można rozpocząć tylko na otwartej zmianie.')
        return
      }
      setBusy(true)
      try {
        const existing = await getActiveLiveTripDraft()
        if (existing) {
          router.replace('/app/trips/live')
          return
        }
        const startIso = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
        await startLiveTripDraft({
          from: from.trim(),
          to: to.trim(),
          stops: stops.filter((s) => s.trim()),
          startedAt: startIso,
          routeDistanceKm: distanceKm,
          durationText,
          durationSeconds,
          estimatedAmount: amount || null,
          assignmentId: me?.todayAssignment?.id ?? null,
        })
        await refreshMe()
        router.replace('/app/trips/live')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Nie udało się rozpocząć kursu live')
        setBusy(false)
      }
      return
    }

    const resolvedEnd = endedAt || resolveAutoEndedAtLocal(startedAt, durationSeconds) || ''
    const timeErr = validateTripTimes({
      mode,
      onShift,
      startedAt,
      endedAt: resolvedEnd,
      me,
    })
    if (timeErr) {
      toast.warning(timeErr)
      return
    }
    if ((tripType === 'client' || tripType === 'other') && !customer) {
      toast.warning('Wybierz lub dodaj klienta')
      return
    }
    if (needsReceipt && !receipt.file) {
      toast.warning('Paragon jest wymagany dla kursu przeszłego')
      return
    }
    setBusy(true)
    try {
      let receiptAttachmentId: string | null = null
      if (needsReceipt && receipt.file) {
        const form = new FormData()
        form.set('file', receipt.file)
        const uploaded = (await omClient.uploadAttachment(form, { purpose: 'trip' })) as {
          id?: string
        }
        receiptAttachmentId = uploaded.id || null
        if (!receiptAttachmentId) {
          throw new Error('Could not upload receipt photo.')
        }
      }
      const startIso = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
      const endIso = resolvedEnd ? new Date(resolvedEnd).toISOString() : null
      const status = mode === 'schedule' ? 'scheduled' : 'completed'
      const parsedAmount = amount ? Number(amount.replace(',', '.')) : null
      const body: Record<string, unknown> = {
        tripType,
        status,
        startedAt: startIso,
        endedAt: endIso || startIso,
        paymentMethod: tripType === 'internal' || tripType === 'private' ? null : payment,
        revenueAmount: parsedAmount,
        distanceKm: distanceKm,
        customerEntityId: customer?.id || null,
        ...(receiptAttachmentId ? { receiptAttachmentId } : {}),
        ...(receipt.documentNumber
          ? { receiptDocumentNumber: receipt.documentNumber }
          : {}),
        metadata: {
          paymentMethod: tripType === 'internal' || tripType === 'private' ? null : payment,
          tripRequest: {
            from: from.trim(),
            to: to.trim(),
            fromAddress: from.trim(),
            toAddress: to.trim(),
            stops: stops.filter((s) => s.trim()),
            paymentType: tripType === 'internal' || tripType === 'private' ? undefined : payment,
            durationText: durationText || undefined,
            distanceKm: distanceKm ?? undefined,
            basePrice: amount || undefined,
          },
        },
      }
      const result = (await omClient.createTrip(body)) as { id?: string; status?: string }
      await refreshMe()
      if (result.status === 'pending_authorization' || tripType === 'internal') {
        toast.success('Kurs zapisany. Czeka na autoryzację.')
      } else {
        toast.success('Kurs zapisany')
      }
      window.setTimeout(() => {
        router.replace(result.id ? `/app/trips/${result.id}` : '/app/trips')
      }, 700)
    } catch (err) {
      toast.error(translateApiError(err instanceof Error ? err.message : null))
      setBusy(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto" data-scroll>
        <PageHeader title="Nowy kurs" onClose={stackBack} />
        <div className="px-5 pb-10 pt-1">
          {onShift ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[15px] text-[var(--text-secondary)]">Pojazd na zmianie</span>
                {plate ? <PlateBadge plate={plate} /> : null}
              </div>
              <div className="mt-[11px] space-y-3.5">
                <button
                  type="button"
                  onClick={() => pickMode('live')}
                  className="rs-accent-fill flex min-h-24 w-full items-center gap-3.5 rounded-[22px] px-[18px] py-[18px] text-left"
                >
                  <Zap size={28} strokeWidth={2} />
                  <span className="flex-1">
                    <span className="block text-[19px] font-semibold">Kurs live</span>
                    <span className="block text-[15px] opacity-85">Start teraz, trasa z GPS</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={2.2} />
                </button>
                <ModeRow
                  icon={<Calendar size={26} className="text-[var(--accent)]" strokeWidth={1.9} />}
                  title="Zaplanuj kurs"
                  subtitle="Rezerwacja z godziną w przyszłości"
                  onClick={() => pickMode('schedule')}
                />
                <ModeRow
                  icon={<History size={26} className="text-[var(--accent)]" strokeWidth={1.9} />}
                  title="Kurs przeszły"
                  subtitle="Zakończony kurs z tej lub poprzedniej zmiany"
                  onClick={() => pickMode('past')}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <div className="rounded-[18px] bg-[var(--bg-surface-raised)] p-4 text-[16px] leading-[23px]">
                Jesteś poza zmianą. Możesz zaplanować kurs albo dodać zakończony kurs z poprzedniej zmiany.
              </div>
              <div className="rounded-[22px] border border-dashed border-[var(--separator)] p-[18px]">
                <div className="flex items-center gap-3.5 text-[var(--text-tertiary)]">
                  <Zap size={28} strokeWidth={2} />
                  <span>
                    <span className="block text-[19px] font-semibold text-[var(--text-secondary)]">Kurs live</span>
                    <span className="block text-[15px] text-[var(--text-secondary)]">
                      Rozpocznij zmianę, żeby jechać na żywo
                    </span>
                  </span>
                </div>
                <Button className="mt-3" size="md" variant="secondary" onClick={() => openStartShift()}>
                  Rozpocznij zmianę
                </Button>
              </div>
              <ModeRow
                icon={<Calendar size={26} className="text-[var(--accent)]" strokeWidth={1.9} />}
                title="Zaplanuj kurs"
                subtitle="Rezerwacja z godziną w przyszłości"
                onClick={() => pickMode('schedule')}
              />
              <ModeRow
                icon={<History size={26} className="text-[var(--accent)]" strokeWidth={1.9} />}
                title="Kurs przeszły"
                subtitle="Zakończony kurs z tej lub poprzedniej zmiany"
                onClick={() => pickMode('past')}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <PageHeader
          title={title}
          onBack={() => (mode === 'live' || step === 1 ? setMode('choose') : setStep(1))}
        />
        {mode !== 'live' ? (
          <div className="px-5 pt-3">
            <div className="grid grid-cols-2 gap-1.5">
              <span className={`h-1 rounded-sm ${step >= 1 ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]'}`} />
              <span className={`h-1 rounded-sm ${step >= 2 ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]'}`} />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pt-3"
        data-scroll
        style={{ paddingBottom: actionBarContentPadCss() }}
      >
        {mode !== 'live' ? (
          <p className="mb-5 text-[15px] text-[var(--text-secondary)]">
            Krok {step} z 2 · {step === 1 ? 'Trasa i czasy' : 'Szczegóły kursu'}
          </p>
        ) : (
          <p className="mb-5 text-[15px] text-[var(--text-secondary)]">Trasa</p>
        )}
        <div className={mode === 'live' || step === 1 ? 'space-y-5' : 'hidden'} aria-hidden={mode !== 'live' && step !== 1}>
            <AddressField label="Skąd" value={from} onChange={setFrom} placeholder="Adres startu" allowMyLocation />
            {stops.map((stop, index) => (
              <div key={`stop-${index}`} className="relative min-w-0">
                <AddressField
                  label={`Przystanek ${index + 1}`}
                  value={stop}
                  onChange={(v) =>
                    setStops((prev) => prev.map((s, i) => (i === index ? v : s)))
                  }
                  placeholder="Adres pośredni"
                />
                <button
                  type="button"
                  className="absolute right-2 top-8 flex size-10 items-center justify-center rounded-full text-[var(--danger)]"
                  onClick={() => setStops((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Usuń przystanek"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStops((prev) => [...prev, ''])}
              className="inline-flex h-11 items-center gap-1.5 text-[16px] font-semibold text-[var(--accent)]"
            >
              <Plus size={18} strokeWidth={2.2} />
              Dodaj przystanek
            </button>
            <AddressField label="Dokąd" value={to} onChange={setTo} placeholder="Adres końca" allowMyLocation />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="md"
                  variant="secondary"
                  loading={quoteBusy}
                  onClick={() => void recalculate()}
                >
                  Przelicz
                </Button>
                {distanceKm != null ? (
                  <span className="text-[15px] text-[var(--text-secondary)]">
                    ≈ {distanceKm.toFixed(1)} km{durationText ? ` · ${durationText}` : ''}
                  </span>
                ) : null}
              </div>
              {amount ? (
                <p className="text-[16px] font-semibold tabular-nums text-[var(--text-primary)]">
                  Orientacyjna kwota · {amount} zł
                  {mode === 'live' ? (
                    <span className="mt-0.5 block text-[15px] font-normal text-[var(--text-secondary)]">
                      Dokładną kwotę wpiszesz po zakończeniu kursu.
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            {mode !== 'live' ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <TimeShortcut
                    label="Teraz"
                    onClick={() => {
                      setStartedAt(nowLocalInput())
                      setEndedAt('')
                      setEndVisible(false)
                      setFieldError(null)
                    }}
                  />
                  {mode === 'schedule' ? (
                    <>
                      <TimeShortcut
                        label="Jutro 8:00"
                        onClick={() => {
                          setStartedAt(tomorrowAt8LocalInput())
                          setEndedAt('')
                          setEndVisible(false)
                          setFieldError(null)
                        }}
                      />
                      <TimeShortcut
                        label="Pojutrze 8:00"
                        onClick={() => {
                          setStartedAt(dayAfterTomorrowAt8LocalInput())
                          setEndedAt('')
                          setEndVisible(false)
                          setFieldError(null)
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <TimeShortcut
                        label="Dzisiaj 8:00"
                        onClick={() => {
                          setStartedAt(todayStartLocalInput())
                          setEndedAt('')
                          setEndVisible(false)
                          setFieldError(null)
                        }}
                      />
                      <TimeShortcut
                        label="Wczoraj 8:00"
                        onClick={() => {
                          setStartedAt(yesterdayStartLocalInput())
                          setEndedAt('')
                          setEndVisible(false)
                          setFieldError(null)
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  <TextField
                    label="Start"
                    type="datetime-local"
                    value={startedAt}
                    min={mode === 'past' ? bounds.min : mode === 'schedule' ? nowLocalInput() : undefined}
                    max={mode === 'past' ? bounds.max || nowLocalInput() : undefined}
                    onChange={(e) => {
                      setStartedAt(e.target.value)
                      setEndedAt('')
                      setEndVisible(false)
                      setFieldError(null)
                    }}
                    error={fieldError || undefined}
                  />
                  {endVisible && endedAt ? (
                    <p className="mt-2 text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                      Koniec · {formatEndedAtCaption(endedAt)}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="rounded-[18px] bg-[var(--bg-surface-raised)] px-4 py-3 text-[15px] text-[var(--text-secondary)]">
                Start od razu. Po zakończeniu uzupełnisz szczegóły i wpiszesz kwotę końcową.
              </p>
            )}
          </div>

          {mode !== 'live' ? (
          <div className={step === 2 ? 'space-y-5' : 'hidden'} aria-hidden={step !== 2}>
            <div>
              <p className="mb-2 text-[15px] font-medium">Typ kursu</p>
              <div className="grid grid-cols-3 gap-2">
                {TRIP_TYPE_OPTIONS.map((opt) => {
                  const Icon = tripIcons[opt.icon]
                  return (
                    <SelectTile
                      key={opt.id}
                      selected={tripType === opt.id}
                      onClick={() => {
                        setTripType(opt.id)
                        if (!tripTypeRequiresReceipt(opt.id)) receipt.clear()
                      }}
                      label={opt.label}
                      icon={<Icon size={22} strokeWidth={1.8} />}
                    />
                  )
                })}
              </div>
            </div>
            {tripType !== 'internal' && tripType !== 'private' ? (
              <CustomerPicker
                value={customer}
                onChange={setCustomer}
                required={tripType === 'client' || tripType === 'other'}
              />
            ) : null}
            {tripType !== 'internal' && tripType !== 'private' ? (
              <div>
                <p className="mb-2 text-[15px] font-medium">Płatność</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = payIcons[opt.icon]
                    return (
                      <SelectTile
                        key={opt.id}
                        selected={payment === opt.id}
                        onClick={() => setPayment(opt.id)}
                        label={opt.label}
                        icon={<Icon size={22} strokeWidth={1.8} />}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}
            {tripType !== 'internal' && tripType !== 'private' ? (
              <div className="space-y-2">
                <TextField
                  label="Kwota"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  prefix="PLN"
                />
                <Button
                  size="md"
                  variant="secondary"
                  loading={quoteBusy}
                  onClick={() => void recalculate()}
                >
                  Przelicz sugerowaną kwotę
                </Button>
              </div>
            ) : null}
            {needsReceipt ? (
              <AddReceiptControl
                file={receipt.file}
                previewUrl={receipt.previewUrl}
                documentNumber={receipt.documentNumber}
                onPicked={receipt.pick}
                onClear={receipt.clear}
              />
            ) : null}
          </div>
          ) : null}
      </div>

      <ActionBar>
        {mode === 'live' ? (
          <Button
            disabled={!from.trim() || !to.trim() || quoteBusy}
            loading={busy}
            onClick={() => void save()}
          >
            Ruszaj
          </Button>
        ) : step === 1 ? (
          <Button
            disabled={!from.trim() || !to.trim() || !startedAt || quoteBusy}
            loading={quoteBusy && step === 1}
            onClick={() => void goStep2()}
          >
            Dalej: szczegóły kursu
          </Button>
        ) : (
          <Button loading={busy} onClick={() => void save()}>
            Zapisz kurs
          </Button>
        )}
      </ActionBar>
    </div>
  )
}

function TimeShortcut({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-[10px] bg-[var(--bg-surface-raised)] px-3.5 text-[15px] font-medium"
    >
      {label}
    </button>
  )
}

function ModeRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] w-full items-center gap-3.5 rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] px-[18px] py-[18px] text-left"
    >
      {icon}
      <span className="flex-1">
        <span className="block text-[19px] font-semibold">{title}</span>
        <span className="block text-[15px] text-[var(--text-secondary)]">{subtitle}</span>
      </span>
      <ChevronRight size={20} className="text-[var(--text-tertiary)]" strokeWidth={2.2} />
    </button>
  )
}
