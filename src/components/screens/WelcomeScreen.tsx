'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/lib/om/AuthProvider'

export function WelcomeScreen() {
  const router = useRouter()
  const { ready, session } = useAuth()
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const parallaxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready && session) router.replace('/loading')
  }, [ready, session, router])

  useEffect(() => {
    if (reduced) return
    const el = parallaxRef.current
    if (!el || !window.DeviceOrientationEvent) return
    const onOrient = (e: DeviceOrientationEvent) => {
      const x = Math.max(-8, Math.min(8, (e.gamma ?? 0) * 0.25))
      const y = Math.max(-8, Math.min(8, (e.beta ?? 0) * 0.12 - 4))
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [reduced])

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020407] text-white">
      <div className="absolute inset-0">
        <div ref={parallaxRef} className="absolute inset-[-12px] will-change-transform">
          <Image
            src="/brand/fleet-hero-green.webp"
            alt=""
            fill
            priority
            className={reduced ? 'object-cover' : 'kenburns object-cover'}
            style={{ objectPosition: '50% 46%' }}
          />
        </div>
        {!reduced ? <div className="headlights" aria-hidden /> : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,4,7,.5) 0%, rgba(2,4,7,0) 20%, rgba(2,4,7,0) 50%, rgba(2,4,7,.88) 67%, #020407 100%)',
          }}
        />
      </div>

      <div
        className="relative z-10 flex min-h-dvh flex-col px-5 max-[390px]:px-5 sm:px-6"
        style={{ paddingTop: 'calc(var(--safe-top) + 16px)', paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <div className="enter-1 mt-2 flex justify-center">
          <Image src="/brand/logo-light.svg" alt="RS Moto Taxi" width={51} height={68} className="h-[68px] w-auto" priority />
        </div>

        <div className="flex flex-1 flex-col justify-end pb-1">
          <div className="enter-2">
            <h1 className="display-welcome text-balance text-white">Spokój, klasa, przewidywalność.</h1>
            <p className="mt-3 text-[17px] leading-6 text-white/[0.74]">Aplikacja kierowcy RS Moto Taxi</p>
          </div>
          <div className="enter-3 mt-7 space-y-0">
            <Button size="md" onClick={() => router.push('/login')}>
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
