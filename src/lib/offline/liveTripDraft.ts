import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'rs-driver-v2-live'
const DB_VERSION = 1
const STORE = 'liveTrips'

export type LiveTripPhase = 'active' | 'ended' | 'finishing'

export type LiveTripTrackPoint = {
  lat: number
  lon: number
  recordedAt: string
}

export type LiveTripDraft = {
  id: string
  phase: LiveTripPhase
  from: string
  to: string
  stops: string[]
  startedAt: string
  endedAt: string | null
  /** Route quote distance (from Przelicz). */
  routeDistanceKm: number | null
  durationText: string | null
  durationSeconds: number | null
  /** Orientacyjna kwota z wyceny (string, PL comma). */
  estimatedAmount: string | null
  /** Accumulated GPS distance while live. */
  gpsDistanceKm: number
  track: LiveTripTrackPoint[]
  assignmentId: string | null
  updatedAt: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `live_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export async function listLiveTripDrafts(): Promise<LiveTripDraft[]> {
  if (typeof indexedDB === 'undefined') return []
  const db = await getDb()
  const rows = (await db.getAll(STORE)) as LiveTripDraft[]
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getLiveTripDraft(id: string): Promise<LiveTripDraft | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await getDb()
  const row = (await db.get(STORE, id)) as LiveTripDraft | undefined
  return row ?? null
}

/** Active tracking or awaiting finish form. */
export async function getActiveLiveTripDraft(): Promise<LiveTripDraft | null> {
  const all = await listLiveTripDrafts()
  return (
    all.find((d) => d.phase === 'active' || d.phase === 'ended' || d.phase === 'finishing') ?? null
  )
}

export async function upsertLiveTripDraft(
  draft: Omit<LiveTripDraft, 'updatedAt'> & { updatedAt?: string },
): Promise<LiveTripDraft> {
  const next: LiveTripDraft = {
    ...draft,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  }
  const db = await getDb()
  await db.put(STORE, next)
  return next
}

export async function clearLiveTripDraft(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function clearAllLiveTripDrafts(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE)
}

export async function startLiveTripDraft(input: {
  from: string
  to: string
  stops?: string[]
  startedAt?: string
  routeDistanceKm?: number | null
  durationText?: string | null
  durationSeconds?: number | null
  estimatedAmount?: string | null
  assignmentId?: string | null
}): Promise<LiveTripDraft> {
  const existing = await getActiveLiveTripDraft()
  if (existing) return existing
  const now = new Date().toISOString()
  return upsertLiveTripDraft({
    id: uuid(),
    phase: 'active',
    from: input.from.trim(),
    to: input.to.trim(),
    stops: (input.stops ?? []).map((s) => s.trim()).filter(Boolean),
    startedAt: input.startedAt ?? now,
    endedAt: null,
    routeDistanceKm: input.routeDistanceKm ?? null,
    durationText: input.durationText ?? null,
    durationSeconds: input.durationSeconds ?? null,
    estimatedAmount: input.estimatedAmount ?? null,
    gpsDistanceKm: 0,
    track: [],
    assignmentId: input.assignmentId ?? null,
  })
}

/** Shape compatible with me.liveTrip / trip meta helpers. */
export function liveDraftToTripShape(draft: LiveTripDraft): Record<string, unknown> {
  return {
    id: draft.id,
    status: 'in_progress',
    startedAt: draft.startedAt,
    endedAt: draft.endedAt,
    distanceKm: draft.gpsDistanceKm > 0 ? draft.gpsDistanceKm : draft.routeDistanceKm,
    localOnly: true,
    metadata: {
      tripRequest: {
        from: draft.from,
        to: draft.to,
        fromAddress: draft.from,
        toAddress: draft.to,
        stops: draft.stops,
        durationText: draft.durationText || undefined,
        distanceKm: draft.routeDistanceKm ?? undefined,
        estimatedAmount: draft.estimatedAmount || undefined,
        basePrice: draft.estimatedAmount || undefined,
      },
    },
  }
}

export function isLocalLiveTrip(trip: Record<string, unknown> | null | undefined): boolean {
  return Boolean(trip && trip.localOnly === true)
}
