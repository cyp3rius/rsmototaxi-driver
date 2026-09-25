'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PlateBadge } from '@/components/ui/PlateBadge'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import {
  driverFirstName,
  isAppScopedTrip,
  polishCourseWord,
  tripDropoffLabel,
  tripPickupLabel,
} from '@/lib/tripMeta'
import { isReturnVisit, markWowSeen } from '@/lib/viewTransition'

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

/** Design handoff seqRoute / seqGreet (390×844 frame) */
const ROUTE_LEN = 7400
const GREET_LEN = 6800
/** Greeting block origin Y — brief G0 */
const G0 = 332
/** Left gutter — brief left: 32 */
const G_LEFT = 32

function readSafeTop() {
  if (typeof document === 'undefined') return 0
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:var(--safe-top)'
  document.body.appendChild(probe)
  const v = parseFloat(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
  return v
}

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
 * Wow 5.3–5.4 — positions/easings 1:1 with DriverScreen.dc.html seqRoute / seqGreet.
 * Morph target = dashboard header (safeTop+17), not a % of viewport.
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
  const [safeTop] = useState(() => (typeof window !== 'undefined' ? readSafeTop() : 0))
  const [slotTargets, setSlotTargets] = useState<{ headerTop: number; plateTop: number; plateLeft: number } | null>(
    null,
  )
  const finished = useRef(false)
  const rootRef = useRef<HTMLElement>(null)
  const helloSlotRef = useRef<HTMLDivElement>(null)
  const plateSlotRef = useRef<HTMLSpanElement>(null)

  const name = driverFirstName(me?.member)
  const plate = me?.todayAssignment?.resourcePlate || me?.profile?.defaultResourcePlate
  /** Plate flies into dashboard shift card only when that card hosts the plate slot. */
  const plateLandsOnCard =
    Boolean(plate) &&
    (me?.dashboardState === 'B' ||
      (me?.dashboardState === 'C' && !me?.nextTrip && !me?.liveTrip))
  const ctx = me
    ? contextLine(me, missingCount, nextTripLabel)
    : { primary: 'Przygotowujemy Twój dzień.', secondary: null }

  // Fallback until slots measure; prefer live layout from phantom (= /app).
  const headerTop = slotTargets?.headerTop ?? safeTop + 12
  const plateTargetTop = slotTargets?.plateTop ?? safeTop + 194
  const plateTargetLeft = slotTargets?.plateLeft ?? 40
  const morphDone = concept === 'A' ? 5350 : 4550
  const helloAt = concept === 'A' ? 2700 : 100

  useLayoutEffect(() => {
    const root = rootRef.current
    const hello = helloSlotRef.current
    if (!root || !hello) return
    const rootRect = root.getBoundingClientRect()
    const helloRect = hello.getBoundingClientRect()
    const phantom = hello.closest('[data-wow-phantom]') as HTMLElement | null
    const ty = phantom
      ? Number.parseFloat(phantom.style.transform.match(/translateY\(([-\d.]+)px\)/)?.[1] || '0')
      : 0
    const next = {
      headerTop: helloRect.top - rootRect.top - ty,
      plateTop: safeTop + 194,
      plateLeft: 40,
    }
    const plateEl = plateSlotRef.current
    if (plateEl) {
      const plateRect = plateEl.getBoundingClientRect()
      next.plateTop = plateRect.top - rootRect.top - ty
      next.plateLeft = plateRect.left - rootRect.left
    }
    setSlotTargets((prev) => {
      if (
        prev &&
        Math.abs(prev.headerTop - next.headerTop) < 0.5 &&
        Math.abs(prev.plateTop - next.plateTop) < 0.5 &&
        Math.abs(prev.plateLeft - next.plateLeft) < 0.5
      ) {
        return prev
      }
      return next
    })
  }, [me, plate, plateLandsOnCard, safeTop])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    markWowSeen(!returning)
    // Reset scroll / overflow so iOS does not leave fixed bottom nav floating
    // after the fullscreen morph (gap under tab bar until user scrolls).
    try {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      window.scrollTo(0, 0)
    } catch {
      // ignore
    }
    // Morph already painted dashboard chrome — plain replace avoids VT geometry jump.
    router.replace('/app')
  }, [returning, router])

  // Shared rAF clock for A and B
  useEffect(() => {
    if (error) return
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
  }, [error])

  useEffect(() => {
    if (!ready) return
    if (!session) {
      router.replace('/')
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
          setMissingCount(missing.items.filter(isAppScopedTrip).length)
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
            const place = tripPickupLabel(next) || tripDropoffLabel(next)
            if (time && place) setNextTripLabel(`Pierwszy kurs o ${time}, ${place}.`)
            else if (time) setNextTripLabel(`Pierwszy kurs o ${time}.`)
          }
        }
        // Progress bar (B) tracks real load — snap to 100
        const elapsed = Date.now() - started
        const minBar = concept === 'B' ? 1700 : 0
        window.setTimeout(() => {
          if (cancelled) return
          setProgress(100)
          setDataReady(true)
        }, Math.max(0, minBar - elapsed))
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
    if (error || !dataReady) return
    if (skip && t >= helloAt) {
      finish()
      return
    }
    if (t >= morphDone) finish()
  }, [error, dataReady, t, skip, helloAt, morphDone, finish])

  // —— Timeline (A = seqRoute, B = seqGreet) ——
  const isRoute = concept === 'A'
  const L = isRoute ? ROUTE_LEN : GREET_LEN
  const tt = Math.min(t, L)

  const morphStart = isRoute ? 4500 : 3700
  const morphEnd = isRoute ? 5150 : 4350
  const m = eo(seg(tt, morphStart, morphEnd))
  const mRaw = seg(tt, morphStart, morphEnd)

  const w1s = isRoute ? 2700 : 100
  const w2s = isRoute ? 2820 : 220
  const w3s = isRoute ? 2980 : 1750
  const w1 = eo(seg(tt, w1s, w1s + 450))
  const w2 = eo(seg(tt, w2s, w2s + 450))
  const w3 = eo(seg(tt, w3s, w3s + 450))

  // Greeting morph: absolute top G0 → headerTop, scale 1 → 0.5
  const greetTop = lerp(G0, headerTop, m)
  const greetScale = lerp(1, 0.5, m)
  const greetOp = 1 - seg(mRaw, 0.7, 1)
  const greetMarginL = lerp(0, -12, m)
  // Name joins "Witaj," on one line during morph (brief translate 176, -46)
  const nameTx = lerp(0, 176, m)
  const nameTy = 8 * (1 - w2) + lerp(0, -46, m)
  const ctxOp = w3 * (1 - clamp(mRaw * 3))
  const ctxTy = 8 * (1 - w3) - 20 * m

  // Phantom dashboard under morph
  const dashInStart = isRoute ? 4700 : 3900
  const dashInEnd = isRoute ? 5350 : 4550
  const dashOp = eo(seg(tt, dashInStart, dashInEnd))
  const dashY = 36 * (1 - dashOp)
  const hdrOp = seg(mRaw, 0.55, 1)
  // Reveal phantom only once it has settled (dashY ≈ 0); keep flying layers until then.
  const phantomSettled = dashOp >= 0.96
  const showPhantomHdr = phantomSettled && mRaw >= 0.88
  const showPhantomPlate = phantomSettled && !isRoute && plateLandsOnCard && mRaw >= 0.9

  // Path A map
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

  // Path B progress + plate
  const bar = eio(seg(tt, 350, 1700))
  const barOp = eo(seg(tt, 300, 450)) * (1 - seg(tt, 1700, 1900))
  const plateOp = eo(seg(tt, 1900, 2350))
  const plateFromY = G0 + 112 + 26 + 18
  /** No shift card on dashboard → dissolve plate instead of snapping off. */
  const plateDissolve = !plateLandsOnCard ? eo(seg(mRaw, 0.12, 0.78)) : 0
  const plateTop = plateLandsOnCard
    ? lerp(plateFromY, plateTargetTop, m) + 8 * (1 - plateOp)
    : plateFromY - 18 * plateDissolve + 8 * (1 - plateOp)
  const plateLeft = plateLandsOnCard ? lerp(G_LEFT, plateTargetLeft, m) : G_LEFT
  const plateScale = plateLandsOnCard ? 1 : lerp(1, 0.86, plateDissolve)
  const plateFade = plateLandsOnCard ? plateOp : plateOp * (1 - plateDissolve)
  // Prefer real load progress once available; else timeline bar
  const barWidth = dataReady ? Math.max(bar, progress / 100) : bar

  const showMap = isRoute && mapOp > 0.02
  const showHello = w1 > 0.02 || m > 0
  const showSlow = isRoute && tt > 2000 && tt < 2700

  if (error) {
    return (
      <main
        className="flex min-h-dvh flex-col justify-center px-5 pb-16"
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
            onClick={() => void logout().then(() => router.replace('/'))}
          >
            Wyloguj się
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      ref={rootRef}
      className="relative min-h-dvh overflow-hidden bg-[var(--bg-base)]"
      onClick={() => {
        if (t >= helloAt) setSkip(true)
      }}
    >
      {/* Phantom dashboard fades in under morph — lands greeting on real header coords */}
      <div
        data-wow-phantom
        className="pointer-events-none absolute inset-0 flex flex-col"
        style={{
          paddingTop: 'calc(var(--safe-top) + 4px)',
          opacity: dashOp,
          transform: dashY > 0.5 ? `translateY(${dashY}px)` : undefined,
        }}
        aria-hidden
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-2.5">
          <div className="min-w-0">
            <div
              ref={helloSlotRef}
              className="display-dash-hdr"
              style={{ opacity: showPhantomHdr ? 1 : 0 }}
            >
              Witaj, <span className="text-[var(--accent)]">{name}</span>
            </div>
            <div
              className="mt-0.5 text-[15px] leading-5 capitalize text-[var(--text-secondary)]"
              style={{ opacity: showPhantomHdr ? 1 : 0 }}
            >
              {(me?.today ? new Date(`${me.today}T12:00:00`) : new Date()).toLocaleDateString('pl-PL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
          </div>
        </div>
        {!isRoute && plate && plateLandsOnCard ? (
          <div className="px-5 pt-0.5" style={{ opacity: showPhantomPlate || hdrOp > 0.2 ? dashOp : 0 }}>
            <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
              <div className="flex justify-between text-[15px] leading-5 text-[var(--text-secondary)] opacity-40">
                <span>Czas zmiany</span>
                <span />
              </div>
              <div className="numeric-xl mt-1.5 opacity-0">00:00:00</div>
              <div className="mt-[18px]">
                <span ref={plateSlotRef} style={{ opacity: showPhantomPlate ? 1 : 0 }}>
                  <PlateBadge plate={plate} />
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* —— Path A: map + glow —— */}
      {isRoute ? (
        <>
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              // Balice endpoint ≈ screen (298, 409) on 390 frame
              left: 298 - glowSize / 2,
              top: 300 + (104 / 220) * 231 - glowSize / 2,
              width: glowSize,
              height: glowSize,
              opacity: glowOp,
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent) 0%, color-mix(in srgb, var(--accent) 18%, transparent) 30%, transparent 65%)',
            }}
          />
          {showMap ? (
            <svg
              viewBox="0 0 320 220"
              className="pointer-events-none absolute overflow-visible"
              style={{ left: 27, top: 300, width: 336, height: 231, opacity: mapOp }}
              aria-hidden
            >
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
                  filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 50%, transparent))',
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
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scale(${endScale})` }}
              />
              <text x="62" y="158" textAnchor="middle" fontSize={15} fill="var(--text-secondary)" opacity={lab1}>
                Zabierzów
              </text>
              <text x="258" y="86" textAnchor="middle" fontSize={15} fill="var(--text-secondary)" opacity={lab2}>
                Balice
              </text>
            </svg>
          ) : null}
          {showSlow ? (
            <p
              className="absolute left-0 right-0 text-center text-[17px] text-[var(--text-secondary)]"
              style={{
                top: 300 + 231 + 24,
                opacity: eo(seg(tt, 2000, 2300)) * (1 - seg(tt, 2550, 2750)),
              }}
            >
              {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
            </p>
          ) : null}
        </>
      ) : null}

      {/* —— Path B: progress track (left-aligned under greeting) —— */}
      {!isRoute ? (
        <div
          className="absolute overflow-hidden rounded-sm bg-[var(--separator)]"
          style={{
            left: G_LEFT,
            top: G0 + 124,
            width: 140,
            height: 3,
            opacity: barOp,
          }}
        >
          <div
            className="h-full rounded-sm bg-[var(--accent)]"
            style={{ width: `${Math.min(1, barWidth) * 100}%` }}
          />
        </div>
      ) : null}

      {/* —— Shared greeting: left-aligned, morphs into header —— */}
      {showHello ? (
        <div
          className="absolute text-left"
          style={{
            left: G_LEFT,
            top: greetTop,
            marginLeft: greetMarginL,
            transform: `scale(${greetScale})`,
            transformOrigin: '0 0',
            opacity: showPhantomHdr ? 0 : greetOp > 0.02 ? 1 : 0,
            width: `calc(100% - ${G_LEFT * 2}px)`,
          }}
        >
          <div>
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
                transform: `translate(${nameTx}px, ${nameTy}px)`,
              }}
            >
              {name}
            </div>
          </div>
          <div
            className="mt-7"
            style={{
              opacity: ctxOp,
              transform: `translateY(${ctxTy}px)`,
            }}
          >
            {!isRoute && !dataReady ? (
              <p className="text-[18px] leading-[26px] text-[var(--text-secondary)]">
                {slowHint === 'still' ? 'Wciąż ładujemy zlecenia…' : 'Przygotowujemy Twój dzień'}
              </p>
            ) : (
              <>
                <p className="text-[18px] leading-[26px] text-[var(--text-primary)]">{ctx.primary}</p>
                {ctx.secondary && isRoute ? (
                  <p className="mt-1 text-[17px] leading-[25px] text-[var(--text-secondary)]">
                    {ctx.secondary}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* —— Path B: plate flies into shift-card slot, or dissolves when no card —— */}
      {!isRoute && plate ? (
        <div
          className="absolute origin-left"
          style={{
            left: plateLeft,
            top: plateTop,
            opacity: showPhantomPlate ? 0 : plateFade,
            transform: `scale(${plateScale})`,
          }}
        >
          <PlateBadge plate={plate} />
        </div>
      ) : null}

      {showHello && w3 > 0.55 && m < 0.12 ? (
        <p
          className="absolute bottom-10 left-0 right-0 text-center text-[14px] text-[var(--text-tertiary)]"
          style={{ paddingBottom: 'var(--safe-bottom)' }}
        >
          Dotknij, aby pominąć
        </p>
      ) : null}
    </main>
  )
}
