'use client'

import {
  Building2,
  CreditCard,
  Ellipsis,
  Landmark,
  Lock,
  MapPin,
  Smartphone,
  Star,
  User,
  Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ActionBar, actionBarContentPadCss } from '@/components/ui/ActionBar'
import { AddReceiptControl, useAddReceiptState } from '@/components/ui/AddReceiptControl'
import { Button } from '@/components/ui/Button'
import { CustomerPicker, type SelectedCustomer } from '@/components/ui/CustomerSheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelectTile } from '@/components/ui/SelectTile'
import { TextField } from '@/components/ui/TextField'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { translateApiError } from '@/lib/om/errors'
import {
  clearLiveTripDraft,
  getActiveLiveTripDraft,
  upsertLiveTripDraft,
  type LiveTripDraft,
} from '@/lib/offline/liveTripDraft'
import { useStackBack } from '@/lib/transitions/react/StackLayer'
import { PAYMENT_OPTIONS, TRIP_TYPE_OPTIONS, tripTypeRequiresReceipt } from '@/lib/tripMeta'

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

export default function LiveTripFinishPage() {
  const router = useRouter()
  const stackBack = useStackBack(() => router.replace('/app/trips/live'))
  const toast = useToast()
  const { refreshMe } = useAuth()
  const [draft, setDraft] = useState<LiveTripDraft | null>(null)
  const [tripType, setTripType] = useState<(typeof TRIP_TYPE_OPTIONS)[number]['id']>('client')
  const [payment, setPayment] = useState<(typeof PAYMENT_OPTIONS)[number]['id']>('cash')
  const [amount, setAmount] = useState('')
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null)
  const [busy, setBusy] = useState(false)
  const receipt = useAddReceiptState()
  const needsReceipt = tripTypeRequiresReceipt(tripType)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const local = await getActiveLiveTripDraft()
      if (cancelled) return
      if (!local) {
        router.replace('/app/trips')
        return
      }
      if (local.phase === 'active') {
        router.replace('/app/trips/live')
        return
      }
      if (local.phase === 'ended') {
        await upsertLiveTripDraft({ ...local, phase: 'finishing' })
      }
      setDraft(local)
      if (local.estimatedAmount) setAmount(local.estimatedAmount)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (!draft || busy) return
    if ((tripType === 'client' || tripType === 'other') && !customer) {
      toast.warning('Wybierz lub dodaj klienta')
      return
    }
    if (needsReceipt && !receipt.file) {
      toast.warning('Paragon jest wymagany')
      return
    }
    if (tripType !== 'internal' && tripType !== 'private' && !amount.trim()) {
      toast.warning('Podaj kwotę końcową')
      return
    }
    setBusy(true)
    try {
      let receiptAttachmentId: string | null = null
      if (needsReceipt && receipt.file) {
        const form = new FormData()
        form.set('file', receipt.file)
        const uploaded = (await omClient.uploadAttachment(form)) as { id?: string }
        receiptAttachmentId = uploaded.id || null
        if (!receiptAttachmentId) throw new Error('Could not upload receipt photo.')
      }

      const parsedAmount = Number(amount.replace(',', '.'))
      const distanceKm =
        draft.gpsDistanceKm > 0.05
          ? Number(draft.gpsDistanceKm.toFixed(2))
          : draft.routeDistanceKm
      const endedAt = draft.endedAt || new Date().toISOString()

      const body: Record<string, unknown> = {
        tripType,
        status: 'completed',
        startedAt: draft.startedAt,
        endedAt,
        paymentMethod: tripType === 'internal' || tripType === 'private' ? null : payment,
        revenueAmount: Number.isFinite(parsedAmount) ? parsedAmount : null,
        distanceKm,
        customerEntityId: customer?.id || null,
        ...(receiptAttachmentId ? { receiptAttachmentId } : {}),
        ...(receipt.documentNumber ? { receiptDocumentNumber: receipt.documentNumber } : {}),
        metadata: {
          paymentMethod: tripType === 'internal' || tripType === 'private' ? null : payment,
          tripRequest: {
            from: draft.from,
            to: draft.to,
            fromAddress: draft.from,
            toAddress: draft.to,
            stops: draft.stops,
            paymentType: tripType === 'internal' || tripType === 'private' ? undefined : payment,
            durationText: draft.durationText || undefined,
            distanceKm: distanceKm ?? undefined,
            basePrice: draft.estimatedAmount || undefined,
            estimatedAmount: draft.estimatedAmount || undefined,
          },
        },
      }

      const result = (await omClient.createTrip(body)) as { id?: string; status?: string }
      await clearLiveTripDraft(draft.id)
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

  if (!draft) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader title="Zakończ kurs" onBack={stackBack} />
        <div className="flex flex-1 items-center justify-center px-5 text-[15px] text-[var(--text-secondary)]">
          Ładowanie…
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Szczegóły kursu" onBack={stackBack} />
      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-3"
        data-scroll
        style={{ paddingBottom: actionBarContentPadCss() }}
      >
        <p className="rounded-[18px] bg-[var(--bg-surface-raised)] px-4 py-3 text-[15px] text-[var(--text-secondary)]">
          {draft.from} → {draft.to}
          {draft.gpsDistanceKm > 0.05
            ? ` · GPS ${draft.gpsDistanceKm.toFixed(1)} km`
            : draft.routeDistanceKm != null
              ? ` · ≈ ${draft.routeDistanceKm.toFixed(1)} km`
              : ''}
          . Wpisz kwotę końcową i szczegóły — dopiero teraz kurs trafi do floty.
        </p>

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
          <TextField
            label="Kwota końcowa"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            prefix="PLN"
          />
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

      <ActionBar>
        <Button loading={busy} onClick={() => void save()}>
          Zapisz kurs
        </Button>
      </ActionBar>
    </div>
  )
}
