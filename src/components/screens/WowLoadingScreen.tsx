'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { isReturnVisit, markWowSeen, navigateWithViewTransition } from '@/lib/viewTransition'

function greetingLine(hour: number) {
  if (hour >= 5 && hour < 18) return 'Dzień dobry,'
  return 'Dobry wieczór,'
}

function contextLine(
  me: NonNullable<ReturnType<typeof useAuth>['me']>,
  missingCount: number,
): { primary: string; secondary: string | null } {
  const plate = me.todayAssignment?.resourcePlate || me.profile?.defaultResourcePlate
  let primary = 'Przygotowujemy Twój dzień.'
  if (me.dashboardState === 'A') primary = 'Na dziś nie masz zaplanowanej zmiany.'
  else if (me.dashboardState === 'A2') primary = 'Sprawdzamy dostępność pojazdów.'
  else if (me.dashboardState === 'B') {
    const t = me.todayAssignment?.plannedShiftStart
      ? new Date(me.todayAssignment.plannedShiftStart).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
    primary = t
      ? `Twoja zmiana zaczyna się o ${t}.${plate ? ` ${plate}.` : ''}`
      : 'Masz zaplanowaną zmianę.'
  } else if (me.dashboardState === 'C') {
    const t = me.todayAssignment?.shiftStart
      ? new Date(me.todayAssignment.shiftStart).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
    primary = t ? `Jesteś na zmianie od ${t}.` : 'Jesteś na zmianie.'
  } else if (me.dashboardState === 'D') {
    primary = 'Dzisiejsza zmiana zakończona.'
  }
  const secondary =
    missingCount > 0
      ? `${missingCount} ${missingCount === 1 ? 'kurs czeka' : 'kursy czekają'} na paragon.`
      : null
  return { primary, secondary }
}

/**
 * Wow loading:
 * - Concept A (first login): route line Zabierzów→Balice → glow → greeting → View Transition to dashboard
 * - Concept B (return): greeting + real progress + plate flies into place
 */
export function WowLoadingScreen() {
  const router = useRouter()
  const { me, refreshMe, session, ready, logout } = useAuth()
  const returning = useMemo(() => isReturnVisit(), [])
  const [concept] = useState<'A' | 'B'>(() => (returning ? 'B' : 'A'))
  const [phase, setPhase] = useState<'line' | 'glow' | 'hello' | 'done'>('line')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<'timeout' | 'offline' | null>(null)
  const [slowHint, setSlowHint] = useState<'day' | 'still' | null>(null)
  const [missingCount, setMissingCount] = useState(0)
  const [skip, setSkip] = useState(false)
  const [dataReady, setDataReady] = useState(false)

  const name = me?.member.firstName || me?.member.displayName?.split(/\s+/)[0] || 'kierowco'
  const plate = me?.todayAssignment?.resourcePlate || me?.profile?.defaultResourcePlate
  const greet = greetingLine(new Date().getHours())
  const ctx = me ? contextLine(me, missingCount) : { primary: 'Przygotowujemy Twój dzień.', secondary: null }

  const finish = useCallback(() => {
    markWowSeen(!returning)
    setPhase('done')
    navigateWithViewTransition(() => {
      router.replace('/app')
    })
  }, [returning, router])

  useEffect(() => {
    if (!ready) return
    if (!session) {
      router.replace('/login')
      return
    }
    let cancelled = false
    const started = Date.now()

    const dayTimer = window.setTimeout(() => {
      if (!cancelled) setSlowHint('day')
    }, 2000)
    const stillTimer = window.setTimeout(() => {
      if (!cancelled) setSlowHint('still')
    }, 6000)

    void (async () => {
      try {
        if (!navigator.onLine) {
          setError('offline')
          return
        }
        const progressTick = window.setInterval(() => {
          setProgress((p) => Math.min(92, p + 6 + Math.random() * 8))
        }, 180)

        const [payload, missing] = await Promise.all([
          me ? Promise.resolve(me) : refreshMe(),
          omClient.getTrips({ pageSize: 1, missingReceipt: true }).catch(() => null),
          omClient.getProfiles().catch(() => null),
          omClient.getTrips({ pageSize: 20 }).catch(() => null),
        ])
        window.clearInterval(progressTick)
        if (cancelled) return
        if (!payload) throw new Error('empty')
        if (missing) setMissingCount(missing.total)
        setProgress(100)
        setDataReady(true)

        const elapsed = Date.now() - started
        const minLine = concept === 'A' ? 1400 : 600
        const waitLine = Math.max(0, minLine - elapsed)

        window.setTimeout(() => {
          if (cancelled) return
          if (concept === 'A') {
            setPhase('glow')
            window.setTimeout(() => {
              if (cancelled) return
              setPhase('hello')
            }, 450)
          } else {
            setPhase('hello')
          }
        }, waitLine)
      } catch {
        if (!cancelled) setError(navigator.onLine ? 'timeout' : 'offline')
      }
    })()

    const timeout = window.setTimeout(() => {
      if (!cancelled) setError('timeout')
    }, 15000)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.clearTimeout(dayTimer)
      window.clearTimeout(stillTimer)
    }
  }, [ready, session, me, refreshMe, router, concept])

  useEffect(() => {
    if (phase !== 'hello' || error || !dataReady) return
    const hold = skip ? 0 : returning ? 900 : 1600
    const t = window.setTimeout(() => finish(), hold)
    return () => window.clearTimeout(t)
  }, [phase, skip, returning, error, dataReady, finish])

  if (error) {
    return (
      <main
        className="flex min-h-dvh flex-col justify-center px-5 pb-16 max-[390px]:px-5 sm:px-6"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <span className="flex size-16 items-center justify-center rounded-[20px] tint-warning text-[var(--warning)]">
          ⚠
        </span>
        <h1
          className="mt-6 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9"
          style={{ fontStretch: '115%' }}
        >
          {error === 'offline' ? 'Brak połączenia' : 'Nie udało się pobrać zleceń'}
        </h1>
        <p className="mt-2.5 text-[17px] leading-6 text-[var(--text-secondary)]">
          {error === 'offline'
            ? 'Brak zapisanego profilu na tym urządzeniu. Połącz się raz, żeby pobrać pojazdy i dane zmian.'
            : 'Ładowanie trwa ponad 15 sekund. Sprawdź połączenie albo spróbuj ponownie.'}
        </p>
        <div className="mt-6 space-y-2">
          <Button onClick={() => window.location.reload()}>Spróbuj ponownie</Button>
          <Button variant="secondary" onClick={() => router.replace('/app')}>
            Otwórz dane z pamięci
          </Button>
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
            onClick={() => void logout().then(() => router.replace('/login'))}
          >
            Wyloguj się
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] px-5 text-center max-[390px]:px-5 sm:px-6"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      onClick={() => {
        if (phase === 'hello') setSkip(true)
      }}
    >
      {concept === 'A' && (phase === 'line' || phase === 'glow') ? (
        <div className={`w-full max-w-sm transition-opacity duration-500 ${phase === 'glow' ? 'opacity-0' : 'opacity-100'}`}>
          <svg viewBox="0 0 320 160" className="w-full" aria-hidden>
            {/* subtle map contour */}
            <path
              d="M40 120 C 70 90, 90 70, 120 75 C 150 80, 170 100, 200 95 C 240 88, 270 60, 300 50"
              fill="none"
              stroke="var(--separator)"
              strokeWidth="1.2"
              opacity="0.7"
            />
            <path
              d="M30 90 C 60 100, 100 110, 140 100 C 180 90, 220 70, 280 80"
              fill="none"
              stroke="var(--separator)"
              strokeWidth="1"
              opacity="0.45"
            />
            <circle cx="48" cy="108" r="2.5" fill="var(--text-tertiary)" />
            <circle cx="292" cy="52" r="2.5" fill="var(--text-tertiary)" />
            <text x="36" y="128" fontSize="11" fill="var(--text-tertiary)">
              Zabierzów
            </text>
            <text x="258" y="42" fontSize="11" fill="var(--text-tertiary)">
              Balice
            </text>
            <path
              d="M48 108 C 110 40, 200 30, 292 52"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              className="route-draw"
            />
            <circle cx="48" cy="108" r="5" fill="var(--accent)" />
            <circle
              cx="292"
              cy="52"
              r="5"
              fill="var(--accent)"
              className={phase === 'glow' ? 'wow-dot-pulse' : undefined}
            />
          </svg>
          {slowHint ? (
            <p className="mt-6 text-[17px] text-[var(--text-secondary)]">
              {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
            </p>
          ) : (
            <p className="mt-6 text-[17px] text-[var(--text-secondary)] opacity-0 animate-[rise_0.4s_ease_2s_forwards]">
              Przygotowujemy Twój dzień
            </p>
          )}
        </div>
      ) : null}

      {concept === 'A' && phase === 'glow' ? (
        <div className="wow-glow pointer-events-none absolute left-1/2 top-[42%] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      ) : null}

      {(phase === 'hello' || phase === 'done') && concept === 'A' ? (
        <div className="hello-enter px-2">
          <h1 className="display-hello" style={{ viewTransitionName: 'driver-hello' }}>
            {greet} <span className="text-[var(--accent)]">{name}</span>
          </h1>
          <p className="hello-line-2 mt-3 text-[17px] text-[var(--text-secondary)]">{ctx.primary}</p>
          {ctx.secondary ? (
            <p className="hello-line-3 mt-1.5 text-[15px] text-[var(--text-tertiary)]">{ctx.secondary}</p>
          ) : null}
          <p className="mt-8 text-[14px] text-[var(--text-tertiary)]">Dotknij, aby pominąć</p>
        </div>
      ) : null}

      {concept === 'B' ? (
        <div className="flex w-full max-w-sm flex-col items-center px-2">
          <h1 className="display-hello hello-enter" style={{ viewTransitionName: 'driver-hello' }}>
            {greet} <span className="text-[var(--accent)]">{name}</span>
          </h1>
          {dataReady ? (
            <>
              <p className="hello-line-2 mt-3 text-[17px] text-[var(--text-secondary)]">{ctx.primary}</p>
              {ctx.secondary ? (
                <p className="hello-line-3 mt-1.5 text-[15px] text-[var(--text-tertiary)]">{ctx.secondary}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-[17px] text-[var(--text-secondary)]">
              {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
            </p>
          )}

          <div className="mt-10 h-1 w-full overflow-hidden rounded-full bg-[var(--separator)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {plate ? (
            <div className={`mt-8 ${progress >= 100 ? 'plate-fly' : 'opacity-90'}`}>
              <PlateBadge plate={plate} />
            </div>
          ) : null}
          {phase === 'hello' ? (
            <p className="mt-8 text-[14px] text-[var(--text-tertiary)]">Dotknij, aby pominąć</p>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
