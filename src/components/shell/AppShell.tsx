'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { BottomNav } from '@/components/shell/BottomNav'
import { SystemBanners } from '@/components/shell/SystemBanners'
import { StartShiftProvider } from '@/components/ui/StartShiftProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import { Button } from '@/components/ui/Button'

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { ready, session, me } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !session) router.replace('/login')
  }, [ready, session, router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#020407]">
        <span className="sr-only">Ładowanie</span>
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
    <StartShiftProvider>
      <div
        className={`mx-auto min-h-dvh max-w-lg bg-[var(--bg-base)] ${readOnly ? 'pointer-events-none select-none' : ''}`}
      >
        {readOnly ? (
          <div className="pointer-events-auto sticky top-0 z-50 tint-accent px-4 py-2.5 text-center text-[15px] font-semibold text-[var(--accent)]">
            Podgląd operatora — tylko do odczytu
          </div>
        ) : null}
        <SystemBanners />
        <div className={readOnly ? 'pointer-events-none opacity-90' : undefined}>{children}</div>
        {!hideNav ? <BottomNav /> : null}
      </div>
    </StartShiftProvider>
  )
}
