'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { BottomNav } from '@/components/shell/BottomNav'
import {
  SystemBannerProvider,
} from '@/components/shell/SystemBanners'
import { useAuth } from '@/lib/om/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { requestViewportSettle } from '@/lib/visualViewport'

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { ready, session, me } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !session) router.replace('/')
  }, [ready, session, router])

  useEffect(() => {
    if (hideNav || !ready || !session) return
    requestViewportSettle()
    const timers = [80, 200, 500, 1000].map((ms) => window.setTimeout(requestViewportSettle, ms))
    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
  }, [hideNav, ready, session])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#020407]">
        <Spinner />
      </div>
    )
  }

  if (!session) return null

  const minVersion = me?.app?.minSupportedVersion
  const current = process.env.NEXT_PUBLIC_APP_VERSION || ''
  const forceUpdate = Boolean(minVersion && current && minVersion > current)
  const readOnly = Boolean(me?.impersonation?.active)

  if (forceUpdate) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="display-l">Wymagana aktualizacja</h1>
        <p className="text-[17px] text-[var(--text-secondary)]">
          Ta wersja aplikacji jest zbyt stara. Odśwież stronę, żeby pobrać nową.
        </p>
        <Button onClick={() => window.location.reload()}>Zaktualizuj teraz</Button>
      </div>
    )
  }

  return (
    <SystemBannerProvider>
      <div
        className={`mx-auto min-h-dvh max-w-lg bg-[var(--bg-base)] ${readOnly ? 'pointer-events-none select-none' : ''}`}
      >
        <div className={readOnly ? 'pointer-events-none opacity-90' : undefined}>{children}</div>
        {!hideNav ? <BottomNav /> : null}
      </div>
    </SystemBannerProvider>
  )
}
