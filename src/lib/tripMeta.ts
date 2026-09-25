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

export function receiptStatusLabel(trip: Record<string, unknown>) {
  if (trip.platform) return null
  if (trip.receiptAttachmentId) {
    const ocr = String(trip.ocrStatus || '')
    if (ocr === 'pending' || ocr === 'processing') return 'Przetwarzanie'
    if (ocr === 'needs_review' || ocr === 'failed') return 'Do sprawdzenia'
    if (ocr === 'applied' || ocr === 'extracted') return 'Zweryfikowany'
    return 'Paragon'
  }
  const type = String(trip.tripType || '')
  if (type === 'internal' || type === 'platform') return null
  return 'Brak paragonu'
}
