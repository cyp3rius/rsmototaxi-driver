'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Share, ChevronLeft, ChevronRight, BookMarked, LayoutGrid } from 'lucide-react'
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
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
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

  const host =
    typeof window !== 'undefined'
      ? `${window.location.host}${window.location.pathname === '/' ? '' : window.location.pathname}`
      : 'taxi-driver.vercel.app'

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-base)]"
      style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}
    >
      <div className="flex flex-1 flex-col px-6">
        <Image
          src={dark ? '/brand/logo-light.svg' : '/brand/logo-ink.svg'}
          alt="RS Moto Taxi"
          width={42}
          height={56}
          className="h-14 w-auto self-start"
          priority
        />
        <h1
          className="mt-7 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9 text-[var(--text-primary)]"
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
              <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 font-semibold text-[var(--accent)] tint-accent">
                <Share size={18} strokeWidth={2} />
                Udostępnij
              </span>
            </Step>
            <Step n={2}>
              Wybierz <b className="font-semibold">„Do ekranu początkowego”</b>
            </Step>
            <Step n={3}>Otwórz RS Moto Taxi - Kierowca z ekranu telefonu</Step>
          </div>
        ) : (
          <div className="mt-7 flex items-center gap-3.5 rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-[18px]">
            <span className="flex size-14 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-[#020407]">
              <Image
                src="/pwa/apple-touch-icon.png"
                alt=""
                width={56}
                height={56}
                className="size-14"
              />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">RS Moto Taxi - Kierowca</span>
              <span className="block text-[15px] text-[var(--text-secondary)]">{host}</span>
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
          className="flex h-[52px] items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
          onClick={dismiss}
        >
          Kontynuuj w przeglądarce
        </button>
      </div>

      {ios ? (
        <div
          className="border-t border-[var(--separator)] bg-[var(--bg-surface)] px-4 pt-2.5"
          style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)' }}
        >
          <div className="flex h-11 items-center justify-center rounded-xl bg-[var(--bg-surface-raised)] text-[15px] text-[var(--text-secondary)]">
            {host}
          </div>
          <div className="mt-2.5 flex h-9 items-center justify-around text-[var(--text-tertiary)]">
            <ChevronLeft size={22} strokeWidth={2} />
            <ChevronRight size={22} strokeWidth={2} />
            <span className="flex size-12 items-center justify-center rounded-full text-[var(--accent)] tint-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <Share size={22} strokeWidth={2} />
            </span>
            <BookMarked size={22} strokeWidth={2} />
            <LayoutGrid size={22} strokeWidth={2} />
          </div>
        </div>
      ) : (
        <div style={{ height: 'var(--safe-bottom)' }} />
      )}
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
