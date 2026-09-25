'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BellOff,
  ChevronRight,
  CloudOff,
  Eye,
  Navigation,
  RefreshCw,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { flushOutbox, pendingOutboxCount } from '@/lib/offline/outbox'
import { tripPickupLabel } from '@/lib/tripMeta'
import { useWebPush } from '@/lib/useWebPush'

type Tone = 'accent' | 'danger' | 'warning' | 'neutral' | 'filled'

type BannerItem = {
  key: string
  tone: Tone
  icon: LucideIcon
  title: string
  text?: string
  action?: string
  chip: string
  chevron?: boolean
  href?: string
  onAction?: () => void
}

type BannerCtx = {
  primary: BannerItem | null
  chips: BannerItem[]
}

const TONE_FG: Record<Exclude<Tone, 'filled'>, string> = {
  accent: 'var(--accent)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  neutral: 'var(--text-secondary)',
}

function toneColor(tone: Tone): string {
  if (tone === 'filled') return 'var(--accent)'
  return TONE_FG[tone]
}

const SystemBannerContext = createContext<BannerCtx | null>(null)

function formatElapsed(startedAt: string | null | undefined) {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  if (!Number.isFinite(start)) return null
  const sec = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function useBannerState(): BannerCtx {
  const { me, refreshMe } = useAuth()
  const push = useWebPush()
  const [online, setOnline] = useState(true)
  const [geoDenied, setGeoDenied] = useState(false)
  const [syncCount, setSyncCount] = useState(0)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)

  useEffect(() => {
    const syncOnline = () => {
      const on = navigator.onLine
      setOnline(on)
      if (on) {
        void flushOutbox().then(() => pendingOutboxCount().then(setSyncCount))
      } else {
        setCachedAt(
          new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        )
      }
    }
    syncOnline()
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)
    return () => {
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
    }
  }, [])

  useEffect(() => {
    if (!('permissions' in navigator)) return
    void navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        setGeoDenied(status.state === 'denied')
        status.onchange = () => setGeoDenied(status.state === 'denied')
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    void pendingOutboxCount().then(setSyncCount).catch(() => setSyncCount(0))
    const id = window.setInterval(() => {
      void pendingOutboxCount().then(setSyncCount).catch(() => setSyncCount(0))
    }, 8000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!me?.liveTrip) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [me?.liveTrip])

  return useMemo(() => {
    const items: BannerItem[] = []
    void liveTick

    if (me?.impersonation?.active) {
      items.push({
        key: 'impersonation',
        tone: 'accent',
        icon: Eye,
        title: 'Podgląd tylko do odczytu',
        text: `Operator: ${me.impersonation.displayName || '—'}. Zmiany są wyłączone.`,
        action: 'Zakończ',
        chip: 'Podgląd',
        onAction: () => {
          void omClient.endImpersonation().then(() => refreshMe())
        },
      })
    }

    if (me?.liveTrip && me.dashboardState === 'C') {
      const started = String(me.liveTrip.startedAt || '')
      const elapsed = formatElapsed(started)
      const place = tripPickupLabel(me.liveTrip as Record<string, unknown>)
      const when = started
        ? new Date(started).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null
      items.push({
        key: 'live',
        tone: 'filled',
        icon: Zap,
        title: elapsed ? `Kurs live w trakcie · ${elapsed}` : 'Kurs live w trakcie',
        text:
          [when ? `Od ${when}` : null, place].filter(Boolean).join(', ') ||
          'Wróć do kursu, żeby śledzić GPS.',
        chip: 'Kurs live',
        chevron: true,
        href: '/app/trips/live',
      })
    }

    if (geoDenied && me?.dashboardState === 'C') {
      items.push({
        key: 'gps',
        tone: 'danger',
        icon: Navigation,
        title: 'Włącz lokalizację',
        text: 'Bez niej nie policzymy kilometrów zmiany.',
        action: 'Włącz',
        chip: 'GPS wył.',
        onAction: () => {
          if (!navigator.geolocation) return
          navigator.geolocation.getCurrentPosition(
            () => setGeoDenied(false),
            () => setGeoDenied(true),
            { enableHighAccuracy: true, timeout: 8000 },
          )
        },
      })
    }

    if (push.showConsentBanner) {
      items.push({
        key: 'push',
        tone: 'warning',
        icon: Bell,
        title: 'Powiadomienia wyłączone',
        text: 'Nie zobaczysz nowego kursu ani przypomnienia godzinę przed.',
        action: 'Włącz',
        chip: 'Powiadomienia',
        onAction: () => {
          void push.requestAccess()
        },
      })
    } else if (push.status === 'denied') {
      items.push({
        key: 'push',
        tone: 'warning',
        icon: BellOff,
        title: 'Powiadomienia wyłączone',
        text: 'Nie zobaczysz nowego kursu ani przypomnienia godzinę przed.',
        chip: 'Powiadomienia',
      })
    }

    if (!online) {
      items.push({
        key: 'offline',
        tone: 'warning',
        icon: CloudOff,
        title: `Tryb offline. Dane z ${cachedAt || 'pamięci'}.`,
        text: 'Zmiany zapiszą się i zsynchronizują po połączeniu.',
        chip: 'Offline',
      })
    }

    if (syncCount > 0) {
      items.push({
        key: 'sync',
        tone: 'neutral',
        icon: RefreshCw,
        title:
          syncCount === 1
            ? '1 zmiana czeka na synchronizację'
            : `${syncCount} zmiany czekają na synchronizację`,
        action: 'Synchronizuj',
        chip: `${syncCount} do synchronizacji`,
        onAction: () => {
          void flushOutbox().then(() => pendingOutboxCount().then(setSyncCount))
        },
      })
    }

    return { primary: items[0] ?? null, chips: items.slice(1) }
  }, [me, refreshMe, geoDenied, push, online, cachedAt, syncCount, liveTick])
}

export function SystemBannerProvider({ children }: { children: ReactNode }) {
  const value = useBannerState()
  return <SystemBannerContext.Provider value={value}>{children}</SystemBannerContext.Provider>
}

function useBannerCtx() {
  const ctx = useContext(SystemBannerContext)
  if (!ctx) throw new Error('SystemBannerProvider required')
  return ctx
}

function PrimaryBannerCard({ item }: { item: BannerItem }) {
  const Icon = item.icon
  const filled = item.tone === 'filled'
  const fg = filled ? null : toneColor(item.tone)
  const style = filled
    ? { background: 'var(--accent)', color: 'var(--accent-on)' }
    : {
        color: fg!,
        background:
          item.tone === 'neutral'
            ? 'var(--bg-surface-raised)'
            : `color-mix(in srgb, ${fg} 12%, var(--bg-surface))`,
        border:
          item.tone === 'neutral'
            ? '1px solid var(--separator)'
            : `1px solid color-mix(in srgb, ${fg} 30%, transparent)`,
      }

  const inner = (
    <>
      <Icon size={22} strokeWidth={1.9} className="flex-none" />
      <div className="min-w-0 flex-1">
        <div
          className="text-[16px] font-semibold leading-[21px]"
          style={{ color: filled ? 'var(--accent-on)' : 'var(--text-primary)' }}
        >
          {item.title}
        </div>
        {item.text ? (
          <div
            className="text-[15px] leading-5"
            style={{
              color: filled ? 'var(--accent-on)' : 'var(--text-secondary)',
              opacity: filled ? 0.85 : 1,
            }}
          >
            {item.text}
          </div>
        ) : null}
      </div>
      {item.action && item.onAction ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            item.onAction?.()
          }}
          className="flex h-11 flex-none items-center rounded-full border border-[var(--separator)] bg-[var(--bg-surface)] px-4 text-[15px] font-semibold text-[var(--text-primary)]"
        >
          {item.action}
        </button>
      ) : item.action ? (
        <span className="flex h-11 flex-none items-center rounded-full border border-[var(--separator)] bg-[var(--bg-surface)] px-4 text-[15px] font-semibold text-[var(--text-primary)]">
          {item.action}
        </span>
      ) : null}
      {item.chevron ? <ChevronRight size={20} strokeWidth={2} className="flex-none opacity-90" /> : null}
    </>
  )

  const className =
    'flex min-h-16 items-center gap-3 rounded-[18px] py-2.5 pl-4 box-border ' +
    (item.action ? 'pr-2.5' : 'pr-3.5')

  if (item.href) {
    return (
      <Link href={item.href} className={className} style={style}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}

/** Chips under dashboard header. */
export function SystemBannerChips() {
  const { chips } = useBannerCtx()
  const router = useRouter()
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 pb-2.5">
      {chips.map((chip) => {
        const Icon = chip.icon
        const fg = toneColor(chip.tone)
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => {
              if (chip.onAction) chip.onAction()
              else if (chip.href) router.push(chip.href)
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[15px] font-medium"
            style={{
              color: fg,
              background:
                chip.tone === 'neutral'
                  ? 'var(--bg-surface-raised)'
                  : `color-mix(in srgb, ${fg} 13%, transparent)`,
            }}
          >
            <Icon size={16} strokeWidth={2} />
            {chip.chip}
          </button>
        )
      })}
    </div>
  )
}

/** Primary banner — first item in dashboard content. */
export function SystemBannerPrimary() {
  const { primary } = useBannerCtx()
  if (!primary) return null
  return <PrimaryBannerCard item={primary} />
}

/** Non-dashboard: banners live in page headers later; dashboard uses chips + primary slots. */
export function SystemBanners() {
  return null
}
