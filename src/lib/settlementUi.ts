import { formatMoney } from '@/lib/format'

const MONTHS_NOM = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
] as const

const MONTHS_GEN = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const

export type SettlementStatusTone = 'neutral' | 'accent' | 'ink' | 'success'

export function settlementStatusLabel(status: unknown): string {
  switch (String(status || '').toLowerCase()) {
    case 'draft':
      return 'Szkic'
    case 'submitted':
      return 'Wysłane'
    case 'approved':
      return 'Zatwierdzone'
    case 'paid':
      return 'Wypłacone'
    default:
      return String(status || '—')
  }
}

export function settlementStatusTone(status: unknown): SettlementStatusTone {
  switch (String(status || '').toLowerCase()) {
    case 'draft':
      return 'neutral'
    case 'submitted':
      return 'accent'
    case 'approved':
      return 'ink'
    case 'paid':
      return 'success'
    default:
      return 'neutral'
  }
}

function parseDay(raw: unknown): Date | null {
  const s = String(raw || '')
  const key = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''
  if (!key) return null
  const d = new Date(`${key}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatMonthTitle(monthStart: unknown): string {
  const d = parseDay(monthStart)
  if (!d) return '—'
  return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "22–28 września" or "29 września–5 października" */
export function formatWeekTitle(weekStart: unknown, opts?: { withYear?: boolean }): string {
  const start = parseDay(weekStart)
  if (!start) return '—'
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sd = start.getDate()
  const ed = end.getDate()
  const year = opts?.withYear ? ` ${end.getFullYear()}` : ''
  if (start.getMonth() === end.getMonth()) {
    return `${sd}–${ed} ${MONTHS_GEN[start.getMonth()]}${year}`
  }
  return `${sd} ${MONTHS_GEN[start.getMonth()]}–${ed} ${MONTHS_GEN[end.getMonth()]}${year}`
}

export function formatLongDatePl(iso: unknown): string {
  const d = parseDay(iso) || (iso ? new Date(String(iso)) : null)
  if (!d || Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export function formatSignedMoney(value: unknown, opts?: { sign?: 'auto' | 'minus' | 'plus' | 'none' }) {
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (value == null || value === '' || Number.isNaN(n)) return formatMoney(value)
  const sign = opts?.sign ?? 'auto'
  const abs = formatMoney(Math.abs(n))
  if (sign === 'minus' || (sign === 'auto' && n < 0)) return `−${abs}`
  if (sign === 'plus' && n > 0) return `+${formatMoney(n)}`
  return formatMoney(n)
}

export function formatPlusMoney(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (Number.isNaN(n) || value == null || value === '') return formatMoney(value)
  if (n > 0) return `+${formatMoney(n)}`
  return formatMoney(n)
}

export type BreakdownRow = {
  key: string
  label: string
  value: string
  strong?: boolean
}

export function weeklyBreakdownRows(data: Record<string, unknown>): BreakdownRow[] {
  const revenue = data.revenueNet ?? data.grossRevenue ?? data.totalRevenue
  const costs = data.costsNet ?? data.totalExpenses ?? data.expensesAmount
  const net = data.netAmount ?? data.netRevenue
  const percent = data.payoutPercent
  const bonus = data.bonusAmount ?? data.bonus
  const compensation = data.compensationAmount ?? data.compensation
  const payout = data.payoutAmount ?? data.totalPayout ?? data.netPayout

  const netN = Number(String(net ?? '').replace(',', '.'))
  const pctN = Number(String(percent ?? '').replace(',', '.'))
  const share =
    data.driverShare ??
    data.shareAmount ??
    (Number.isFinite(netN) && Number.isFinite(pctN) ? (netN * pctN) / 100 : null)

  const rows: BreakdownRow[] = [
    { key: 'revenue', label: 'Przychód', value: formatMoney(revenue) },
    { key: 'costs', label: 'Koszty', value: formatSignedMoney(costs, { sign: 'minus' }) },
    { key: 'net', label: 'Netto', value: formatMoney(net), strong: true },
  ]
  if (percent != null && percent !== '') {
    const pctStr = String(percent).includes('%') ? String(percent) : `${String(percent).replace(/\.0+$/, '')}%`
    rows.push({ key: 'percent', label: 'Procent wypłaty', value: pctStr })
  }
  if (share != null && share !== '') {
    rows.push({ key: 'share', label: 'Udział kierowcy', value: formatMoney(share) })
  }
  if (bonus != null && bonus !== '') {
    rows.push({ key: 'bonus', label: 'Bonus', value: formatPlusMoney(bonus) })
  }
  if (compensation != null && compensation !== '') {
    rows.push({ key: 'comp', label: 'Rekompensata', value: formatMoney(compensation) })
  }
  rows.push({ key: 'payout', label: 'Wypłata końcowa', value: formatMoney(payout), strong: true })
  return rows
}

export function monthlyBreakdownRows(data: Record<string, unknown>): BreakdownRow[] {
  const revenue = data.revenueNet ?? data.grossRevenue ?? data.totalRevenue
  const costs = data.costsNet ?? data.totalExpenses ?? data.expensesAmount
  const net = data.netAmount ?? data.netRevenue
  const payout = data.payoutAmount ?? data.totalPayout ?? data.netPayout

  return [
    { key: 'revenue', label: 'Przychód', value: formatMoney(revenue) },
    { key: 'costs', label: 'Koszty', value: formatSignedMoney(costs, { sign: 'minus' }) },
    { key: 'net', label: 'Netto', value: formatMoney(net), strong: true },
    { key: 'payout', label: 'Wypłata końcowa', value: formatMoney(payout), strong: true },
  ]
}

export function monthlyListLabel(status: unknown): string {
  return String(status || '').toLowerCase() === 'draft' || String(status || '').toLowerCase() === 'submitted'
    ? 'Wypłata, stan na dziś'
    : 'Wypłata'
}

export function weeklyDetailNote(weekStart: unknown): string {
  const d = parseDay(weekStart)
  if (!d) return 'Kontrolnie, wchodzi do wypłaty miesięcznej.'
  // Week contributes to the month of the week start (typical payroll rule).
  const month = MONTHS_GEN[d.getMonth()]
  return `Kontrolnie, wchodzi do wypłaty za ${month}.`
}

export function monthlyDetailNote(data: Record<string, unknown>): string {
  const status = String(data.status || '').toLowerCase()
  const paidAt = data.closedAt ?? data.paidAt ?? data.approvedAt
  const when = formatLongDatePl(paidAt)
  if (status === 'paid' && when) return `Wypłacono ${when}.`
  if (status === 'approved' && when) return `Zatwierdzono ${when}.`
  if (status === 'draft' || status === 'submitted') return 'Stan na dziś. Wypłatę finalizuje flota.'
  return 'Tylko podgląd. Rozliczenia akceptuje flota.'
}
