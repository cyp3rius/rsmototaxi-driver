import { openDB } from 'idb'

export type OutboxItem = {
  id: string
  kind: string
  payload: Record<string, unknown>
  createdAt: number
  status: 'pending' | 'error'
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

export async function clearOutbox() {
  const db = await getDb()
  await db.clear(STORE)
}
