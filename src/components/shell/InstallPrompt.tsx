'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

function isStandalone() {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferred, setDeferred] = useState<Event | null>(null)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const ua = navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua)
    setIos(isIos)
    setShow(true)
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (!show) return null

  return (
    <div className="mx-5 mb-3 rounded-[18px] bg-[var(--bg-surface)] p-4">
      <p className="font-semibold">Zainstaluj na ekranie początkowym</p>
      {ios ? (
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Safari → Udostępnij → Do ekranu początkowego
        </p>
      ) : deferred ? (
        <div className="mt-3">
          <Button
            size="md"
            onClick={async () => {
              const ev = deferred as Event & { prompt: () => Promise<void> }
              await ev.prompt()
              setShow(false)
            }}
          >
            Zainstaluj
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Użyj menu przeglądarki, aby dodać aplikację do ekranu głównego.
        </p>
      )}
      <button type="button" className="mt-3 text-[15px] text-[var(--text-secondary)]" onClick={() => setShow(false)}>
        Później
      </button>
    </div>
  )
}
