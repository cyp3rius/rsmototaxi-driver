'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/om/AuthProvider'

/**
 * Native-feeling boot splash: always brand #020407 + centered logo.
 * Held until auth hydrate + destination paints (5.1 welcome or themed 5.3–5.4).
 * Splash stays black; wow/dashboard then use the active theme tokens.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [minDone, setMinDone] = useState(false)
  const [gone, setGone] = useState(false)

  const onAuthGate = pathname === '/' || pathname === '/login'
  const onWow = pathname === '/loading'
  const holdForSession = ready && Boolean(session) && onAuthGate
  /** Destination must be painted (wow or welcome) before we lift the splash. */
  const destinationReady = ready && minDone && !holdForSession && (!session || onWow)
  const splashUp = !gone

  useEffect(() => {
    const t = window.setTimeout(() => setMinDone(true), 480)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!holdForSession) return
    router.replace('/loading')
  }, [holdForSession, router])

  useEffect(() => {
    if (!destinationReady || gone) return
    // One frame for /loading (or welcome) to paint under the splash, then drop.
    let cancelled = false
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setGone(true)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [destinationReady, gone])

  useEffect(() => {
    const root = document.documentElement
    if (splashUp) root.classList.add('rs-splash-active')
    else root.classList.remove('rs-splash-active')
    return () => root.classList.remove('rs-splash-active')
  }, [splashUp])

  return (
    <>
      {children}
      {splashUp ? (
        <div
          aria-hidden
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020407]"
          style={{
            inset: 0,
            width: '100%',
            height: '100dvh',
            minHeight: '100vh',
          }}
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
