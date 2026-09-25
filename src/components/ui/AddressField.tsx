'use client'

import { Loader2, Navigation, Plane, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { filterAirportSuggestions } from '@/lib/route/fleetAirports'
import { omClient } from '@/lib/om/client'
import { cn } from '@/lib/cn'

type Suggestion = { id: string; label: string; lat?: number; lon?: number; isAirport?: boolean }

export function AddressField({
  label,
  value,
  onChange,
  placeholder,
  allowMyLocation,
  airportDefaults = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowMyLocation?: boolean
  airportDefaults?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const timer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<number | null>(null)

  const trimmed = value.trim()
  const airportHits = useMemo(
    () => (airportDefaults ? filterAirportSuggestions(trimmed) : []),
    [airportDefaults, trimmed],
  )

  const shownSuggestions = useMemo(() => {
    const remote = trimmed.length < 2 ? [] : suggestions
    const remoteIds = new Set(remote.map((s) => s.id))
    const airportsOnly = airportHits.filter((a) => !remoteIds.has(a.id))
    if (trimmed.length < 2) return airportsOnly
    // Prefer airports first, then remote (deduped by label lowercase)
    const labels = new Set(airportsOnly.map((a) => a.label.toLowerCase()))
    const rest = remote.filter((s) => !labels.has(s.label.toLowerCase()))
    return [...airportsOnly, ...rest]
  }, [airportHits, suggestions, trimmed.length])

  useEffect(() => {
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setLoading(true)
      void omClient
        .placesAutocomplete(trimmed)
        .then((res) => setSuggestions(res.suggestions || []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [trimmed])

  function closeAndBlur() {
    setOpen(false)
    setSuggestions([])
    inputRef.current?.blur()
  }

  async function fillFromMyLocation() {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await omClient.reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          const address = (res.address || res.label || '').trim()
          if (address) onChange(address)
          else onChange(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        } catch {
          onChange(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        } finally {
          setLocating(false)
          closeAndBlur()
        }
      },
      () => {
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    )
  }

  const showDropdown =
    open && (allowMyLocation || shownSuggestions.length > 0 || loading)

  return (
    <div className="relative min-w-0">
      <label className="block min-w-0">
        <span className="mb-2 block text-[15px] font-medium leading-5">{label}</span>
        <span className="relative block min-w-0">
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onFocus={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current)
              setOpen(true)
            }}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 160)
            }}
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
            }}
            className={cn(
              'h-14 w-full min-w-0 max-w-full rounded-[14px] border border-transparent bg-[var(--bg-surface-raised)] py-0 text-[17px] outline-none focus:border-[var(--accent)]',
              allowMyLocation || trimmed ? 'pr-12 pl-4' : 'px-4',
            )}
          />
          {trimmed ? (
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
              aria-label="Wyczyść adres"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange('')
                setSuggestions([])
                inputRef.current?.focus()
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          ) : allowMyLocation ? (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--accent)]">
              <Navigation size={20} strokeWidth={1.9} />
            </span>
          ) : null}
        </span>
      </label>
      {showDropdown ? (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto overflow-x-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] shadow-[0_12px_30px_rgba(2,4,7,0.14)]">
          {allowMyLocation ? (
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 border-b border-[var(--separator)] px-4 text-left text-[16px] font-semibold text-[var(--accent)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void fillFromMyLocation()}
              disabled={locating}
            >
              {locating ? (
                <Loader2 size={20} strokeWidth={1.9} className="shrink-0 animate-spin" />
              ) : (
                <Navigation size={20} strokeWidth={1.9} className="shrink-0" />
              )}
              <span className="min-w-0 flex-1 leading-5">
                {locating ? 'Pobieram lokalizację…' : 'Użyj mojej lokalizacji'}
              </span>
            </button>
          ) : null}
          {loading ? <p className="px-4 py-3 text-[15px] text-[var(--text-secondary)]">Szukam…</p> : null}
          {shownSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="flex min-h-[60px] w-full items-center gap-2.5 border-b border-[var(--separator)] px-4 py-2.5 text-left last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s.label)
                closeAndBlur()
              }}
            >
              {s.isAirport ? (
                <Plane size={18} strokeWidth={1.9} className="shrink-0 text-[var(--accent)]" />
              ) : (
                <Navigation size={18} strokeWidth={1.9} className="shrink-0 text-[var(--accent)]" />
              )}
              <span className="min-w-0 flex-1 text-[16px] leading-5">{s.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
