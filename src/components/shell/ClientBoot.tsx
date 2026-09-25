'use client'

import { useEffect } from 'react'
import { InstallPrompt } from '@/components/shell/InstallPrompt'
import { OfflineBanner } from '@/components/shell/OfflineBanner'

export function ClientBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}`).catch(() => undefined)
    }
  }, [])

  return (
    <>
      <InstallPrompt />
      <OfflineBanner />
      {children}
    </>
  )
}
