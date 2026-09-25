'use client'

import {
  Bell,
  ChevronRight,
  Globe,
  Info,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { useAuth } from '@/lib/om/AuthProvider'
import {
  clearOutbox,
  flushOutbox,
  listOutbox,
  pendingOutboxCount,
  type OutboxItem,
} from '@/lib/offline/outbox'
import { useWebPush } from '@/lib/useWebPush'
import { cn } from '@/lib/cn'

const COORDINATOR_TEL = '+48508222321'

function isStandalone() {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 3) return phone
  return `${digits.slice(-9, -6) || digits.slice(0, 3)} …`
}

function describeOutboxItem(item: OutboxItem): string {
  const payload = item.payload || {}
  if (item.kind === 'createTrip' || item.kind === 'updateTrip') {
    const started = payload.startedAt ? new Date(String(payload.startedAt)) : null
    if (started && !Number.isNaN(started.getTime())) {
      const time = started.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
      return `kurs z ${time}`
    }
    return 'kurs'
  }
  if (item.kind === 'createExpense' || item.kind === 'deleteExpense') return 'paragon'
  if (item.kind === 'location') return 'lokalizacja'
  return 'zapis'
}

function pendingSummary(items: OutboxItem[]) {
  if (items.length === 0) return null
  const labels = items.map(describeOutboxItem)
  const list =
    labels.length === 1
      ? labels[0]
      : labels.length === 2
        ? `${labels[0]} i ${labels[1]}`
        : `${labels.slice(0, -1).join(', ')} i ${labels[labels.length - 1]}`
  const n = items.length
  const verb = n === 1 ? 'zapis czeka' : n < 5 ? 'zapisy czekają' : 'zapisów czeka'
  return `${n} ${verb} na wysłanie: ${list}. Po wylogowaniu zostaną usunięte z telefonu.`
}

type GeoState = 'granted' | 'denied' | 'prompt' | 'unknown'

export function DriverProfileSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { me, session, logout } = useAuth()
  const toast = useToast()
  const push = useWebPush()
  const [geo, setGeo] = useState<GeoState>('unknown')
  const [installed, setInstalled] = useState(true)
  const [pending, setPending] = useState(0)
  const [pendingItems, setPendingItems] = useState<OutboxItem[]>([])
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flushing, setFlushing] = useState(false)

  const refreshPermissions = useCallback(async () => {
    setInstalled(isStandalone())
    try {
      const items = await listOutbox()
      const openItems = items.filter((i) => i.status === 'pending' || i.status === 'error')
      setPendingItems(openItems)
      setPending(openItems.length)
    } catch {
      setPendingItems([])
      setPending(0)
    }
    if (!('permissions' in navigator)) {
      setGeo('unknown')
      return
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      setGeo(status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt')
      status.onchange = () => {
        setGeo(status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt')
      }
    } catch {
      setGeo('unknown')
    }
  }, [])

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setLogoutOpen(false)
        setHelpOpen(false)
      })
      return
    }
    queueMicrotask(() => void refreshPermissions())
  }, [open, refreshPermissions])

  const displayName = (me?.member.displayName || session?.displayName || 'Kierowca').trim()
  const email = session?.email || null
  const phoneMasked = maskPhone(null)
  const subtitle = [email, phoneMasked].filter(Boolean).join(' · ')
  const initials = initialsFromName(displayName)
  const onShift = me?.dashboardState === 'C'
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev'
  const pendingText = useMemo(() => pendingSummary(pendingItems), [pendingItems])

  const notifOn = push.status === 'ready'
  const geoOn = geo === 'granted'

  async function requestGeo() {
    if (!navigator.geolocation) {
      toast.warning('Lokalizacja niedostępna na tym urządzeniu')
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeo('granted')
        toast.success('Lokalizacja włączona')
      },
      () => {
        setGeo('denied')
        setHelpOpen(true)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function requestNotif() {
    const next = await push.requestAccess()
    if (next === 'ready') toast.success('Powiadomienia włączone')
    else toast.warning('Powiadomienia są wyłączone w ustawieniach systemu')
  }

  function openLogout() {
    setLogoutOpen(true)
  }

  async function doLogout() {
    setBusy(true)
    try {
      await clearOutbox().catch(() => undefined)
      await logout()
      onClose()
      router.replace('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się wylogować')
      setBusy(false)
    }
  }

  async function sendFirst() {
    setFlushing(true)
    try {
      const result = await flushOutbox()
      await refreshPermissions()
      const left = await pendingOutboxCount()
      if (left === 0) {
        toast.success('Wszystko wysłane')
        setLogoutOpen(false)
      } else if (result.ok > 0) {
        toast.warning(`Wysłano ${result.ok}, pozostało ${left}`)
      } else {
        toast.error('Nie udało się wysłać zapisów. Sprawdź połączenie.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Synchronizacja nie powiodła się')
    } finally {
      setFlushing(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} expanded>
        <div className="relative">
          <button
            type="button"
            aria-label="Zamknij"
            onClick={onClose}
            className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-full bg-[var(--bg-surface-raised)]"
          >
            <X size={18} strokeWidth={2.2} />
          </button>

          <div className="flex items-start gap-3.5 pr-14">
            <span className="flex size-14 flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-[18px] font-[600] text-[var(--accent)]">
              {initials}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-[20px] font-[600] leading-6">{displayName}</p>
              {subtitle ? (
                <p className="mt-1 truncate text-[15px] text-[var(--text-secondary)]">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <section className="mt-6">
            <p className="mb-2 px-1 text-[13px] font-[600] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
              Uprawnienia
            </p>
            <div className="overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
              <PermissionRow
                icon={<MapPin size={20} strokeWidth={1.9} />}
                label="Lokalizacja"
                status={geoOn ? 'Włączona' : 'Wyłączona'}
                ok={geoOn}
                onClick={() => (geoOn ? undefined : void requestGeo())}
              />
              {!geoOn ? (
                <div className="border-t border-[var(--separator)] px-4 pb-4 pt-3">
                  <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
                    Bez lokalizacji nie liczymy dystansu zmiany. Ustawienia →{' '}
                    {isIos() ? 'Safari' : 'przeglądarka'} → Lokalizacja → Pozwalaj.
                  </p>
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    className="mt-3 flex h-12 w-full items-center justify-center rounded-[14px] bg-[var(--bg-surface-raised)] text-[16px] font-[600]"
                  >
                    Pokaż instrukcję
                  </button>
                </div>
              ) : null}
              <PermissionRow
                icon={<Bell size={20} strokeWidth={1.9} />}
                label="Powiadomienia"
                status={notifOn ? 'Włączona' : 'Wyłączona'}
                ok={notifOn}
                onClick={() => (notifOn ? undefined : void requestNotif())}
                divider
              />
              <PermissionRow
                icon={<Smartphone size={20} strokeWidth={1.9} />}
                label="Ekran początkowy"
                status={installed ? 'Zainstalowana' : 'Nie zainstalowana'}
                ok={installed}
                divider
              />
            </div>
          </section>

          <section className="mt-5">
            <p className="mb-2 px-1 text-[13px] font-[600] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
              Aplikacja
            </p>
            <div className="overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
              <AppRow
                icon={<Globe size={20} strokeWidth={1.9} />}
                label="Język"
                value="Polski"
                chevron
              />
              <AppRow
                icon={<RefreshCw size={20} strokeWidth={1.9} />}
                label="Synchronizacja"
                value={pending === 0 ? 'Wszystko wysłane' : `${pending} do wysłania`}
                onClick={
                  pending > 0
                    ? () => {
                        void sendFirst()
                      }
                    : undefined
                }
                divider
              />
              <AppRow
                icon={<Phone size={20} strokeWidth={1.9} />}
                label="Kontakt z koordynatorem"
                chevron
                onClick={() => {
                  window.location.href = `tel:${COORDINATOR_TEL}`
                }}
                divider
              />
              <AppRow
                icon={<Info size={20} strokeWidth={1.9} />}
                label="Wersja"
                value={`${version} · aktualna`}
                divider
              />
            </div>
          </section>

          <button
            type="button"
            onClick={openLogout}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] text-[17px] font-[600] text-[var(--danger)]"
          >
            <LogOut size={18} strokeWidth={2} />
            Wyloguj się
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Jak włączyć lokalizację"
        zClassName="z-[55]"
      >
        <div className="space-y-3 text-[16px] leading-6 text-[var(--text-secondary)]">
          {isIos() ? (
            <>
              <p>1. Otwórz Ustawienia na iPhonie.</p>
              <p>2. Przewiń do Safari (albo do ikony aplikacji, jeśli jest zainstalowana).</p>
              <p>3. Lokalizacja → Pozwalaj / Podczas używania aplikacji.</p>
              <p>4. Wróć tutaj i odśwież status.</p>
            </>
          ) : (
            <>
              <p>1. Ikona kłódki / informacji przy adresie strony.</p>
              <p>2. Uprawnienia → Lokalizacja → Zezwalaj.</p>
              <p>3. Wróć do aplikacji i odśwież.</p>
            </>
          )}
          <Button
            className="mt-2"
            onClick={() => {
              setHelpOpen(false)
              void requestGeo()
            }}
          >
            Sprawdź ponownie
          </Button>
          <Button variant="secondary" onClick={() => setHelpOpen(false)}>
            Zamknij
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Wylogować się?"
        zClassName="z-[60]"
      >
        <p className="text-[16px] leading-6 text-[var(--text-secondary)]">
          {onShift
            ? 'Zmiana nadal trwa. Wylogowanie jej nie kończy.'
            : 'Zostaniesz wylogowany z tego urządzenia.'}
        </p>

        {pendingText ? (
          <div className="mt-4 flex gap-3 rounded-[16px] tint-warning px-3.5 py-3">
            <RefreshCw size={20} className="mt-0.5 flex-none text-[var(--warning)]" strokeWidth={2} />
            <p className="text-[15px] leading-5 text-[var(--warning)]">{pendingText}</p>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {pending > 0 ? (
            <Button variant="secondary" size="md" loading={flushing} onClick={() => void sendFirst()}>
              Najpierw wyślij
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={() => setLogoutOpen(false)}>
              Anuluj
            </Button>
          )}
          <Button
            variant="danger"
            size="md"
            loading={busy}
            onClick={() => void doLogout()}
          >
            {pending > 0 ? 'Wyloguj mimo to' : 'Wyloguj się'}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

function PermissionRow({
  icon,
  label,
  status,
  ok,
  onClick,
  divider,
}: {
  icon: ReactNode
  label: string
  status: string
  ok: boolean
  onClick?: () => void
  divider?: boolean
}) {
  const className = cn(
    'flex w-full items-center gap-3 px-4 py-3.5 text-left',
    divider ? 'border-t border-[var(--separator)]' : '',
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <span className="text-[var(--text-secondary)]">{icon}</span>
        <span className="flex-1 text-[16px] font-[500]">{label}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[15px] font-[500]',
            ok ? 'text-[var(--success)]' : 'text-[var(--danger)]',
          )}
        >
          <span className={cn('size-1.5 rounded-full', ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')} />
          {status}
        </span>
      </button>
    )
  }
  return (
    <div className={className}>
      <span className="text-[var(--text-secondary)]">{icon}</span>
      <span className="flex-1 text-[16px] font-[500]">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[15px] font-[500]',
          ok ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        )}
      >
        <span className={cn('size-1.5 rounded-full', ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')} />
        {status}
      </span>
    </div>
  )
}

function AppRow({
  icon,
  label,
  value,
  chevron,
  onClick,
  divider,
}: {
  icon: ReactNode
  label: string
  value?: string
  chevron?: boolean
  onClick?: () => void
  divider?: boolean
}) {
  const className = cn(
    'flex w-full items-center gap-3 px-4 py-3.5 text-left',
    divider ? 'border-t border-[var(--separator)]' : '',
  )
  const body = (
    <>
      <span className="text-[var(--text-secondary)]">{icon}</span>
      <span className="flex-1 text-[16px] font-[500]">{label}</span>
      {value ? <span className="text-[15px] text-[var(--text-secondary)]">{value}</span> : null}
      {chevron ? <ChevronRight size={18} className="text-[var(--text-tertiary)]" strokeWidth={2} /> : null}
    </>
  )
  if (onClick || chevron) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}
