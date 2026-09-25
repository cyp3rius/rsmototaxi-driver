'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/lib/om/AuthProvider'
import { OmApiError } from '@/lib/om/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function WelcomeInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { ready, session, login } = useAuth()
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const loginFromUrl = search.get('login') === '1' || search.get('login') === 'true'
  const [loginForced, setLoginForced] = useState(false)
  const loginOpen = loginForced || loginFromUrl
  const parallaxRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    if (ready && session) router.replace('/loading')
  }, [ready, session, router])

  useEffect(() => {
    if (session) return
    const sync = () => setOffline(!navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    const remembered = localStorage.getItem('rs-driver-email')
    if (remembered) queueMicrotask(() => setEmail(remembered))
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [session])

  const sheetOpen = loginOpen || helpOpen

  useEffect(() => {
    if (session || reduced || sheetOpen) {
      const el = parallaxRef.current
      if (el) el.style.transform = ''
      return
    }
    const el = parallaxRef.current
    if (!el || !window.DeviceOrientationEvent) return
    const onOrient = (e: DeviceOrientationEvent) => {
      const x = Math.max(-8, Math.min(8, (e.gamma ?? 0) * 0.25))
      const y = Math.max(-8, Math.min(8, (e.beta ?? 0) * 0.12 - 4))
      // Translate only — never touch scale/filter (owned by sheet open transition)
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [session, reduced, sheetOpen])
  const canSubmit = useMemo(
    () => EMAIL_RE.test(email.trim()) && password.length > 0,
    [email, password],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Wpisz pełny adres e-mail, np. jan@rsmototaxi.pl')
      return
    }
    setEmailError(null)
    if (!canSubmit || loading || offline) return
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      localStorage.setItem('rs-driver-email', email.trim())
      router.replace('/loading')
    } catch (err) {
      let message =
        'Nieprawidłowy e-mail lub hasło. Sprawdź dane albo skontaktuj się z koordynatorem.'
      if (err instanceof OmApiError) {
        const raw = err.message.toLowerCase()
        if (raw.includes('feature') || raw.includes('driver') || raw.includes('permission')) {
          message = 'To konto nie ma dostępu do aplikacji kierowcy'
        } else if (raw.includes('inactive') || raw.includes('disabled') || raw.includes('nieaktywn')) {
          message = 'Twoje konto jest nieaktywne. Skontaktuj się z koordynatorem.'
        }
      }
      setError(message)
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      setLoading(false)
    }
  }

  function closeLogin() {
    setLoginForced(false)
    if (search.get('login')) router.replace('/')
  }

  // Existing session / hydrate: never paint 5.1 — splash owns handoff to 5.3–5.4.
  if (!ready || session) {
    return <div className="min-h-dvh bg-[#020407]" aria-hidden />
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020407] text-white">
      <div className="absolute inset-0">
        {/* Sheet open: filter+scale live on outer layer so parallax never fights the transition */}
        <div
          className="absolute inset-0 will-change-[filter,transform]"
          style={{
            filter: sheetOpen ? 'blur(10px) brightness(0.55)' : 'blur(0px) brightness(1)',
            transform: sheetOpen ? 'scale(1.04)' : 'scale(1)',
            transition: reduced
              ? 'none'
              : 'filter 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div ref={parallaxRef} className="absolute inset-[-12px] will-change-transform">
            {/* Ken Burns + headlights share one layer so glow stays glued to LEDs */}
            <div className={reduced || sheetOpen ? 'absolute inset-0' : 'kenburns absolute inset-0'}>
              <Image
                src="/brand/fleet-hero-green.webp"
                alt=""
                fill
                priority
                className="object-cover"
                style={{ objectPosition: '50% 40%' }}
              />
              {!reduced && !sheetOpen ? (
                <div className="headlights" aria-hidden>
                  <span className="hl-glow hl-secondary" />
                  <span className="hl-glow hl-primary" />
                  <span className="hl-flare" />
                  <span className="hl-core hl-core-secondary" />
                  <span className="hl-core hl-core-primary" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,4,7,.5) 0%, rgba(2,4,7,0) 20%, rgba(2,4,7,0) 50%, rgba(2,4,7,.88) 67%, #020407 100%)',
          }}
        />
        <div
          className="absolute inset-0 bg-[#020407]/35"
          style={{
            opacity: sheetOpen ? 1 : 0,
            transition: reduced ? 'none' : 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        className="relative z-10 flex min-h-dvh flex-col px-6"
        style={{
          paddingTop: 'calc(var(--safe-top) + 24px)',
          paddingBottom: 'calc(var(--safe-bottom) + 12px)',
          opacity: sheetOpen ? 0 : 1,
          transform: sheetOpen ? 'translateY(-8px)' : 'translateY(0)',
          transition: reduced
            ? 'none'
            : 'opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: sheetOpen ? 'none' : 'auto',
        }}
      >
        <div className="enter-1 mt-0 flex justify-center">
          <Image
            src="/brand/logo-light.svg"
            alt="RS Moto Taxi"
            width={51}
            height={68}
            className="h-[68px] w-auto"
            priority
          />
        </div>

        <div className="flex flex-1 flex-col justify-end pb-1">
          <div className="enter-2">
            <h1 className="display-welcome text-balance text-white">Spokój, klasa, przewidywalność.</h1>
            <p className="mt-3 text-[17px] leading-6 text-white/[0.74]">Aplikacja kierowcy RS Moto Taxi</p>
          </div>
          <div className="enter-3 mt-7 space-y-0">
            <Button size="md" onClick={() => setLoginForced(true)}>
              Zaloguj się
            </Button>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center text-[15px] font-medium text-white/80"
              onClick={() => setHelpOpen(true)}
            >
              Problem z logowaniem?
            </button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={loginOpen}
        onClose={closeLogin}
        title="Zaloguj się"
        subtitle="Użyj danych konta kierowcy."
        expanded
        className={shake ? 'animate-shake' : undefined}
      >
        <form onSubmit={onSubmit} className="space-y-4" autoComplete="on" action="#">
          {offline ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] tint-warning px-4 py-3 text-[15px] text-[var(--warning)]">
              Brak połączenia z internetem. Logowanie wymaga sieci.
            </div>
          ) : null}
          <TextField
            label="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError(null)
            }}
            error={emailError}
          />
          <TextField
            label="Hasło"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
          <div className="pt-6">
            <Button type="submit" size="md" disabled={!canSubmit || offline} loading={loading}>
              Zaloguj się
            </Button>
          </div>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center text-[15px] font-medium text-[var(--text-secondary)]"
            onClick={() => {
              setLoginForced(false)
              if (search.get('login')) router.replace('/')
              setHelpOpen(true)
            }}
          >
            Problem z logowaniem?
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Problem z logowaniem?"
        subtitle="Skontaktuj się z koordynatorem floty."
      >
        <div className="space-y-2.5">
          <a
            className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4"
            href="tel:+48508222321"
          >
            <span className="flex size-10 items-center justify-center rounded-full tint-accent">
              <Phone size={20} className="text-[var(--accent)]" strokeWidth={1.9} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] text-[var(--text-secondary)]">Zadzwoń</span>
              <span className="block text-[17px] font-semibold tabular-nums">508 222 321</span>
            </span>
          </a>
          <a
            className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4"
            href="mailto:hello@rsmototaxi.pl"
          >
            <span className="flex size-10 items-center justify-center rounded-full tint-accent">
              <Mail size={20} className="text-[var(--accent)]" strokeWidth={1.9} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] text-[var(--text-secondary)]">Napisz</span>
              <span className="block text-[17px] font-semibold">hello@rsmototaxi.pl</span>
            </span>
          </a>
          <a
            className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4"
            href="https://wa.me/48609999823"
          >
            <span className="flex-1">
              <span className="block text-[15px] text-[var(--text-secondary)]">WhatsApp</span>
              <span className="block text-[17px] font-semibold">Napisz na WhatsApp</span>
            </span>
          </a>
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center text-[16px] font-semibold text-[var(--text-secondary)]"
            onClick={() => setHelpOpen(false)}
          >
            Zamknij
          </button>
        </div>
      </BottomSheet>
    </main>
  )
}

export function WelcomeScreen() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#020407]" />}>
      <WelcomeInner />
    </Suspense>
  )
}
