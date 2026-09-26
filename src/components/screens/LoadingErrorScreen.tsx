'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type LoadingErrorKind = 'timeout' | 'offline'

type LoadingErrorScreenProps = {
  kind: LoadingErrorKind
  /** When set, timeout screen offers opening cached data (design loadErr). */
  cacheSavedAtLabel?: string | null
  onRetry: () => void
  onOpenCache?: () => void
  onLogout?: () => void
}

/**
 * Design 5.3 loading errors — 1:1 with DriverFlows `loadErr` / `noCache`.
 */
export function LoadingErrorScreen({
  kind,
  cacheSavedAtLabel,
  onRetry,
  onOpenCache,
  onLogout,
}: LoadingErrorScreenProps) {
  const isOfflineNoCache = kind === 'offline'
  const showCacheAction = kind === 'timeout' && Boolean(onOpenCache)

  const title = isOfflineNoCache ? 'Brak połączenia' : 'Nie udało się pobrać zleceń'
  const body = isOfflineNoCache
    ? 'Brak zapisanego profilu na tym urządzeniu. Połącz się raz, żeby pobrać pojazdy i dane zmian.'
    : cacheSavedAtLabel
      ? `Ładowanie trwa ponad 15 sekund. Sprawdź połączenie albo pracuj na danych zapisanych dziś o ${cacheSavedAtLabel}.`
      : 'Ładowanie trwa ponad 15 sekund. Sprawdź połączenie albo spróbuj ponownie.'

  return (
    <main
      className="flex min-h-dvh flex-col justify-center bg-[var(--bg-base)]"
      style={{
        paddingLeft: 28,
        paddingRight: 28,
        paddingBottom: 60,
        paddingTop: 'var(--safe-top)',
      }}
    >
      <span
        className="flex size-16 items-center justify-center rounded-[20px] text-[var(--warning)]"
        style={{
          background: 'color-mix(in srgb, var(--warning) 14%, transparent)',
        }}
      >
        <WifiOff size={30} strokeWidth={1.8} />
      </span>

      <h1
        className="mt-6 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-9 text-[var(--text-primary)]"
        style={{ fontStretch: '115%' }}
      >
        {title}
      </h1>

      <p className="mt-2.5 text-[17px] leading-6 text-[var(--text-secondary)]">{body}</p>

      <div className="mt-6 flex flex-col">
        <Button size="lg" onClick={onRetry}>
          Spróbuj ponownie
        </Button>

        {showCacheAction ? (
          <Button
            variant="secondary"
            size="md"
            className="mt-2 !h-14 border border-[var(--separator)] bg-transparent text-[17px] font-medium"
            onClick={onOpenCache}
          >
            Otwórz dane z pamięci
          </Button>
        ) : null}

        {isOfflineNoCache && onLogout ? (
          <button
            type="button"
            className="mt-2 flex h-14 w-full items-center justify-center text-[16px] font-medium text-[var(--text-secondary)]"
            onClick={onLogout}
          >
            Wyloguj się
          </button>
        ) : null}
      </div>
    </main>
  )
}
