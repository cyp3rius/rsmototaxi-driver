'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

function isStandalone() {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [deferred, setDeferred] = useState<(Event & { prompt: () => Promise<void> }) | null>(null)
  const [ios] = useState(
    () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  )
  const [dark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const onAuthGate = pathname === '/' || pathname === '/login'

  useEffect(() => {
    if (!onAuthGate) return
    if (isStandalone()) return
    if (sessionStorage.getItem('rs-install-dismissed')) return
    queueMicrotask(() => setShow(true))
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [onAuthGate])

  if (!show || !onAuthGate) return null

  function dismiss() {
    sessionStorage.setItem('rs-install-dismissed', '1')
    setShow(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-base)] px-6"
      style={{ paddingTop: 'calc(var(--safe-top) + 16px)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <Image
        src={dark ? '/brand/logo-light.svg' : '/brand/logo-ink.svg'}
        alt="RS Moto Taxi"
        width={42}
        height={56}
        className="h-14 w-auto self-start"
      />
      <h1
        className="mt-7 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9"
        style={{ fontStretch: '115%' }}
      >
        Dodaj aplikację do ekranu początkowego
      </h1>
      <p className="mt-2.5 text-[17px] leading-6 text-[var(--text-secondary)]">
        Powiadomienia o kursach, pełny ekran i praca offline działają dopiero po dodaniu aplikacji.
      </p>

      {ios ? (
        <div className="mt-7 space-y-[18px]">
          <Step n={1}>
            Stuknij{' '}
            <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] tint-accent px-3 font-semibold text-[var(--accent)]">
              Udostępnij
            </span>
          </Step>
          <Step n={2}>
            Wybierz <b className="font-semibold">„Do ekranu początkowego”</b>
          </Step>
          <Step n={3}>Otwórz RS Driver z ekranu telefonu</Step>
        </div>
      ) : (
        <div className="mt-7 flex items-center gap-3.5 rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-[18px]">
          <span className="flex size-14 flex-none items-center justify-center rounded-[14px] bg-[#020407]">
            <Image src="/brand/logo-light.svg" alt="" width={28} height={38} className="h-[38px] w-auto" />
          </span>
          <span>
            <span className="block text-[17px] font-semibold">RS Driver</span>
            <span className="block text-[15px] text-[var(--text-secondary)]">driver.rsmototaxi.pl</span>
          </span>
        </div>
      )}

      <div className="flex-1" />

      {!ios && deferred ? (
        <Button
          className="mb-2"
          onClick={async () => {
            await deferred.prompt()
            dismiss()
          }}
        >
          Zainstaluj aplikację
        </Button>
      ) : null}

      <button
        type="button"
        className="flex h-14 items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
        onClick={dismiss}
      >
        Kontynuuj w przeglądarce
      </button>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-9 flex-none items-center justify-center rounded-full bg-[var(--bg-surface-raised)] font-semibold tabular-nums">
        {n}
      </span>
      <span className="text-[17px] leading-6">{children}</span>
    </div>
  )
}
