import type { DriverMe } from '@/lib/om/client'

export type TripCreateMode = 'live' | 'schedule' | 'past'

function toLocalInputValue(date: Date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function nowLocalInput() {
  return toLocalInputValue(new Date())
}

export function todayStartLocalInput() {
  const d = new Date()
  d.setHours(8, 0, 0, 0)
  return toLocalInputValue(d)
}

export function yesterdayStartLocalInput() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(8, 0, 0, 0)
  return toLocalInputValue(d)
}

export function shiftWindowBounds(me: DriverMe | null): { min?: string; max?: string } {
  const a = me?.todayAssignment
  if (!a) return {}
  const start = a.shiftStart || a.plannedShiftStart
  const end = a.shiftEnd || a.plannedShiftEnd
  return {
    min: start ? toLocalInputValue(new Date(start)) : undefined,
    max: end ? toLocalInputValue(new Date(end)) : undefined,
  }
}

export function validateTripTimes(params: {
  mode: TripCreateMode
  onShift: boolean
  startedAt: string
  endedAt: string
  me: DriverMe | null
}): string | null {
  const { mode, onShift, startedAt, endedAt, me } = params

  if (mode === 'live') {
    if (!onShift) return 'Kurs live można rozpocząć tylko na otwartej zmianie.'
    return null
  }

  if (!startedAt) return 'Podaj godzinę startu.'

  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) return 'Nieprawidłowa data startu.'

  if (mode === 'schedule') {
    if (start.getTime() <= Date.now() - 60_000) {
      return 'Kurs planowany musi zaczynać się w przyszłości.'
    }
    if (endedAt) {
      const end = new Date(endedAt)
      if (!Number.isNaN(end.getTime()) && end.getTime() <= start.getTime()) {
        return 'Koniec kursu musi być po starcie.'
      }
    }
    return null
  }

  // past
  if (!endedAt) return 'Kurs przeszły wymaga godziny końca.'
  const end = new Date(endedAt)
  if (Number.isNaN(end.getTime())) return 'Nieprawidłowa data końca.'
  if (end.getTime() <= start.getTime()) return 'Koniec kursu musi być po starcie.'
  if (start.getTime() > Date.now()) return 'Kurs przeszły nie może zaczynać się w przyszłości.'

  const assignment = me?.todayAssignment
  const windowStart = assignment?.shiftStart || assignment?.plannedShiftStart
  const windowEnd = assignment?.shiftEnd || assignment?.plannedShiftEnd
  if (windowStart && windowEnd) {
    const ws = new Date(windowStart).getTime()
    const we = new Date(windowEnd).getTime()
    // allow small grace: trip must overlap the shift window
    if (end.getTime() < ws || start.getTime() > we) {
      return 'Czas kursu musi mieścić się w jednej z Twoich zmian.'
    }
  }

  return null
}
