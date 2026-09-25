'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { BottomNav } from '@/components/shell/BottomNav'
import { useAuth } from '@/lib/om/AuthProvider'

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { ready, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !session) router.replace('/login')
  }, [ready, session, router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--text-secondary)]">
        Ładowanie…
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg-base)]">
      {children}
      {!hideNav ? <BottomNav /> : null}
    </div>
  )
}
