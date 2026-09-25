/** Tab + stack route helpers for DriverChrome (transitions 1a / 1c). */

export const TAB_ITEMS = [
  { href: '/app', id: 'start', label: 'Start' },
  { href: '/app/trips', id: 'trips', label: 'Kursy' },
  { href: '/app/expenses', id: 'expenses', label: 'Koszty' },
  { href: '/app/payouts', id: 'payouts', label: 'Wypłaty' },
  { href: '/app/shifts', id: 'shifts', label: 'Zmiany' },
] as const

export type TabIndex = 0 | 1 | 2 | 3 | 4

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** Create / live flows — stack 1c over the parent tab (same as detail). */
export function isFullscreenPath(pathname: string): boolean {
  if (pathname === '/app/trips/new' || pathname.startsWith('/app/trips/new/')) return true
  if (pathname === '/app/trips/live' || pathname.startsWith('/app/trips/live/')) return true
  if (pathname === '/app/expenses/new' || pathname.startsWith('/app/expenses/new/')) return true
  return false
}

/** List → detail stack (1c). */
export function isDetailPath(pathname: string): boolean {
  if (new RegExp(`^/app/trips/${UUID}$`, 'i').test(pathname)) return true
  if (new RegExp(`^/app/payouts/monthly/${UUID}$`, 'i').test(pathname)) return true
  if (new RegExp(`^/app/payouts/weekly/${UUID}$`, 'i').test(pathname)) return true
  if (/^\/app\/trips\/[^/]+$/.test(pathname) && pathname !== '/app/trips/new' && pathname !== '/app/trips/live') {
    return true
  }
  if (/^\/app\/payouts\/monthly\/[^/]+$/.test(pathname)) return true
  if (/^\/app\/payouts\/weekly\/[^/]+$/.test(pathname)) return true
  return false
}

/** Any route that slides in over the tab list (detail or create/live form). */
export function isStackPath(pathname: string): boolean {
  return isDetailPath(pathname) || isFullscreenPath(pathname)
}

export function tabIndexFromPath(pathname: string): TabIndex {
  if (pathname.startsWith('/app/trips')) return 1
  if (pathname.startsWith('/app/expenses')) return 2
  if (pathname.startsWith('/app/payouts')) return 3
  if (pathname.startsWith('/app/shifts')) return 4
  return 0
}

export function isTabRootPath(pathname: string): boolean {
  if (pathname === '/app' || pathname === '/app/') return true
  if (pathname === '/app/trips') return true
  if (pathname === '/app/expenses') return true
  if (pathname === '/app/payouts') return true
  if (pathname === '/app/shifts') return true
  return false
}
