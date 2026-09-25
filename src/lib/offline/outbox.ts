import { openDB } from 'idb'
import { omClient } from '@/lib/om/client'

export type OutboxItem = {
  id: string
  kind: string
  payload: Record<string, unknown>
  createdAt: number
  status: 'pending' | 'error'
  errorMessage?: string
}

const DB = 'rs-driver-v2-offline'
const STORE = 'outbox'

async function getDb() {
  return openDB(DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    },
  })
}

export async function enqueueOutbox(kind: string, payload: Record<string, unknown>) {
  const db = await getDb()
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    kind,
    payload,
    createdAt: Date.now(),
    status: 'pending',
  }
  await db.put(STORE, item)
  return item
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const db = await getDb()
  return (await db.getAll(STORE)) as OutboxItem[]
}

export async function pendingOutboxCount(): Promise<number> {
  const items = await listOutbox()
  return items.filter((item) => item.status === 'pending' || item.status === 'error').length
}

export async function removeOutbox(id: string) {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function clearOutbox() {
  const db = await getDb()
  await db.clear(STORE)
}

export async function flushOutbox(): Promise<{ ok: number; failed: number }> {
  const items = await listOutbox()
  let ok = 0
  let failed = 0
  const db = await getDb()

  for (const item of items) {
    try {
      if (item.kind === 'createTrip') {
        await omClient.createTrip(item.payload)
      } else if (item.kind === 'updateTrip') {
        await omClient.updateTrip(item.payload)
      } else if (item.kind === 'createExpense') {
        await omClient.createExpense(item.payload)
      } else if (item.kind === 'deleteExpense') {
        await omClient.deleteExpense(String(item.payload.id))
      } else if (item.kind === 'location') {
        await omClient.postLocation(item.payload)
      } else {
        throw new Error(`Unknown outbox kind: ${item.kind}`)
      }
      await db.delete(STORE, item.id)
      ok += 1
    } catch (err) {
      failed += 1
      await db.put(STORE, {
        ...item,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Sync failed',
      })
    }
  }

  return { ok, failed }
}
