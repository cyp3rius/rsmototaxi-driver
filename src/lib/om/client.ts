import type { AuthSession } from './authStore'

export type DriverMe = {
  member: {
    id: string
    displayName: string | null
    userId: string | null
    firstName: string | null
  }
  impersonation: {
    active: true
    teamMemberId: string
    displayName: string | null
    profileId: string | null
    readOnly: true
  } | null
  today: string
  timezone: string
  dashboardState: 'A' | 'A2' | 'B' | 'C' | 'D'
  profile: {
    id: string
    payoutPercent: string | null
    defaultResourceId: string | null
    defaultResourceLabel: string | null
    defaultResourceName: string | null
    defaultResourcePlate: string | null
    defaultResourceIds: Array<{
      id: string
      label: string
      name: string | null
      plate: string | null
      available: boolean
    }>
    availableDefaultResourceIds: Array<{
      id: string
      label: string
      name: string | null
      plate: string | null
      available: boolean
    }>
    externalAppEnabled: boolean
  } | null
  todayAssignment: {
    id: string
    resourceId: string | null
    resourceLabel: string | null
    resourceName: string | null
    resourcePlate: string | null
    assignmentDate: string
    status: string
    plannedShiftStart: string | null
    plannedShiftEnd: string | null
    shiftStart: string | null
    shiftEnd: string | null
    gpsDistanceKm: number | null
  } | null
  nextTrip: Record<string, unknown> | null
  liveTrip: Record<string, unknown> | null
  app: { minSupportedVersion: string | null }
}

export class OmApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
  /** When true, path is absolute from site root (e.g. /api/auth/login). Default: /api/om/... */
  absolute?: boolean
}

class OmClient {
  private session: AuthSession | null = null
  private listeners = new Set<(session: AuthSession | null) => void>()

  subscribe(listener: (session: AuthSession | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener(this.session)
  }

  getSession() {
    return this.session
  }

  async hydrate(): Promise<AuthSession | null> {
    try {
      const data = await this.requestJson<{
        ok: boolean
        authenticated?: boolean
        member?: { email?: string | null; displayName?: string | null } | null
      }>('/api/auth/session', { absolute: true })
      if (!data.ok || !data.authenticated) {
        this.session = null
        this.notify()
        return null
      }
      this.session = {
        authenticated: true,
        email: data.member?.email ?? null,
        displayName: data.member?.displayName ?? null,
      }
      this.notify()
      return this.session
    } catch {
      this.session = null
      this.notify()
      return null
    }
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const data = await this.requestJson<{
      ok: boolean
      member?: { email?: string; displayName?: string | null }
      error?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      absolute: true,
    })
    if (!data.ok) {
      throw new OmApiError(data.error || 'Login failed', 401, data)
    }
    this.session = {
      authenticated: true,
      email: data.member?.email ?? email,
      displayName: data.member?.displayName ?? null,
    }
    this.notify()
    return this.session
  }

  async logout() {
    try {
      await this.requestJson('/api/auth/logout', { method: 'POST', absolute: true })
    } catch {
      // ignore network errors — clear local session anyway
    }
    this.session = null
    this.notify()
  }

  async me(): Promise<DriverMe> {
    return this.requestJson<DriverMe>('taxi_fleet/driver-app/v2/me')
  }

  async getTrips(params?: {
    missingReceipt?: boolean
    startedFrom?: string
    startedTo?: string
    page?: number
    pageSize?: number
    id?: string
  }) {
    const q = new URLSearchParams()
    if (params?.missingReceipt) q.set('missingReceipt', '1')
    if (params?.startedFrom) q.set('startedFrom', params.startedFrom)
    if (params?.startedTo) q.set('startedTo', params.startedTo)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    if (params?.id) q.set('id', params.id)
    const qs = q.toString()
    return this.requestJson<{ items: Record<string, unknown>[]; total: number; page: number; pageSize: number }>(
      `taxi_fleet/driver-app/v2/trips${qs ? `?${qs}` : ''}`,
    )
  }

  async createTrip(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/trips', { method: 'POST', body })
  }

  async updateTrip(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/trips', { method: 'PUT', body })
  }

  async getAssignments() {
    return this.requestJson<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(
      'taxi_fleet/driver-app/v2/assignments',
    )
  }

  async startAssignmentShift(assignmentId: string, body: Record<string, unknown>) {
    return this.requestJson(`taxi_fleet/driver-app/v2/assignments/${assignmentId}/shift`, {
      method: 'POST',
      body,
    })
  }

  async startAdHocAssignment(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/assignments/start', { method: 'POST', body })
  }

  async getExpenses(params?: { page?: number; pageSize?: number }) {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    const qs = q.toString()
    return this.requestJson(`taxi_fleet/driver-app/v2/expenses${qs ? `?${qs}` : ''}`)
  }

  async createExpense(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/expenses', { method: 'POST', body })
  }

  async deleteExpense(id: string) {
    return this.requestJson(`taxi_fleet/driver-app/v2/expenses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async getSettlements() {
    return this.requestJson('taxi_fleet/driver-app/v2/settlements')
  }

  async getSettlement(id: string) {
    return this.requestJson(`taxi_fleet/driver-app/v2/settlements/${id}`)
  }

  async getMonthlySettlements() {
    return this.requestJson('taxi_fleet/driver-app/v2/monthly-settlements')
  }

  async getMonthlySettlement(id: string) {
    return this.requestJson(`taxi_fleet/driver-app/v2/monthly-settlements/${id}`)
  }

  async uploadAttachment(formData: FormData) {
    return this.requestJson('taxi_fleet/driver-app/v2/attachments', { method: 'POST', formData })
  }

  async postLocation(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/location', { method: 'POST', body })
  }

  async searchCustomers(q: string) {
    return this.requestJson(`taxi_fleet/driver-app/v2/customers?search=${encodeURIComponent(q)}`)
  }

  async createCustomer(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/customers', { method: 'POST', body })
  }

  async quote(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/pricing/quote', { method: 'POST', body })
  }

  async routeDistance(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/route/distance', { method: 'POST', body })
  }

  async getProfiles() {
    return this.requestJson('taxi_fleet/driver-app/v2/profiles')
  }

  async placesAutocomplete(input: string, lang = 'pl') {
    const q = new URLSearchParams({ input, lang })
    return this.requestJson<{ suggestions: Array<{ id: string; label: string; lat?: number; lon?: number; isAirport?: boolean }> }>(
      `taxi_fleet/route/places-autocomplete?${q.toString()}`,
    )
  }

  async reverseGeocode(lat: number, lon: number) {
    return this.requestJson<{ label?: string; address?: string }>(
      `taxi_fleet/route/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
    )
  }

  async getPushSubscription() {
    return this.requestJson('taxi_fleet/driver-app/v2/push-subscription')
  }

  async savePushSubscription(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/push-subscription', { method: 'POST', body })
  }

  async deletePushSubscription() {
    return this.requestJson('taxi_fleet/driver-app/v2/push-subscription', { method: 'DELETE' })
  }

  async endImpersonation() {
    return this.requestJson('taxi_fleet/driver-app/v2/impersonation', { method: 'DELETE' })
  }

  async ackCommunication(body: Record<string, unknown>) {
    return this.requestJson('taxi_fleet/driver-app/v2/communications/ack', { method: 'POST', body })
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (!options.formData) headers['Content-Type'] = 'application/json'

    const url = options.absolute ? path : `/api/om/${path.replace(/^\//, '')}`
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      credentials: 'same-origin',
      body: options.formData
        ? options.formData
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: options.signal,
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 401) {
        this.session = null
        this.notify()
      }
      const message =
        data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `HTTP ${res.status}`
      throw new OmApiError(message, res.status, data)
    }
    return data as T
  }
}

export const omClient = new OmClient()
