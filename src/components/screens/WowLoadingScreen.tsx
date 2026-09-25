'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import {
  driverFirstName,
  isAppScopedTrip,
  polishCourseWord,
} from '@/lib/tripMeta'
import { isReturnVisit, markWowSeen, navigateWithViewTransition } from '@/lib/viewTransition'

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a))
const eo = (x: number) => 1 - Math.pow(1 - x, 3)
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const back = (x: number) => {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
const lerp = (a: number, b: number, x: number) => a + (b - a) * x

/** Path A total timeline (ms) from design handoff seqRoute */
const ROUTE_LEN = 7400
const MORPH_DONE = 5350

function contextLine(
  me: NonNullable<ReturnType<typeof useAuth>['me']>,
  missingCount: number,
  nextTripLabel: string | null,
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

  let secondary: string | null = null
  if (nextTripLabel) secondary = nextTripLabel
  else if (missingCount > 0) {
    secondary = `${missingCount} ${polishCourseWord(missingCount)} ${
      missingCount === 1 ? 'czeka' : 'czekają'
    } na paragon.`
  }
  return { primary, secondary }
}

/**
 * Wow loading 5.3–5.4:
 * A (first): Zabierzów→Balice stroke (eio) → ring/back → glow → Witaj → morph to dash header
 * B (return): greeting + real progress + plate
 */
export function WowLoadingScreen() {
  const router = useRouter()
  const { me, refreshMe, session, ready, logout } = useAuth()
  const returning = useMemo(() => isReturnVisit(), [])
  const [concept] = useState<'A' | 'B'>(() => (returning ? 'B' : 'A'))
  const [t, setT] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<'timeout' | 'offline' | null>(null)
  const [slowHint, setSlowHint] = useState<'day' | 'still' | null>(null)
  const [missingCount, setMissingCount] = useState(0)
  const [nextTripLabel, setNextTripLabel] = useState<string | null>(null)
  const [skip, setSkip] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [bHello, setBHello] = useState(false)
  const finished = useRef(false)

  const name = driverFirstName(me?.member)
  const plate = me?.todayAssignment?.resourcePlate || me?.profile?.defaultResourcePlate
  const ctx = me
    ? contextLine(me, missingCount, nextTripLabel)
    : { primary: 'Przygotowujemy Twój dzień.', secondary: null }

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    markWowSeen(!returning)
    navigateWithViewTransition(() => {
      router.replace('/app')
    })
  }, [returning, router])

  // Path A: continuous rAF clock (brief easings: eo / eio / back)
  useEffect(() => {
    if (concept !== 'A' || error) return
    const t0 = performance.now()
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      if (now - last > 16) {
        last = now
        setT(now - t0)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [concept, error])

  // Data load (parallel with animation)
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
          const cached = me || (await refreshMe().catch(() => null))
          if (cached) {
            setDataReady(true)
            setProgress(100)
            if (concept === 'B') setBHello(true)
            return
          }
          setError('offline')
          return
        }
        const progressTick = window.setInterval(() => {
          setProgress((p) => Math.min(92, p + 6 + Math.random() * 8))
        }, 180)

        const [payload, missing, , trips] = await Promise.all([
          me ? Promise.resolve(me) : refreshMe(),
          omClient.getTrips({ pageSize: 50, missingReceipt: true }).catch(() => null),
          omClient.getProfiles().catch(() => null),
          omClient.getTrips({ pageSize: 20 }).catch(() => null),
        ])
        window.clearInterval(progressTick)
        if (cancelled) return
        if (!payload) throw new Error('empty')

        if (missing) {
          const scoped = missing.items.filter(isAppScopedTrip)
          setMissingCount(scoped.length || 0)
        }
        if (trips) {
          const next = trips.items.find(
            (tr) => isAppScopedTrip(tr) && String(tr.status || '') === 'scheduled',
          )
          if (next) {
            const time = next.startedAt
              ? new Date(String(next.startedAt)).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null
            const meta =
              next.metadata && typeof next.metadata === 'object'
                ? (next.metadata as { tripRequest?: { from?: string; to?: string } })
                : null
            const place = meta?.tripRequest?.from || meta?.tripRequest?.to
            if (time && place) setNextTripLabel(`Pierwszy kurs o ${time}, ${place}.`)
            else if (time) setNextTripLabel(`Pierwszy kurs o ${time}.`)
          }
        }
        setProgress(100)
        setDataReady(true)

        if (concept === 'B') {
          const elapsed = Date.now() - started
          window.setTimeout(() => {
            if (!cancelled) setBHello(true)
          }, Math.max(0, 600 - elapsed))
        }
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

  // Path A: finish after morph + data (or skip once greeting visible)
  useEffect(() => {
    if (concept !== 'A' || error || !dataReady) return
    const helloVisible = t >= 2700
    if (skip && helloVisible) {
      finish()
      return
    }
    if (t >= MORPH_DONE) finish()
  }, [concept, error, dataReady, t, skip, finish])

  // Path B: hold then finish
  useEffect(() => {
    if (concept !== 'B' || error || !dataReady || !bHello) return
    const hold = skip ? 0 : 900
    const timer = window.setTimeout(() => finish(), hold)
    return () => window.clearTimeout(timer)
  }, [concept, error, dataReady, bHello, skip, finish])

  // —— Path A derived styles (1:1 with DriverScreen seqRoute) ——
  const tt = Math.min(t, ROUTE_LEN)
  const mapIn = eo(seg(tt, 0, 400))
  const mapFade = 1 - eio(seg(tt, 2300, 2800))
  const draw = eio(seg(tt, 200, 1500))
  const ex = seg(tt, 1500, 1800)
  const ring = seg(tt, 1500, 2150)
  const gp = seg(tt, 2150, 2900)
  const endScale = ex === 0 ? 0 : back(ex)
  const ringR = 5 + 22 * ring
  const ringOp = ring > 0 && ring < 1 ? 0.7 * (1 - ring) : 0
  const lab1 = eo(seg(tt, 250, 600))
  const lab2 = eo(seg(tt, 1650, 1950))
  const glowSize = 24 + 1100 * eo(gp)
  const glowOp =
    gp > 0 ? eo(seg(tt, 2150, 2350)) * (1 - eio(seg(tt, 2600, 3400))) * 0.9 : 0
  const mapOp = mapIn * mapFade

  const w1 = eo(seg(tt, 2700, 3150))
  const w2 = eo(seg(tt, 2820, 3270))
  const w3 = eo(seg(tt, 2980, 3430))
  const m = eo(seg(tt, 4500, 5150))
  const mRaw = seg(tt, 4500, 5150)
  const greetScale = lerp(1, 0.5, m)
  const greetOp = 1 - seg(mRaw, 0.7, 1)
  const ctxOp = w3 * (1 - clamp(mRaw * 3))
  const greetY = lerp(0, -120, m)

  const showMap = mapOp > 0.02 && concept === 'A'
  const showHello = (w1 > 0.02 || m > 0) && concept === 'A'
  const showSlow =
    concept === 'A' && tt > 2000 && tt < 2700 && (slowHint || tt > 2000)

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
        if (concept === 'A' && t >= 2700) setSkip(true)
        if (concept === 'B' && bHello) setSkip(true)
      }}
    >
      {concept === 'A' ? (
        <>
          {/* Glow bloom from Balice endpoint */}
          <div
            className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: glowSize,
              height: glowSize,
              opacity: glowOp,
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent) 0%, color-mix(in srgb, var(--accent) 18%, transparent) 30%, transparent 65%)',
            }}
          />

          {showMap ? (
            <div className="relative w-full max-w-[336px]" style={{ opacity: mapOp }}>
              <svg viewBox="0 0 320 220" className="w-full overflow-visible" aria-hidden>
                <g fill="none" stroke="var(--separator)" strokeWidth="1.2">
                  <path d="M10 150 C 60 120, 90 170, 140 140 S 230 100, 310 130" />
                  <path d="M20 70 C 80 60, 120 95, 170 80 S 250 40, 300 60" />
                  <path d="M40 200 C 100 185, 160 205, 220 190 S 280 170, 310 185" />
                  <path d="M150 10 C 145 60, 170 110, 160 210" />
                  <path d="M240 20 C 230 70, 250 120, 235 210" />
                </g>
                <g fill="var(--text-tertiary)">
                  <circle cx="36" cy="40" r="1.6" />
                  <circle cx="92" cy="176" r="1.6" />
                  <circle cx="212" cy="36" r="1.6" />
                  <circle cx="272" cy="168" r="1.6" />
                  <circle cx="128" cy="58" r="1.6" />
                  <circle cx="290" cy="98" r="1.6" />
                </g>
                {/* pathLength=1 so dasharray/offset are unitless 0–1 — finishes completely */}
                <path
                  d="M62 132 C 95 132, 110 96, 150 100 S 215 128, 258 104"
                  pathLength={1}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                  style={{
                    filter:
                      'drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 50%, transparent))',
                  }}
                />
                <circle cx="62" cy="132" r="5" fill="var(--accent)" />
                <circle
                  cx="258"
                  cy="104"
                  r={ringR}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  opacity={ringOp}
                />
                <circle
                  cx="258"
                  cy="104"
                  r="5"
                  fill="var(--accent)"
                  style={{
                    transformOrigin: '258px 104px',
                    transform: `scale(${endScale})`,
                  }}
                />
                <text
                  x="62"
                  y="158"
                  textAnchor="middle"
                  fontSize={15}
                  fill="var(--text-secondary)"
                  opacity={lab1}
                >
                  Zabierzów
                </text>
                <text
                  x="258"
                  y="86"
                  textAnchor="middle"
                  fontSize={15}
                  fill="var(--text-secondary)"
                  opacity={lab2}
                >
                  Balice
                </text>
              </svg>
            </div>
          ) : null}

          {showSlow ? (
            <p
              className="absolute bottom-[22%] left-0 right-0 text-[17px] text-[var(--text-secondary)]"
              style={{ opacity: eo(seg(tt, 2000, 2300)) * (1 - seg(tt, 2550, 2750)) }}
            >
              {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
            </p>
          ) : null}

          {showHello ? (
            <div
              className="absolute inset-x-0 px-8 text-left"
              style={{
                top: '38%',
                transform: `translateY(${greetY}px) scale(${greetScale})`,
                transformOrigin: '32px 0',
                opacity: greetOp,
                marginLeft: lerp(0, -4, m),
              }}
            >
              <div style={{ viewTransitionName: 'driver-hello' }}>
                <div
                  className="display-hello text-[var(--text-primary)]"
                  style={{
                    opacity: w1,
                    transform: `translateY(${8 * (1 - w1)}px)`,
                  }}
                >
                  Witaj,
                </div>
                <div
                  className="display-hello text-[var(--accent)]"
                  style={{
                    opacity: w2,
                    transform: `translateY(${8 * (1 - w2)}px)`,
                  }}
                >
                  {name}
                </div>
              </div>
              <div
                className="mt-7"
                style={{
                  opacity: ctxOp,
                  transform: `translateY(${8 * (1 - w3) - 20 * m}px)`,
                }}
              >
                <p className="text-[18px] leading-[26px] text-[var(--text-primary)]">{ctx.primary}</p>
                {ctx.secondary ? (
                  <p className="mt-1 text-[17px] leading-[25px] text-[var(--text-secondary)]">
                    {ctx.secondary}
                  </p>
                ) : null}
              </div>
              {w3 > 0.6 && m < 0.15 ? (
                <p className="mt-10 text-center text-[14px] text-[var(--text-tertiary)]">
                  Dotknij, aby pominąć
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {concept === 'B' ? (
        <div className="flex w-full max-w-sm flex-col items-center px-2">
          <h1 className="display-hello text-left" style={{ viewTransitionName: 'driver-hello' }}>
            Witaj, <span className="text-[var(--accent)]">{name}</span>
          </h1>
          {dataReady && bHello ? (
            <>
              <p
                className="mt-3 text-[17px] text-[var(--text-secondary)]"
                style={{
                  opacity: 1,
                  transform: 'translateY(0)',
                  transition: 'opacity 450ms cubic-bezier(0.22, 1, 0.36, 1), transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {ctx.primary}
              </p>
              {ctx.secondary ? (
                <p className="mt-1.5 text-[15px] text-[var(--text-tertiary)]">{ctx.secondary}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-[17px] text-[var(--text-secondary)]">
              {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
            </p>
          )}

          <div className="mt-10 h-[3px] w-[140px] overflow-hidden rounded-sm bg-[var(--separator)]">
            <div
              className="h-full rounded-sm bg-[var(--accent)] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {plate ? (
            <div className={`mt-8 ${progress >= 100 ? 'plate-fly' : 'opacity-90'}`}>
              <PlateBadge plate={plate} />
            </div>
          ) : null}
          {bHello ? (
            <p className="mt-8 text-[14px] text-[var(--text-tertiary)]">Dotknij, aby pominąć</p>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
