'use client'

import { Bell, BellOff, CloudOff, Eye, MapPinOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/om/AuthProvider'
import { omClient } from '@/lib/om/client'
import { flushOutbox, pendingOutboxCount } from '@/lib/offline/outbox'
import { useWebPush } from '@/lib/useWebPush'

export function SystemBanners() {
  const { me, refreshMe } = useAuth()
  const push = useWebPush()
  const [online, setOnline] = useState(true)
  const [geoDenied, setGeoDenied] = useState(false)
  const [syncCount, setSyncCount] = useState(0)

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine)
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

  type Chip = {
    key: string
    label: string
    icon: typeof Eye
    tone: string
    onClick?: () => void
  }

  const chips: Chip[] = []
  let primary: {
    key: string
    title: string
    body: string
    tone: string
    actionLabel?: string
    onAction?: () => void
  } | null = null

  if (me?.impersonation?.active) {
    primary = {
      key: 'imp',
      title: 'Podgląd kierowcy',
      body: me.impersonation.displayName
        ? `Przeglądasz konto: ${me.impersonation.displayName}`
        : 'Tryb podglądu — zmiany mogą być ograniczone.',
      tone: 'tint-accent text-[var(--accent)]',
      actionLabel: 'Zakończ podgląd',
      onAction: () => {
        void omClient.endImpersonation().then(() => refreshMe())
      },
    }
  } else if (!online) {
    primary = {
      key: 'offline',
      title: 'Jesteś offline',
      body: 'Zmiany zapiszą się lokalnie i wyślemy je po połączeniu.',
      tone: 'tint-warning text-[var(--warning)]',
    }
  } else if (geoDenied && me?.dashboardState === 'C') {
    primary = {
      key: 'gps',
      title: 'GPS wyłączony',
      body: 'Włącz lokalizację, żeby śledzić kurs live i dystans zmiany.',
      tone: 'tint-danger text-[var(--danger)]',
    }
  } else if (push.showConsentBanner) {
    primary = {
      key: 'push-consent',
      title: 'Włącz powiadomienia',
      body: 'Dostaniesz alert o nowym kursie i komunikatach floty.',
      tone: 'tint-accent text-[var(--accent)]',
      actionLabel: 'Włącz',
      onAction: () => {
        void push.requestAccess()
      },
    }
  } else if (push.status === 'denied') {
    chips.push({
      key: 'push',
      label: 'Powiadomienia',
      icon: BellOff,
      tone: 'text-[var(--warning)] tint-warning',
    })
  }

  if (me?.impersonation?.active && !online) {
    chips.push({ key: 'offline', label: 'Offline', icon: CloudOff, tone: 'text-[var(--warning)] tint-warning' })
  }
  if (primary?.key !== 'gps' && geoDenied && me?.dashboardState === 'C') {
    chips.push({ key: 'gps', label: 'GPS wył.', icon: MapPinOff, tone: 'text-[var(--danger)] tint-danger' })
  }
  if (primary?.key !== 'push-consent' && push.status === 'prompt' && push.configured) {
    chips.push({
      key: 'push-chip',
      label: 'Powiadomienia',
      icon: Bell,
      tone: 'text-[var(--accent)] tint-accent',
      onClick: () => {
        void push.requestAccess()
      },
    })
  }
  if (syncCount > 0) {
    chips.push({
      key: 'sync',
      label: `${syncCount} do synchronizacji`,
      icon: RefreshCw,
      tone: 'text-[var(--text-secondary)] bg-[var(--bg-surface-raised)]',
      onClick: () => {
        void flushOutbox().then(() => pendingOutboxCount().then(setSyncCount))
      },
    })
  }

  if (!primary && chips.length === 0) return null

  return (
    <div className="space-y-2 px-5 pb-2.5">
      {primary ? (
        <div className={`rounded-[18px] px-4 py-3.5 ${primary.tone}`}>
          <p className="text-[16px] font-semibold text-[var(--text-primary)]">{primary.title}</p>
          <p className="mt-1 text-[15px] leading-[21px] text-[var(--text-secondary)]">{primary.body}</p>
          {primary.actionLabel && primary.onAction ? (
            <button
              type="button"
              onClick={primary.onAction}
              className="mt-3 inline-flex h-10 items-center rounded-full bg-[var(--bg-surface)] px-4 text-[15px] font-semibold text-[var(--text-primary)]"
            >
              {primary.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const Icon = chip.icon
            return (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClick}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[15px] font-medium ${chip.tone}`}
              >
                <Icon size={16} strokeWidth={2} />
                {chip.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
