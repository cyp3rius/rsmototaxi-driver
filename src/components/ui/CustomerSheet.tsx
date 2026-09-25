'use client'

import { Building2, Plus, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { omClient } from '@/lib/om/client'

export type SelectedCustomer = {
  id: string
  kind: 'person' | 'company'
  label: string
  phone?: string | null
  description?: string | null
}

const MIN_SEARCH = 3

export function CustomerPicker({
  value,
  onChange,
  required,
}: {
  value: SelectedCustomer | null
  onChange: (value: SelectedCustomer | null) => void
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SelectedCustomer[]>([])
  const [searching, setSearching] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<'person' | 'company'>('person')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [nip, setNip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const trimmedQuery = query.trim()

  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH) {
      setItems([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    const t = window.setTimeout(() => {
      void omClient
        .searchCustomers(trimmedQuery)
        .then((res) => {
          if (!active) return
          const list = (res as { items?: Array<Record<string, unknown>> }).items || []
          setItems(
            list.map((item) => ({
              id: String(item.id || ''),
              kind: (item.kind === 'company' ? 'company' : 'person') as 'person' | 'company',
              label: String(item.label || item.displayName || item.primaryPhone || 'Klient'),
              phone: item.primaryPhone ? String(item.primaryPhone) : null,
              description: item.description ? String(item.description) : null,
            })).filter((item) => item.id),
          )
        })
        .catch(() => {
          if (active) setItems([])
        })
        .finally(() => {
          if (active) setSearching(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(t)
    }
  }, [trimmedQuery])

  const canSubmit = useMemo(() => {
    if (phone.trim().length < 5) return false
    if (createKind === 'company') return nip.replace(/\D/g, '').length === 10
    return true
  }, [phone, createKind, nip])

  function resetCreate() {
    setCreateOpen(false)
    setError(null)
    setPhone('')
    setName('')
    setNip('')
    setBusy(false)
  }

  async function submitCreate() {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      const body =
        createKind === 'company'
          ? {
              kind: 'company' as const,
              primaryPhone: phone.trim(),
              displayName: name.trim() || undefined,
              nip: nip.replace(/\D/g, ''),
            }
          : {
              kind: 'person' as const,
              primaryPhone: phone.trim(),
              displayName: name.trim() || undefined,
            }
      const created = (await omClient.createCustomer(body)) as {
        id?: string
        label?: string
        displayName?: string
        primaryPhone?: string
        error?: string
      }
      const id = String(created.id || '')
      if (!id) throw new Error(created.error || 'Nie udało się dodać klienta')
      onChange({
        id,
        kind: createKind,
        label: created.label || created.displayName || name.trim() || phone.trim(),
        phone: created.primaryPhone || phone.trim(),
      })
      resetCreate()
      setQuery('')
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać klienta')
      setBusy(false)
    }
  }

  if (value) {
    return (
      <div>
        <p className="mb-2 text-[15px] font-medium">
          Klient
          {required ? <span className="text-[var(--danger)]"> *</span> : null}
        </p>
        <div className="flex min-h-16 items-center gap-2.5 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-4 py-2">
          <span className="mt-0.5 text-[var(--text-secondary)]">
            {value.kind === 'company' ? <Building2 size={18} /> : <UserRound size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold">{value.label}</span>
            <span className="block text-[15px] text-[var(--text-secondary)]">
              {value.kind === 'company' ? 'Firma' : 'Osoba'}
              {value.phone ? ` · ${value.phone}` : ''}
            </span>
          </span>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-[var(--text-secondary)]"
            aria-label="Wyczyść klienta"
            onClick={() => onChange(null)}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[15px] font-medium">
          Klient
          {required ? <span className="text-[var(--danger)]"> *</span> : null}
          {!required ? <span className="font-normal text-[var(--text-secondary)]"> (opcjonalnie)</span> : null}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po nazwie, telefonie lub NIP…"
          autoComplete="off"
          className="h-14 w-full rounded-[14px] border border-transparent bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {trimmedQuery.length > 0 ? (
        <div className="max-h-52 overflow-y-auto rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
          {trimmedQuery.length < MIN_SEARCH ? (
            <p className="px-4 py-3 text-[15px] text-[var(--text-secondary)]">
              Wpisz co najmniej {MIN_SEARCH} znaki…
            </p>
          ) : null}
          {trimmedQuery.length >= MIN_SEARCH && searching ? (
            <p className="px-4 py-3 text-[15px] text-[var(--text-secondary)]">Szukam…</p>
          ) : null}
          {trimmedQuery.length >= MIN_SEARCH && !searching && items.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-[var(--text-secondary)]">Brak klientów.</p>
          ) : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex min-h-[60px] w-full items-start gap-2.5 border-b border-[var(--separator)] px-4 py-2 text-left last:border-0"
              onClick={() => {
                onChange(item)
                setQuery('')
                setItems([])
                resetCreate()
              }}
            >
              <span className="mt-0.5 text-[var(--text-secondary)]">
                {item.kind === 'company' ? <Building2 size={18} /> : <UserRound size={18} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold">{item.label}</span>
                <span className="block truncate text-[15px] text-[var(--text-secondary)]">
                  {item.description || item.phone || (item.kind === 'company' ? 'firma' : 'osoba')}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!createOpen ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
            onClick={() => {
              setCreateKind('person')
              setNip('')
              setError(null)
              setCreateOpen(true)
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Nowa osoba
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
            onClick={() => {
              setCreateKind('company')
              setError(null)
              setCreateOpen(true)
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Nowa firma
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-4">
          <p className="text-[17px] font-semibold">
            {createKind === 'company' ? 'Nowa firma' : 'Nowa osoba'}
          </p>
          <TextField
            label="Telefon"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="504 013 184"
            required
          />
          {createKind === 'company' ? (
            <TextField
              label="NIP"
              inputMode="numeric"
              autoComplete="off"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="10 cyfr"
              error={
                nip && nip.replace(/\D/g, '').length !== 10 ? 'NIP jest wymagany (10 cyfr).' : null
              }
            />
          ) : null}
          <TextField
            label={createKind === 'company' ? 'Nazwa firmy' : 'Imię i nazwisko'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Opcjonalnie"
            autoComplete="name"
          />
          {error ? <p className="text-[15px] text-[var(--danger)]">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" disabled={busy} onClick={resetCreate}>
              Anuluj
            </Button>
            <Button size="md" loading={busy} disabled={!canSubmit} onClick={() => void submitCreate()}>
              Zapisz klienta
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
