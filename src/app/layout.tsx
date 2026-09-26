import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/om/AuthProvider'
import { ThemeProvider } from '@/lib/theme'
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

const APP_NAME = 'RS Moto Taxi - Kierowca'
const APP_DESCRIPTION = 'Zmiany, kursy, koszty i wypłaty kierowcy RS Moto Taxi.'

/** iOS apple-touch-startup-image entries from PWA asset pack (light + dark). */
const startupImages: Array<{ url: string; media: string }> = [
  // iPhone 16 Pro Max
  {
    url: '/pwa/splash/splash-1320x2868-light.png',
    media:
      '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1320x2868-dark.png',
    media:
      '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 16 Pro
  {
    url: '/pwa/splash/splash-1206x2622-light.png',
    media:
      '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1206x2622-dark.png',
    media:
      '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 14/15 Pro Max, 15/16 Plus
  {
    url: '/pwa/splash/splash-1290x2796-light.png',
    media:
      '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1290x2796-dark.png',
    media:
      '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 14 Pro, 15, 15 Pro, 16
  {
    url: '/pwa/splash/splash-1179x2556-light.png',
    media:
      '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1179x2556-dark.png',
    media:
      '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 12/13 Pro Max, 14 Plus
  {
    url: '/pwa/splash/splash-1284x2778-light.png',
    media:
      '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1284x2778-dark.png',
    media:
      '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 12, 13, 14, 12/13 Pro
  {
    url: '/pwa/splash/splash-1170x2532-light.png',
    media:
      '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1170x2532-dark.png',
    media:
      '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone 12/13 mini
  {
    url: '/pwa/splash/splash-1080x2340-light.png',
    media:
      '(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1080x2340-dark.png',
    media:
      '(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone X, XS, 11 Pro
  {
    url: '/pwa/splash/splash-1125x2436-light.png',
    media:
      '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1125x2436-dark.png',
    media:
      '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone XS Max, 11 Pro Max
  {
    url: '/pwa/splash/splash-1242x2688-light.png',
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-1242x2688-dark.png',
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
  },
  // iPhone XR, 11
  {
    url: '/pwa/splash/splash-828x1792-light.png',
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-828x1792-dark.png',
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
  },
  // iPhone SE 2/3, 8
  {
    url: '/pwa/splash/splash-750x1334-light.png',
    media:
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)',
  },
  {
    url: '/pwa/splash/splash-750x1334-dark.png',
    media:
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
  },
]

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
    startupImage: startupImages,
  },
  icons: {
    icon: [
      { url: '/pwa/favicon.ico', sizes: '48x48' },
      { url: '/pwa/favicon.svg', type: 'image/svg+xml' },
      { url: '/pwa/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/pwa/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/pwa/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7F9' },
    { media: '(prefers-color-scheme: dark)', color: '#020407' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${archivo.variable} h-full bg-[var(--bg-base)]`}>
      <body className="mx-auto min-h-dvh max-w-[430px] bg-[var(--bg-base)] antialiased shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <StartShiftProvider>
                <ClientBoot>
                  <SplashGate>{children}</SplashGate>
                </ClientBoot>
              </StartShiftProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
