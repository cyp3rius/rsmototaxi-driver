'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/lib/om/AuthProvider'
import { OmApiError } from '@/lib/om/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    const remembered = localStorage.getItem('rs-driver-email')
    if (remembered) queueMicrotask(() => setEmail(remembered))
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const canSubmit = useMemo(() => EMAIL_RE.test(email.trim()) && password.length > 0, [email, password])

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
      let message = 'Nieprawidłowy e-mail lub hasło. Sprawdź dane albo skontaktuj się z koordynatorem.'
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

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020407]">
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          <Image
            src="/brand/fleet-hero-green.webp"
            alt=""
            fill
            className="scale-110 object-cover brightness-[0.55] blur-[10px]"
            style={{ objectPosition: '50% 46%' }}
          />
        </div>
        <div className="absolute inset-0 bg-[#020407]/35" />
      </div>

      <BottomSheet
        open
        onClose={() => router.push('/')}
        title="Zaloguj się"
        subtitle="Użyj danych konta kierowcy."
        className={shake ? 'animate-shake max-[390px]:!max-h-[100dvh]' : 'max-[390px]:!max-h-[100dvh]'}
      >
        <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
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
          <div className="pt-2">
            <Button type="submit" size="md" disabled={!canSubmit || offline} loading={loading}>
              Zaloguj się
            </Button>
          </div>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center text-[15px] font-medium text-[var(--text-secondary)]"
            onClick={() => setHelpOpen(true)}
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
          <a className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4" href="tel:+48508222321">
            <span className="flex size-10 items-center justify-center rounded-full tint-accent">
              <Phone size={20} className="text-[var(--accent)]" strokeWidth={1.9} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] text-[var(--text-secondary)]">Zadzwoń</span>
              <span className="block text-[17px] font-semibold tabular-nums">508 222 321</span>
            </span>
          </a>
          <a className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4" href="mailto:hello@rsmototaxi.pl">
            <span className="flex size-10 items-center justify-center rounded-full tint-accent">
              <Mail size={20} className="text-[var(--accent)]" strokeWidth={1.9} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] text-[var(--text-secondary)]">Napisz</span>
              <span className="block text-[17px] font-semibold">hello@rsmototaxi.pl</span>
            </span>
          </a>
          <a className="flex min-h-16 items-center gap-3.5 rounded-2xl bg-[var(--bg-surface-raised)] px-4" href="https://wa.me/48609999823">
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
