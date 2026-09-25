'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/om/AuthProvider'

/**
 * Native-feeling boot splash: #020407 + centered logo (matches apple-touch-startup-image).
 * Shown until auth hydrate completes. For an existing session on `/`, stays up until we leave
 * the auth gate — so 5.1 never flashes before 5.3–5.4.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [minDone, setMinDone] = useState(false)
  const [gone, setGone] = useState(false)

  const onAuthGate = pathname === '/' || pathname === '/login'
  const holdForSession = ready && Boolean(session) && onAuthGate
  const canReveal = ready && minDone && !holdForSession
  const fade = canReveal && !gone

  useEffect(() => {
    const t = window.setTimeout(() => setMinDone(true), 480)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!holdForSession) return
    router.replace('/loading')
  }, [holdForSession, router])

  useEffect(() => {
    if (!canReveal || gone) return
    const t = window.setTimeout(() => setGone(true), 280)
    return () => window.clearTimeout(t)
  }, [canReveal, gone])

  return (
    <>
      {children}
      {!gone ? (
        <div
          aria-hidden
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#020407] transition-opacity duration-300 ${
            fade ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Image
            src="/brand/logo-light.svg"
            alt=""
            width={120}
            height={160}
            priority
            className="h-auto w-[120px]"
          />
        </div>
      ) : null}
    </>
  )
}
