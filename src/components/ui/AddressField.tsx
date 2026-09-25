'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { omClient } from '@/lib/om/client'
import { cn } from '@/lib/cn'

type Suggestion = { id: string; label: string; lat?: number; lon?: number; isAirport?: boolean }

export function AddressField({
  label,
  value,
  onChange,
  placeholder,
  allowMyLocation,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowMyLocation?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<number | null>(null)

  const trimmed = value.trim()
  const shownSuggestions = trimmed.length < 2 ? [] : suggestions

  useEffect(() => {
    if (trimmed.length < 2) return
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

  async function fillFromMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await omClient.reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        onChange(res.label || res.address || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setOpen(false)
      } catch {
        onChange(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
      }
    })
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-2 block text-[15px] font-medium">{label}</span>
        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          className="h-14 w-full rounded-[14px] border border-transparent bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {open && (allowMyLocation || shownSuggestions.length > 0 || loading) ? (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)] shadow-[0_12px_30px_rgba(2,4,7,0.14)]">
          {allowMyLocation ? (
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 border-b border-[var(--separator)] px-4 text-left text-[16px] font-semibold text-[var(--accent)]"
              onClick={() => void fillFromMyLocation()}
            >
              <MapPin size={20} strokeWidth={1.9} />
              Użyj mojej lokalizacji
            </button>
          ) : null}
          {loading ? <p className="px-4 py-3 text-[15px] text-[var(--text-secondary)]">Szukam…</p> : null}
          {shownSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn('flex min-h-[60px] w-full flex-col justify-center px-4 py-1.5 text-left border-b border-[var(--separator)] last:border-0')}
              onClick={() => {
                onChange(s.label)
                setOpen(false)
              }}
            >
              <span className="text-[16px]">{s.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
