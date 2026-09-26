export function formatTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMoney(value: unknown, currency = 'zł') {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export function formatMoneyShort(value: unknown) {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`
}

export function formatElapsed(ms: number) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Always H:MM:SS — live trip / shift timers in design. */
export function formatElapsedHms(ms: number) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local calendar day key YYYY-MM-DD from ISO / date string / Date. */
export function toLocalDateKey(raw: unknown) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const day = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const s = String(raw || '')
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    // Prefer local parts when timezone present; for plain date keep as-is.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) && s.length === 10) return s.slice(0, 10)
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return s.slice(0, 10)
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysToDateKey(dateKey: string, delta: number) {
  const d = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + delta)
  return toLocalDateKey(d)
}

export function formatWeekdayLongDate(dateKey: string) {
  if (!dateKey) return '—'
  const d = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateKey
  const label = d.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Section header: Dziś / Jutro / Wczoraj, otherwise full weekday date. */
export function relativeDaySectionTitle(dateKey: string, todayKey = todayIsoDate()) {
  if (!dateKey) return 'Bez daty'
  if (dateKey === todayKey) return 'Dziś'
  if (dateKey === addDaysToDateKey(todayKey, 1)) return 'Jutro'
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Wczoraj'
  return formatWeekdayLongDate(dateKey)
}

export function startOfDayIso(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function endOfDayIso(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}
