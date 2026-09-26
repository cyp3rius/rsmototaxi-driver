'use client'

import { useEffect } from 'react'
import { InstallPrompt } from '@/components/shell/InstallPrompt'
import { syncVisualViewportCssVars, VIEWPORT_SETTLE_EVENT } from '@/lib/visualViewport'

/** Global boot: SW + install gate. Offline banners live only inside authenticated AppShell. */
export function ClientBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register(`/sw.js?v=${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}`)
        .catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    const sync = () => syncVisualViewportCssVars()
    sync()
    const timers = [50, 200, 600, 1500].map((ms) => window.setTimeout(sync, ms))
    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    window.addEventListener(VIEWPORT_SETTLE_EVENT, sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      for (const t of timers) window.clearTimeout(t)
      vv?.removeEventListener('resize', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      window.removeEventListener(VIEWPORT_SETTLE_EVENT, sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return (
    <>
      <InstallPrompt />
      {children}
    </>
  )
}
