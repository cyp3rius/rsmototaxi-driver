'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/om/AuthProvider'

/**
 * Native-feeling boot splash: #020407 + centered logo (matches apple-touch-startup-image).
 * Shown until auth hydrate completes; then children render (welcome / app).
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth()
  const [minDone, setMinDone] = useState(false)
  const [gone, setGone] = useState(false)
  const fade = ready && minDone && !gone

  useEffect(() => {
    const t = window.setTimeout(() => setMinDone(true), 480)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready || !minDone || gone) return
    const t = window.setTimeout(() => setGone(true), 280)
    return () => window.clearTimeout(t)
  }, [ready, minDone, gone])

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
