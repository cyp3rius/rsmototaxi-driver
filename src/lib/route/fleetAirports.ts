import rawConfig from './fleetAirports.json'

export type AirportSuggestion = {
  id: string
  label: string
  lon: number
  lat: number
  isAirport: true
}

type AirportDefinition = {
  id: string
  iata: string
  coordinates: [number, number]
  labels: { pl: string; en: string }
  keywords: string[]
}

const airports = (rawConfig as { airports: AirportDefinition[] }).airports

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getAirportSuggestions(locale: 'pl' | 'en' = 'pl'): AirportSuggestion[] {
  return airports.map((airport) => ({
    id: airport.id,
    label: airport.labels[locale],
    lon: airport.coordinates[0],
    lat: airport.coordinates[1],
    isAirport: true as const,
  }))
}

/** Airports matching empty focus (all) or a typed query (keywords / label). */
export function filterAirportSuggestions(
  query: string,
  locale: 'pl' | 'en' = 'pl',
): AirportSuggestion[] {
  const all = getAirportSuggestions(locale)
  const trimmed = query.trim()
  if (!trimmed) return all

  const normalized = normalizeText(trimmed)
  return all.filter((airport) => {
    if (normalizeText(airport.label).includes(normalized)) return true
    const def = airports.find((a) => a.id === airport.id)
    return def?.keywords.some((keyword) => normalizeText(keyword).includes(normalized) || normalized.includes(normalizeText(keyword)))
  })
}
