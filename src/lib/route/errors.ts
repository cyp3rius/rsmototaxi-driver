const ROUTE_ERROR_MAP: Record<string, string> = {
  'Route not found': 'Nie znaleziono trasy',
  'Could not calculate route.': 'Nie udało się wyliczyć trasy.',
  'OPENROUTESERVICE_API_KEY not configured': 'Usługa map jest niedostępna.',
  'Geocoding service error': 'Błąd geokodowania.',
}

export function translateRouteError(message: string | null | undefined): string {
  const raw = (message || '').trim()
  if (!raw) return 'Przeliczanie nie powiodło się'
  if (ROUTE_ERROR_MAP[raw]) return ROUTE_ERROR_MAP[raw]
  const lower = raw.toLowerCase()
  if (lower.includes('route not found')) return 'Nie znaleziono trasy'
  return raw
}
