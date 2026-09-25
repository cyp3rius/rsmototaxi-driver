export type TripRequestMeta = {
  from?: string
  to?: string
  fromNote?: string
  toNote?: string
  stops?: string[]
  flightNumber?: string
  flightOrigin?: string
  estimatedArrival?: string
  childSeat?: boolean
  boosterSeat?: boolean
  englishSpeakingDriver?: boolean
  meetAndGreet?: boolean
  luggageCount?: number
}

export type TripMeta = {
  tripRequest?: TripRequestMeta
  distanceKm?: number
  durationMin?: number
  prepaid?: boolean
  paymentMethod?: string
}

export function readTripMeta(trip: Record<string, unknown> | null | undefined): TripMeta {
  if (!trip || typeof trip.metadata !== 'object' || !trip.metadata) return {}
  return trip.metadata as TripMeta
}

export function tripRouteLabel(trip: Record<string, unknown> | null | undefined) {
  const meta = readTripMeta(trip)
  const from = meta.tripRequest?.from
  const to = meta.tripRequest?.to
  if (from && to) return `${from} → ${to}`
  if (from) return from
  if (to) return to
  return 'Kurs'
}

export const TRIP_TYPE_OPTIONS = [
  { id: 'client', label: 'Klient', icon: 'user' },
  { id: 'street_hail', label: 'Z ulicy', icon: 'map-pin' },
  { id: 'internal', label: 'Wewnętrzny', icon: 'building' },
  { id: 'private', label: 'Prywatny', icon: 'lock' },
  { id: 'other', label: 'Inny', icon: 'ellipsis' },
] as const

export const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Gotówka', icon: 'banknote' },
  { id: 'card', label: 'Karta', icon: 'credit-card' },
  { id: 'electronic', label: 'Przelew', icon: 'smartphone' },
  { id: 'transfer', label: 'BLIK', icon: 'nfc' },
  { id: 'loyalty_program', label: 'Lojalność', icon: 'star' },
] as const

export const COST_TYPE_OPTIONS = [
  { id: 'fuel', label: 'Paliwo', icon: 'fuel' },
  { id: 'toll', label: 'Opłata', icon: 'road' },
  { id: 'parking', label: 'Parking', icon: 'parking' },
  { id: 'maintenance', label: 'Serwis', icon: 'wrench' },
  { id: 'other', label: 'Inny', icon: 'ellipsis' },
] as const

export function tripTypeLabel(type: unknown) {
  const found = TRIP_TYPE_OPTIONS.find((t) => t.id === type)
  return found?.label || String(type || 'Kurs')
}

export function costTypeLabel(type: unknown) {
  const found = COST_TYPE_OPTIONS.find((t) => t.id === type)
  return found?.label || String(type || 'Koszt')
}

/** Platform / sync trips are CRM-only — never count in driver-app stats or receipts. */
export function isPlatformTrip(trip: Record<string, unknown> | null | undefined) {
  if (!trip) return false
  if (trip.platform) return true
  const type = String(trip.tripType || '')
  return type === 'platform' || type === 'event'
}

export function isAppScopedTrip(trip: Record<string, unknown> | null | undefined) {
  return Boolean(trip) && !isPlatformTrip(trip)
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

/** Polish: 1 kurs / 2–4 kursy / 5+ kursów */
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
