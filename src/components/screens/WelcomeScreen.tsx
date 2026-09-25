'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/om/AuthProvider'

export function WelcomeScreen() {
  const router = useRouter()
  const { ready, session } = useAuth()
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (ready && session) router.replace('/app')
  }, [ready, session, router])

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020407] text-white">
      <div className="absolute inset-0">
        <Image
          src="/brand/fleet-hero-green.webp"
          alt=""
          fill
          priority
          className={reduced ? 'object-cover' : 'kenburns object-cover'}
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020407] via-[#020407]/85 to-[#020407]/40" />
        {!reduced ? <div className="headlights" aria-hidden /> : null}
      </div>

      <div
        className="relative z-10 flex min-h-dvh flex-col px-5"
        style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      >
        <div className="enter-1 mt-8 flex justify-center">
          <Image src="/brand/logo-light.svg" alt="RS Moto Taxi" width={160} height={48} />
        </div>
        <div className="flex flex-1 flex-col justify-end pb-4">
          <p className="enter-2 display-l max-w-[16ch]">Spokój. Klasa. Przewidywalność.</p>
          <p className="enter-2 mt-3 text-[17px] text-white/80">Aplikacja kierowcy floty RS Moto Taxi.</p>
          <div className="enter-3 mt-8 space-y-2">
            <Button onClick={() => router.push('/login')}>Zaloguj się</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
