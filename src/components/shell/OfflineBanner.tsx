'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clearOutbox, listOutbox } from '@/lib/offline/outbox'

export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    void listOutbox().then((items) => setCount(items.length))
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (online && count === 0) return null

  return (
    <div className="tint-warning mx-5 mb-3 rounded-[14px] px-4 py-3 text-[15px]">
      {!online ? (
        <p>Dane z pamięci (offline)</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p>Zmiany do synchronizacji ({count})</p>
          <Button
            size="md"
            className="!w-auto px-4"
            onClick={() => {
              void clearOutbox().then(() => setCount(0))
            }}
          >
            Synchronizuj
          </Button>
        </div>
      )}
    </div>
  )
}
