const API_ERROR_MAP: Record<string, string> = {
  'Validation failed': 'Walidacja nie powiodła się',
  'Internal error': 'Wewnętrzny błąd serwera',
  'Not found': 'Nie znaleziono',
  'Unauthorized': 'Brak autoryzacji',
  'Forbidden': 'Brak dostępu',
  'Missing trip id': 'Brak identyfikatora kursu',
  'Receipt photo is required for this trip.': 'Zdjęcie paragonu jest wymagane dla tego kursu.',
  'Receipt photo is required.': 'Zdjęcie paragonu jest wymagane.',
  'This trip already has a receipt.': 'Ten kurs ma już paragon.',
  'Receipt was verified and can no longer be changed.':
    'Paragon został zweryfikowany i nie można go już zmienić.',
  'Only duplicate or flagged costs can be deleted.':
    'Można usunąć tylko koszty zduplikowane lub z błędem rozpoznania. Zweryfikowanego paragonu nie da się zmienić.',
  'Only image or PDF receipts are allowed.': 'Dozwolone są tylko zdjęcia lub PDF.',
  'Start a live trip only while your shift is open.':
    'Kurs bieżący możesz dodać tylko podczas otwartej zmiany.',
  'Trip times must fall within a past or current shift.':
    'Czasy kursu muszą mieścić się w przeszłej lub bieżącej zmianie.',
  'Trip start time is required.': 'Podaj czas rozpoczęcia kursu.',
  'Trip end time must be after the start time.':
    'Czas zakończenia musi być późniejszy niż czas rozpoczęcia.',
  'No vehicle is assigned for this trip. Ask dispatch for a vehicle or set a default vehicle on your profile.':
    'Brak pojazdu dla tego kursu. Poproś dyspozytornię o pojazd albo ustaw pojazd domyślny w profilu.',
  'Could not upload receipt photo.': 'Nie udało się wysłać zdjęcia paragonu.',
}

export function translateApiError(message: string | null | undefined): string {
  const raw = (message || '').trim()
  if (!raw) return 'Wystąpił błąd'
  if (API_ERROR_MAP[raw]) return API_ERROR_MAP[raw]
  const lower = raw.toLowerCase()
  if (lower === 'validation failed') return API_ERROR_MAP['Validation failed']
  if (lower.includes('receipt photo is required')) {
    return 'Zdjęcie paragonu jest wymagane dla tego kursu.'
  }
  if (lower.includes('trip times must fall') || lower.includes('outside shift')) {
    return API_ERROR_MAP['Trip times must fall within a past or current shift.']
  }
  if (lower.includes('live') && lower.includes('shift')) {
    return API_ERROR_MAP['Start a live trip only while your shift is open.']
  }
  return raw
}
