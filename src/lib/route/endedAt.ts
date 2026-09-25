const FIVE_MIN_MS = 5 * 60 * 1000
export const DEFAULT_TRIP_DURATION_SECONDS = 60 * 60

function toLocalInputValue(date: Date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function roundToFiveMinutes(date: Date) {
  const ms = date.getTime()
  return new Date(Math.round(ms / FIVE_MIN_MS) * FIVE_MIN_MS)
}

export function endedAtLocalFromDuration(
  startedAtLocal: string,
  durationSeconds: number,
): string | null {
  if (!startedAtLocal) return null
  const started = new Date(startedAtLocal)
  if (Number.isNaN(started.getTime()) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null
  }
  let ended = roundToFiveMinutes(new Date(started.getTime() + durationSeconds * 1000))
  if (ended.getTime() <= started.getTime()) {
    ended = new Date(started.getTime() + FIVE_MIN_MS)
  }
  return toLocalInputValue(ended)
}

export function resolveAutoEndedAtLocal(
  startedAtLocal: string,
  durationSeconds?: number | null,
): string | null {
  const seconds =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : DEFAULT_TRIP_DURATION_SECONDS
  return endedAtLocalFromDuration(startedAtLocal, seconds)
}

export function formatEndedAtCaption(endedAtLocal: string): string {
  const d = new Date(endedAtLocal)
  if (Number.isNaN(d.getTime())) return endedAtLocal
  return d.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
