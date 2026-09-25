'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { flushOutbox, listOutbox } from '@/lib/offline/outbox'

export function OfflineBanner() {
  const [online, setOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  )
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  async function refreshCount() {
    const items = await listOutbox()
    setCount(items.length)
  }

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) {
        void flushOutbox().then(() => refreshCount())
      } else {
        setCachedAt(
          new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        )
      }
    }
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    queueMicrotask(() => void refreshCount())
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (online && count === 0) return null

  return (
    <div className="tint-warning mx-5 mb-3 rounded-[14px] px-4 py-3 text-[15px]">
      {!online ? (
        <div>
          <p className="font-semibold">Tryb offline. Dane z {cachedAt || 'pamięci'}.</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Zmiany zapiszą się i zsynchronizują po połączeniu.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p>
            {count} {count === 1 ? 'zmiana czeka' : 'zmiany czekają'} na synchronizację
          </p>
          <Button
            size="md"
            className="!w-auto px-4"
            loading={busy}
            onClick={() => {
              setBusy(true)
              void flushOutbox()
                .then(() => refreshCount())
                .finally(() => setBusy(false))
            }}
          >
            Synchronizuj
          </Button>
        </div>
      )}
    </div>
  )
}
