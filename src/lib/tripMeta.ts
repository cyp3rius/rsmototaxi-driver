export type TripRequestMeta = {
  from?: string
  to?: string
  fromAddress?: string
  toAddress?: string
  fromNote?: string
  toNote?: string
  stops?: string[]
  waypointAddresses?: string
  flightNumber?: string
  flightOrigin?: string
  estimatedArrival?: string
  childSeat?: boolean
  boosterSeat?: boolean
  childSeats?: number | string
  boosterSeats?: number | string
  englishSpeakingDriver?: boolean
  meetAndGreet?: boolean
  luggageCount?: number
  handLuggage?: number | string
  holdLuggage?: number | string
  passengers?: number | string
  paymentType?: string
  serviceType?: string
  contactName?: string
  contactPhone?: string
  companyName?: string
  companyTaxId?: string
  vehicleCategory?: string
  basePrice?: string | number
  distanceKm?: string | number
  durationText?: string
  isAirportPickup?: boolean
  durationMin?: number
}

export type TripMeta = {
  tripRequest?: TripRequestMeta
  distanceKm?: number
  durationMin?: number
  prepaid?: boolean
  paymentMethod?: string
  isPrepayment?: boolean
  strapi?: Record<string, unknown>
}

export function readTripMeta(trip: Record<string, unknown> | null | undefined): TripMeta {
  if (!trip || typeof trip.metadata !== 'object' || !trip.metadata) return {}
  return trip.metadata as TripMeta
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function str(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Flatten CRM + driver-app tripRequest shapes into one readable object. */
export function resolveTripRequest(trip: Record<string, unknown> | null | undefined): TripRequestMeta {
  const meta = readTripMeta(trip)
  const root = asRecord(trip?.metadata) ?? {}
  const nested = asRecord(meta.tripRequest) ?? {}
  const strapi = asRecord(root.strapi) ?? {}
  const source = { ...strapi, ...root, ...nested }

  const fromAddress =
    str(source.fromAddress) || str(source.from) || str(nested.fromAddress) || str(nested.from)
  const toAddress =
    str(source.toAddress) || str(source.to) || str(nested.toAddress) || str(nested.to)

  return {
    from: fromAddress || undefined,
    to: toAddress || undefined,
    fromAddress: fromAddress || undefined,
    toAddress: toAddress || undefined,
    fromNote: str(source.fromNote) || str(nested.fromNote) || undefined,
    toNote: str(source.toNote) || str(nested.toNote) || undefined,
    stops: Array.isArray(nested.stops)
      ? nested.stops.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : undefined,
    waypointAddresses: str(source.waypointAddresses) || undefined,
    flightNumber: str(source.flightNumber) || undefined,
    flightOrigin: str(source.flightOrigin) || undefined,
    estimatedArrival: str(source.estimatedArrival) || undefined,
    childSeat: source.childSeat === true || Number(source.childSeats) > 0,
    boosterSeat: source.boosterSeat === true || Number(source.boosterSeats) > 0,
    childSeats: source.childSeats as number | string | undefined,
    boosterSeats: source.boosterSeats as number | string | undefined,
    englishSpeakingDriver: source.englishSpeakingDriver === true,
    meetAndGreet: source.meetAndGreet === true,
    passengers: source.passengers as number | string | undefined,
    handLuggage: source.handLuggage as number | string | undefined,
    holdLuggage: source.holdLuggage as number | string | undefined,
    paymentType: str(source.paymentType) || undefined,
    serviceType: str(source.serviceType) || undefined,
    contactName: str(source.contactName) || undefined,
    contactPhone: str(source.contactPhone) || undefined,
    companyName: str(source.companyName) || undefined,
    companyTaxId: str(source.companyTaxId) || undefined,
    vehicleCategory: str(source.vehicleCategory) || undefined,
    basePrice: (source.basePrice as string | number | undefined) ?? undefined,
    distanceKm:
      (source.distanceKm as string | number | undefined) ??
      meta.distanceKm ??
      (trip?.distanceKm as number | undefined),
    durationText: str(source.durationText) || undefined,
    isAirportPickup: source.isAirportPickup === true,
    durationMin: meta.durationMin,
  }
}

function readRouteEndpoint(
  request: TripRequestMeta | undefined,
  keys: Array<'from' | 'fromAddress' | 'to' | 'toAddress'>,
): string | null {
  if (!request) return null
  for (const key of keys) {
    const raw = request[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return null
}

export function tripRouteLabel(trip: Record<string, unknown> | null | undefined) {
  const from = tripPickupLabel(trip)
  const to = tripDropoffLabel(trip)
  if (from && to) return `${from} → ${to}`
  if (from) return from
  if (to) return to
  return 'Kurs'
}

export function tripPickupLabel(trip: Record<string, unknown> | null | undefined) {
  const from = readRouteEndpoint(resolveTripRequest(trip), ['from', 'fromAddress'])
  if (from) return from
  const parsed = parseRouteFromNotes(trip)
  return parsed?.from ?? null
}

export function tripDropoffLabel(trip: Record<string, unknown> | null | undefined) {
  const to = readRouteEndpoint(resolveTripRequest(trip), ['to', 'toAddress'])
  if (to) return to
  const parsed = parseRouteFromNotes(trip)
  return parsed?.to ?? null
}

function parseRouteFromNotes(
  trip: Record<string, unknown> | null | undefined,
): { from: string; to: string } | null {
  const notes = typeof trip?.notes === 'string' ? trip.notes : ''
  const match = notes.match(/Trasa:\s*(.+?)\s*→\s*(.+?)(?:\n|$)/i)
  if (!match) return null
  const from = match[1]?.trim()
  const to = match[2]?.trim()
  if (!from || !to) return null
  return { from, to }
}

export function tripRouteSubtitle(
  trip: Record<string, unknown> | null | undefined,
  end: 'from' | 'to',
): string | null {
  const request = resolveTripRequest(trip)
  if (end === 'from') return request.fromNote || null
  if (request.toNote) return request.toNote
  const km = num(request.distanceKm)
  const duration = request.durationText || (request.durationMin != null ? `${request.durationMin} min` : null)
  if (km != null || duration) {
    const parts: string[] = []
    if (km != null) parts.push(`ok. ${km.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`)
    if (duration) parts.push(duration)
    return parts.join(' · ')
  }
  return null
}

export const TRIP_TYPE_OPTIONS = [
  { id: 'client', label: 'Klient', icon: 'user' },
  { id: 'street_hail', label: 'Z ulicy', icon: 'map-pin' },
  { id: 'internal', label: 'Wewnętrzny', icon: 'building' },
  { id: 'private', label: 'Prywatny', icon: 'lock' },
  { id: 'other', label: 'Inny', icon: 'ellipsis' },
] as const

export const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Gotówka', icon: 'wallet' },
  { id: 'card', label: 'Karta', icon: 'credit-card' },
  { id: 'transfer', label: 'Przelew', icon: 'landmark' },
  { id: 'electronic', label: 'PayPal', icon: 'smartphone' },
  { id: 'loyalty_program', label: 'Program lojalnościowy', icon: 'star' },
] as const

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Gotówka',
  card: 'Karta',
  transfer: 'Przelew',
  electronic: 'PayPal',
  loyalty_program: 'Program lojalnościowy',
  platform_app: 'Aplikacja platformy',
  other: 'Inne',
}

export const COST_TYPE_OPTIONS = [
  { id: 'fuel', label: 'Paliwo' },
  { id: 'toll', label: 'Autostrada' },
  { id: 'parking', label: 'Parking' },
  { id: 'maintenance', label: 'Serwis' },
  { id: 'other', label: 'Inne' },
] as const

export function tripTypeLabel(type: unknown) {
  const found = TRIP_TYPE_OPTIONS.find((t) => t.id === type)
  return found?.label || String(type || 'Kurs')
}

/** Matches CRM `tripTypeRequiresReceipt` for driver commercial types. */
export function tripTypeRequiresReceipt(type: string): boolean {
  return type !== 'internal'
}

export function paymentMethodLabel(method: unknown) {
  if (!method || typeof method !== 'string') return null
  return PAYMENT_LABELS[method] || null
}

export function tripPaymentLabel(trip: Record<string, unknown> | null | undefined) {
  if (!trip) return null
  const meta = readTripMeta(trip)
  const request = resolveTripRequest(trip)
  const raw =
    (typeof trip.paymentMethod === 'string' && trip.paymentMethod) ||
    meta.paymentMethod ||
    request.paymentType ||
    null
  return paymentMethodLabel(raw)
}

export function costTypeLabel(type: unknown) {
  const found = COST_TYPE_OPTIONS.find((t) => t.id === type)
  return found?.label || String(type || 'Koszt')
}

export function expenseAmountValue(item: Record<string, unknown> | null | undefined) {
  if (!item) return null
  const raw = item.amount ?? item.amountGross
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function expenseVatRate(item: Record<string, unknown> | null | undefined) {
  if (!item) return null
  const raw = item.vatRatePercent ?? item.vatRate
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function formatExpenseWhen(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86400000)
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `dziś ${time}`
  if (diffDays === -1) return 'wczoraj'
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function expenseMetaLine(item: Record<string, unknown>) {
  const parts: string[] = []
  const notes = typeof item.notes === 'string' ? item.notes.trim() : ''
  if (notes) {
    const short = notes.length > 42 ? `${notes.slice(0, 40)}…` : notes
    parts.push(short)
  }
  const when = formatExpenseWhen(String(item.occurredAt || item.createdAt || ''))
  if (when) parts.push(when)
  const vat = expenseVatRate(item)
  if (vat != null) parts.push(`VAT ${vat}%`)
  return parts.join(' · ')
}

export type ExpenseReceiptChip = {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
  pulse?: boolean
}

export function expenseReceiptChip(item: Record<string, unknown>): ExpenseReceiptChip {
  if (item.pending || item._pendingSync) {
    return { label: 'Czeka na synchronizację', tone: 'neutral' }
  }
  const ocr = String(item.ocrStatus || '')
  const hasReceipt = Boolean(item.receiptAttachmentId)
  const warnings = Array.isArray(item.warnings) ? item.warnings : []
  const hasWarnings = warnings.length > 0 || ocr === 'needs_review' || ocr === 'failed'
  if (!hasReceipt) return { label: 'Brak paragonu', tone: 'warning' }
  if (ocr === 'pending' || ocr === 'processing') {
    return { label: 'Przetwarzanie', tone: 'accent', pulse: true }
  }
  if (hasWarnings) return { label: 'Do sprawdzenia', tone: 'danger', pulse: false }
  if (ocr === 'applied' || ocr === 'extracted') {
    return { label: 'Zweryfikowany', tone: 'success' }
  }
  return { label: 'Paragon', tone: 'neutral' }
}

export function isExpenseReceiptVerified(item: Record<string, unknown>): boolean {
  if (!item.receiptAttachmentId) return false
  const ocr = String(item.ocrStatus || '')
  const warnings = Array.isArray(item.warnings) ? item.warnings : []
  if (ocr === 'pending' || ocr === 'processing') return false
  if (warnings.length > 0 || ocr === 'needs_review' || ocr === 'failed') return false
  return ocr === 'applied' || ocr === 'extracted' || ocr === 'verified'
}

export function expenseOcrErrorNote(item: Record<string, unknown>) {
  const ocr = String(item.ocrStatus || '')
  const warnings = Array.isArray(item.warnings) ? item.warnings : []
  if (ocr === 'failed' || ocr === 'needs_review' || warnings.length > 0) {
    return 'Rozpoznanie paragonu nie powiodło się. Możesz usunąć koszt i dodać go ponownie.'
  }
  return null
}

export function isPlatformTrip(trip: Record<string, unknown> | null | undefined) {
  if (!trip) return false
  if (trip.platform) return true
  const type = String(trip.tripType || '')
  return type === 'platform' || type === 'event'
}

export function isAppScopedTrip(trip: Record<string, unknown> | null | undefined) {
  return Boolean(trip) && !isPlatformTrip(trip)
}

export function isTripPrepaid(trip: Record<string, unknown> | null | undefined) {
  if (!trip) return false
  const meta = readTripMeta(trip)
  return Boolean(meta.prepaid || meta.isPrepayment || trip.prepayment || trip.isPrepayment)
}

export function receiptStatusLabel(trip: Record<string, unknown>) {
  if (isPlatformTrip(trip)) return null
  if (trip.receiptAttachmentId) {
    const ocr = String(trip.ocrStatus || '')
    if (ocr === 'pending' || ocr === 'processing') return 'Przetwarzanie'
    if (ocr === 'needs_review' || ocr === 'failed') return 'Do sprawdzenia'
    if (ocr === 'applied' || ocr === 'extracted') return 'Zweryfikowany'
    return 'Paragon'
  }
  const type = String(trip.tripType || '')
  if (type === 'internal') return null
  return 'Brak paragonu'
}

export function tripStatusChipLabel(status: unknown) {
  switch (String(status || '')) {
    case 'scheduled':
      return 'Zaplanowany'
    case 'in_progress':
      return 'W trakcie'
    case 'completed':
    case 'paid':
      return 'Zakończony'
    case 'cancelled':
      return 'Anulowany'
    case 'pending_authorization':
      return 'Czeka na autoryzację'
    default:
      return null
  }
}

export function tripDetailTitle(trip: Record<string, unknown> | null | undefined) {
  if (!trip) return 'Szczegóły kursu'
  if (trip.platform) return 'Kurs z platformy'
  const status = String(trip.status || '')
  if (status === 'in_progress') {
    const request = resolveTripRequest(trip)
    const hasRoute = Boolean(request.fromAddress && request.toAddress)
    return hasRoute ? 'Kurs w trakcie' : 'Kurs live'
  }
  if (status === 'scheduled') return 'Kurs zaplanowany'
  if (status === 'completed' || status === 'paid' || status === 'pending_authorization') {
    return 'Kurs zakończony'
  }
  return 'Szczegóły kursu'
}

export function tripWhenLabel(trip: Record<string, unknown> | null | undefined) {
  if (!trip?.startedAt) return null
  const start = new Date(String(trip.startedAt))
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86400000)
  const status = String(trip.status || '')

  if (status === 'scheduled') {
    const mins = Math.round((start.getTime() - now.getTime()) / 60000)
    if (diffDays === 0) {
      if (mins >= 0) return `Dziś · za ${mins} min`
      return 'Dziś'
    }
    if (diffDays === 1) {
      return `Jutro, ${start.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })}`
    }
    return start.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })
  }
  if (diffDays === 0) return 'Dziś'
  if (diffDays === -1) return 'Wczoraj'
  return start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
}

export function polishCourseWord(count: number) {
  const n = Math.abs(count)
  if (n === 1) return 'kurs'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'kursy'
  return 'kursów'
}

export function driverFirstName(member?: {
  firstName?: string | null
  displayName?: string | null
} | null) {
  const raw = (member?.firstName || member?.displayName || '').trim()
  const first = raw.split(/\s+/)[0]
  return first || 'kierowco'
}

export const VEHICLE_COLOR_PLACEHOLDER = '#D8B878'

export function resolveVehicleColor(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return VEHICLE_COLOR_PLACEHOLDER
}

export function buildTripDetailRows(trip: Record<string, unknown>): Array<{ k: string; v: string }> {
  const request = resolveTripRequest(trip)
  const meta = readTripMeta(trip)
  const status = tripStatusChipLabel(trip.status) || String(trip.status || '—')
  const payment = tripPaymentLabel(trip)
  const stops =
    request.stops?.length
      ? request.stops.join(' · ')
      : request.waypointAddresses || 'brak'
  const passengers = str(request.passengers) || '1'
  const luggageParts: string[] = []
  if (Number(request.holdLuggage) > 0) luggageParts.push(`${request.holdLuggage} walizki`)
  if (Number(request.handLuggage) > 0) luggageParts.push(`${request.handLuggage} podręczny`)
  if (request.luggageCount) luggageParts.push(String(request.luggageCount))

  const rows: Array<{ k: string; v: string }> = [
    { k: 'Typ', v: trip.platform ? String(trip.platform) : tripTypeLabel(trip.tripType) },
    {
      k: 'Usługa',
      v:
        request.serviceType === 'airport'
          ? 'Lotnisko'
          : request.serviceType === 'local'
            ? 'Lokalny'
            : request.serviceType || 'Standard',
    },
    { k: 'Przystanki', v: stops },
    { k: 'Status', v: status },
    {
      k: 'Start',
      v: trip.startedAt
        ? new Date(String(trip.startedAt)).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    },
    {
      k: 'Koniec',
      v: trip.endedAt
        ? new Date(String(trip.endedAt)).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    },
  ]

  if (request.durationText || request.durationMin != null) {
    rows.push({ k: 'Czas', v: request.durationText || `${request.durationMin} min` })
  }
  rows.push({ k: 'Pasażerowie', v: passengers })
  if (payment) rows.push({ k: 'Płatność', v: payment })
  if (trip.revenueAmount != null && trip.revenueAmount !== '') {
    const n = Number(trip.revenueAmount)
    rows.push({
      k: 'Kwota',
      v: Number.isFinite(n)
        ? `${n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`
        : String(trip.revenueAmount),
    })
  }
  if (request.basePrice) rows.push({ k: 'Cena bazowa', v: `${request.basePrice} zł` })
  if (request.flightNumber) rows.push({ k: 'Lot', v: request.flightNumber })
  if (Number(request.childSeats) > 0 || request.childSeat) {
    rows.push({ k: 'Foteliki', v: String(request.childSeats || 1) })
  }
  if (Number(request.boosterSeats) > 0 || request.boosterSeat) {
    rows.push({ k: 'Podstawki', v: String(request.boosterSeats || 1) })
  }
  if (luggageParts.length) rows.push({ k: 'Bagaż', v: luggageParts.join(' · ') })
  if (request.meetAndGreet) rows.push({ k: 'Meet & greet', v: 'tak' })
  if (request.englishSpeakingDriver) rows.push({ k: 'Kierowca EN', v: 'tak' })
  if (request.contactName || request.companyName) {
    rows.push({ k: 'Klient', v: request.companyName || request.contactName || '—' })
  }
  if (request.contactPhone) rows.push({ k: 'Telefon', v: request.contactPhone })
  if (request.companyTaxId) rows.push({ k: 'NIP', v: request.companyTaxId })

  const receipt = receiptStatusLabel(trip)
  if (receipt) rows.push({ k: 'Paragon', v: receipt })

  if (meta.prepaid || isTripPrepaid(trip)) rows.push({ k: 'Przedpłata', v: 'tak' })

  return rows
}
