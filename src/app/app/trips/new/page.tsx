'use client'

import { useRouter } from 'next/navigation'
import {
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Ellipsis,
  History,
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
import { AppShell } from '@/components/shell/AppShell'
import { AddressField } from '@/components/ui/AddressField'
import { ActionBar } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { SelectTile } from '@/components/ui/SelectTile'
import { CustomerPicker, type SelectedCustomer } from '@/components/ui/CustomerSheet'
import { TextField } from '@/components/ui/TextField'
import { Toast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { PAYMENT_OPTIONS, TRIP_TYPE_OPTIONS } from '@/lib/tripMeta'
import {
  nowLocalInput,
  shiftWindowBounds,
  todayStartLocalInput,
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
  banknote: Wallet,
  'credit-card': CreditCard,
  smartphone: Smartphone,
  nfc: Smartphone,
  star: Star,
} as const

export default function NewTripPage() {
  const router = useRouter()
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
  const [tripType, setTripType] = useState<(typeof TRIP_TYPE_OPTIONS)[number]['id']>('client')
  const [payment, setPayment] = useState<(typeof PAYMENT_OPTIONS)[number]['id']>('cash')
  const [amount, setAmount] = useState('')
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [durationText, setDurationText] = useState<string | null>(null)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (mode === 'live') return 'Kurs live'
    if (mode === 'schedule') return 'Zaplanuj kurs'
    if (mode === 'past') return 'Kurs przeszły'
    return 'Nowy kurs'
  }, [mode])

  function pickMode(next: Mode) {
    if (next === 'live' && !onShift) {
      router.push('/app/shifts?start=1')
      return
    }
    setMode(next)
    setStep(1)
    setFieldError(null)
    if (next === 'live') {
      setStartedAt(nowLocalInput())
      setEndedAt('')
    } else if (next === 'schedule') {
      const d = new Date()
      d.setHours(d.getHours() + 1, 0, 0, 0)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      setStartedAt(d.toISOString().slice(0, 16))
      setEndedAt('')
    } else if (next === 'past') {
      setStartedAt(todayStartLocalInput())
      const end = new Date()
      end.setMinutes(end.getMinutes() - end.getTimezoneOffset())
      setEndedAt(end.toISOString().slice(0, 16))
    }
  }

  function goStep2() {
    if (mode === 'choose') return
    const err = validateTripTimes({
      mode,
      onShift,
      startedAt,
      endedAt,
      me,
    })
    if (err) {
      setFieldError(err)
      setToast(err)
      return
    }
    setFieldError(null)
    setStep(2)
  }

  async function recalculate() {
    if (!from.trim() || !to.trim()) {
      setToast('Podaj adresy skąd i dokąd')
      return
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
      })) as { distanceKm?: number; durationText?: string; distanceText?: string }

      const km = typeof dist.distanceKm === 'number' ? dist.distanceKm : null
      setDistanceKm(km)
      setDurationText(dist.durationText || dist.distanceText || null)

      if (km && km > 0) {
        const start = startedAt ? new Date(startedAt) : new Date()
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
          setToast(`Sugerowana kwota: ${quote.totalPrice.toFixed(2)} ${quote.currency || 'PLN'}`)
        } else {
          setToast(km ? `Dystans ≈ ${km.toFixed(1)} km` : 'Przeliczono trasę')
        }
      } else {
        setToast('Nie udało się wyliczyć dystansu')
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Przeliczanie nie powiodło się')
    } finally {
      setQuoteBusy(false)
    }
  }

  async function save() {
    if (mode === 'choose') return
    const timeErr = validateTripTimes({ mode, onShift, startedAt, endedAt, me })
    if (timeErr) {
      setToast(timeErr)
      return
    }
    if ((tripType === 'client' || tripType === 'other') && !customer) {
      setToast('Wybierz lub dodaj klienta')
      return
    }
    setBusy(true)
    try {
      const startIso = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
      const endIso = endedAt ? new Date(endedAt).toISOString() : null
      const status =
        mode === 'live' ? 'in_progress' : mode === 'schedule' ? 'scheduled' : 'completed'
      const body: Record<string, unknown> = {
        tripType,
        status,
        startedAt: startIso,
        endedAt: mode === 'live' ? null : endIso || startIso,
        paymentMethod: tripType === 'internal' || tripType === 'private' ? null : payment,
        revenueAmount: amount ? Number(amount.replace(',', '.')) : null,
        distanceKm: distanceKm,
        customerEntityId: customer?.id || null,
        metadata: {
          tripRequest: {
            from: from.trim(),
            to: to.trim(),
            stops: stops.filter((s) => s.trim()),
          },
        },
      }
      const result = (await omClient.createTrip(body)) as { id?: string; status?: string }
      await refreshMe()
      if (mode === 'live') {
        router.replace('/app/trips/live')
        return
      }
      if (result.status === 'pending_authorization' || tripType === 'internal') {
        setToast('Kurs zapisany. Czeka na autoryzację.')
      } else {
        setToast('Kurs zapisany')
      }
      window.setTimeout(() => {
        router.replace(result.id ? `/app/trips/${result.id}` : '/app/trips')
      }, 700)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zapisać kursu')
      setBusy(false)
    }
  }

  if (mode === 'choose') {
    return (
      <AppShell hideNav>
        <PageHeader title="Nowy kurs" onClose={() => router.back()} />
        <div className="space-y-3 px-5 pb-10">
          {onShift ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[15px] text-[var(--text-secondary)]">Pojazd na zmianie</span>
                {plate ? <PlateBadge plate={plate} /> : null}
              </div>
              <button
                type="button"
                onClick={() => pickMode('live')}
                className="flex min-h-24 w-full items-center gap-3.5 rounded-[22px] bg-[var(--accent)] px-[18px] py-[18px] text-left text-[var(--accent-on)]"
              >
                <Zap size={28} strokeWidth={2} />
                <span className="flex-1">
                  <span className="block text-[19px] font-semibold">Kurs live</span>
                  <span className="block text-[15px] opacity-85">Start teraz, trasa z GPS</span>
                </span>
                <ChevronRight size={20} strokeWidth={2.2} />
              </button>
            </>
          ) : (
            <>
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
                <Button className="mt-3" size="md" variant="secondary" onClick={() => router.push('/app/shifts?start=1')}>
                  Rozpocznij zmianę
                </Button>
              </div>
            </>
          )}

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
      </AppShell>
    )
  }

  return (
    <AppShell hideNav>
      <PageHeader title={title} onBack={() => (step === 1 ? setMode('choose') : setStep(1))} />
      <div className="px-6">
        <div className="grid grid-cols-2 gap-1.5">
          <span className={`h-1 rounded-sm ${step >= 1 ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]'}`} />
          <span className={`h-1 rounded-sm ${step >= 2 ? 'bg-[var(--accent)]' : 'bg-[var(--separator)]'}`} />
        </div>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Krok {step} z 2 · {step === 1 ? 'Trasa i czasy' : 'Szczegóły kursu'}
        </p>
      </div>

      <div className="space-y-4 px-5 pb-36 pt-4">
        {step === 1 ? (
          <>
            <AddressField label="Skąd" value={from} onChange={setFrom} placeholder="Adres startu" allowMyLocation />
            {stops.map((stop, index) => (
              <div key={`stop-${index}`} className="relative">
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

            <div className="flex flex-wrap items-center gap-2">
              <Button size="md" variant="secondary" loading={quoteBusy} onClick={() => void recalculate()}>
                Przelicz
              </Button>
              {distanceKm != null ? (
                <span className="text-[15px] text-[var(--text-secondary)]">
                  ≈ {distanceKm.toFixed(1)} km{durationText ? ` · ${durationText}` : ''}
                </span>
              ) : null}
            </div>

            {mode !== 'live' ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <TimeShortcut
                    label="Teraz"
                    onClick={() => {
                      setStartedAt(nowLocalInput())
                      if (mode === 'past') setEndedAt(nowLocalInput())
                    }}
                  />
                  <TimeShortcut label="Dziś 8:00" onClick={() => setStartedAt(todayStartLocalInput())} />
                  <TimeShortcut
                    label="Wczoraj 8:00"
                    onClick={() => {
                      setStartedAt(yesterdayStartLocalInput())
                      if (mode === 'past') {
                        const d = new Date()
                        d.setDate(d.getDate() - 1)
                        d.setHours(9, 0, 0, 0)
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
                        setEndedAt(d.toISOString().slice(0, 16))
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <TextField
                    label="Start"
                    type="datetime-local"
                    value={startedAt}
                    min={mode === 'past' ? bounds.min : mode === 'schedule' ? nowLocalInput() : undefined}
                    max={mode === 'past' ? bounds.max || nowLocalInput() : undefined}
                    onChange={(e) => {
                      setStartedAt(e.target.value)
                      setFieldError(null)
                    }}
                    error={fieldError && !endedAt ? fieldError : undefined}
                  />
                  <TextField
                    label="Koniec"
                    type="datetime-local"
                    value={endedAt}
                    min={startedAt || bounds.min}
                    max={mode === 'past' ? bounds.max || nowLocalInput() : undefined}
                    onChange={(e) => {
                      setEndedAt(e.target.value)
                      setFieldError(null)
                    }}
                    error={mode === 'past' && fieldError ? fieldError : undefined}
                  />
                </div>
                {fieldError ? (
                  <p className="text-[15px] text-[var(--danger)]">{fieldError}</p>
                ) : null}
              </>
            ) : (
              <p className="rounded-[18px] bg-[var(--bg-surface-raised)] px-4 py-3 text-[15px] text-[var(--text-secondary)]">
                Start od razu. Po zakończeniu uzupełnisz trasę i szczegóły.
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[15px] font-medium">Typ kursu</p>
              <div className="grid grid-cols-3 gap-2">
                {TRIP_TYPE_OPTIONS.map((opt) => {
                  const Icon = tripIcons[opt.icon]
                  return (
                    <SelectTile
                      key={opt.id}
                      selected={tripType === opt.id}
                      onClick={() => setTripType(opt.id)}
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
                />
                <Button size="md" variant="secondary" loading={quoteBusy} onClick={() => void recalculate()}>
                  Przelicz sugerowaną kwotę
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ActionBar>
        {step === 1 ? (
          <Button
            disabled={!from.trim() || !to.trim() || (mode !== 'live' && !startedAt)}
            onClick={goStep2}
          >
            Dalej: szczegóły kursu
          </Button>
        ) : (
          <Button loading={busy} onClick={() => void save()}>
            Zapisz kurs
          </Button>
        )}
      </ActionBar>
      <Toast message={toast} />
    </AppShell>
  )
}

function TimeShortcut({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-full border border-[var(--separator)] bg-[var(--bg-surface)] px-3 text-[15px] font-medium"
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
