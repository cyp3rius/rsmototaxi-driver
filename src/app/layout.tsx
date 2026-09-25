import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/om/AuthProvider'
import { SplashGate } from '@/components/shell/SplashGate'
import { ClientBoot } from '@/components/shell/ClientBoot'
import { StartShiftProvider } from '@/components/ui/StartShiftProvider'
import { ToastProvider } from '@/components/ui/toast/ToastProvider'

const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RS Moto Taxi — Kierowca',
  description: 'Aplikacja kierowcy RS Moto Taxi',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RS Driver',
    startupImage: [
      {
        url: '/brand/splash/splash-dark-1290x2796.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/brand/splash/splash-dark-1179x2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/brand/splash/splash-dark-1170x2532.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/brand/splash/splash-dark-1284x2778.png',
        media:
          '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/brand/splash/splash-dark-1125x2436.png',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/brand/splash/splash-dark-750x1334.png',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  icons: {
    apple: '/brand/logo-rs-moto-taxi.svg',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#020407' },
    { media: '(prefers-color-scheme: dark)', color: '#020407' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${archivo.variable} h-full bg-[#020407]`}>
      <body className="mx-auto min-h-dvh max-w-[430px] bg-[var(--bg-base)] antialiased shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <AuthProvider>
          <ToastProvider>
            <StartShiftProvider>
              <ClientBoot>
                <SplashGate>{children}</SplashGate>
              </ClientBoot>
            </StartShiftProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
