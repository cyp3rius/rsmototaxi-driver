'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/lib/om/AuthProvider'
import { OmApiError } from '@/lib/om/client'

export function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shake, setShake] = useState(false)

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length > 0, [email, password])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      router.replace('/loading')
    } catch (err) {
      const message = err instanceof OmApiError ? err.message : 'Nie udało się zalogować. Sprawdź dane.'
      setError(message)
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020407]">
      <div className="absolute inset-0">
        <Image
          src="/brand/fleet-hero-green.webp"
          alt=""
          fill
          className="object-cover brightness-[0.55] blur-[10px] scale-110"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-[#020407]/45" />
      </div>

      <BottomSheet
        open
        onClose={() => router.push('/')}
        title="Zaloguj się"
        subtitle="Konto floty z dostępem kierowcy."
        className={shake ? 'animate-shake' : undefined}
      >
        <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
          <TextField
            label="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && !password ? error : null}
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
            <Button type="submit" disabled={!canSubmit} loading={loading}>
              Zaloguj się
            </Button>
          </div>
          <button
            type="button"
            className="w-full py-2 text-center text-[15px] text-[var(--text-secondary)]"
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
        <div className="space-y-3 text-[17px]">
          <a className="block font-medium text-[var(--accent)]" href="tel:+48508222321">
            508 222 321
          </a>
          <a className="block font-medium text-[var(--accent)]" href="mailto:hello@rsmototaxi.pl">
            hello@rsmototaxi.pl
          </a>
          <a className="block font-medium text-[var(--accent)]" href="https://wa.me/48609999823">
            WhatsApp
          </a>
        </div>
      </BottomSheet>
    </main>
  )
}
