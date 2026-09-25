'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/om/AuthProvider'

/** Concept A: route line Zabierzów → Balice, then greeting → dashboard */
export function WowLoadingScreen() {
  const router = useRouter()
  const { me, refreshMe, session, ready } = useAuth()
  const [phase, setPhase] = useState<'line' | 'hello' | 'done'>('line')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!session) {
      router.replace('/login')
      return
    }
    let cancelled = false
    const started = Date.now()

    void (async () => {
      try {
        const payload = me ?? (await refreshMe())
        if (cancelled) return
        if (!payload) throw new Error('Nie udało się wczytać profilu')
        const elapsed = Date.now() - started
        const waitLine = Math.max(0, 1500 - elapsed)
        window.setTimeout(() => {
          if (cancelled) return
          setPhase('hello')
          window.setTimeout(() => {
            if (cancelled) return
            setPhase('done')
            router.replace('/app')
          }, 3000)
        }, waitLine)
      } catch {
        if (cancelled) return
        setError('Ładowanie trwa zbyt długo lub brak sieci. Spróbuj ponownie.')
      }
    })()

    const timeout = window.setTimeout(() => {
      if (!cancelled) setError('Ładowanie trwa zbyt długo. Spróbuj ponownie.')
    }, 15000)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [ready, session, me, refreshMe, router])

  const name = me?.member.firstName || me?.member.displayName || 'kierowco'

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-base)] px-6 text-center"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      {error ? (
        <div className="space-y-4">
          <p className="text-[17px] text-[var(--text-secondary)]">{error}</p>
          <button
            type="button"
            className="text-[17px] font-semibold text-[var(--accent)]"
            onClick={() => window.location.reload()}
          >
            Ponów
          </button>
        </div>
      ) : phase === 'line' ? (
        <div className="w-full max-w-sm">
          <svg viewBox="0 0 320 80" className="w-full" aria-hidden>
            <path
              d="M20 60 C 80 20, 160 20, 300 40"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              className="route-draw"
            />
            <circle cx="20" cy="60" r="5" fill="var(--accent)" />
            <circle cx="300" cy="40" r="5" fill="var(--accent)" className="glow" />
          </svg>
          <p className="mt-4 text-[15px] text-[var(--text-secondary)]">Zabierzów → Balice</p>
        </div>
      ) : (
        <h1 className="display-xl">Witaj, {name}</h1>
      )}
    </main>
  )
}
