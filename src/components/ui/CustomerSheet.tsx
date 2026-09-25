'use client'

import { Building2, Plus, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
            list
              .map((item) => ({
                id: String(item.id || ''),
                kind: (item.kind === 'company' ? 'company' : 'person') as 'person' | 'company',
                label: String(item.label || item.displayName || item.primaryPhone || 'Klient'),
                phone: item.primaryPhone ? String(item.primaryPhone) : null,
                description: item.description ? String(item.description) : null,
              }))
              .filter((item) => item.id),
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

  function openCreate(kind: 'person' | 'company') {
    setCreateKind(kind)
    setError(null)
    setPhone('')
    setName('')
    setNip('')
    setBusy(false)
    setCreateOpen(true)
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
    const kindLabel = value.kind === 'company' ? 'firma' : 'osoba'
    const phonePart = value.phone ? ` · ${value.phone}` : ''
    return (
      <div>
        <p className="mb-2 text-[15px] font-medium">
          Klient
          {required ? <span className="text-[var(--danger)]"> *</span> : null}
        </p>
        <div className="box-border flex min-h-16 items-center gap-2.5 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] py-2 pr-3.5 pl-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold leading-5">{value.label}</span>
            <span className="mt-0.5 block truncate text-[15px] leading-5 text-[var(--text-secondary)]">
              {kindLabel}
              {phonePart}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 text-[15px] font-semibold text-[var(--accent)]"
            onClick={() => onChange(null)}
          >
            Zmień
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
            onClick={() => openCreate('person')}
          >
            <Plus size={14} strokeWidth={2.2} />
            Nowa osoba
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
            onClick={() => openCreate('company')}
          >
            <Plus size={14} strokeWidth={2.2} />
            Nowa firma
          </button>
        </div>
        <CustomerCreateSheet
          open={createOpen}
          kind={createKind}
          onKindChange={setCreateKind}
          phone={phone}
          name={name}
          nip={nip}
          error={error}
          busy={busy}
          canSubmit={canSubmit}
          onPhoneChange={setPhone}
          onNameChange={setName}
          onNipChange={setNip}
          onClose={resetCreate}
          onSubmit={() => void submitCreate()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[15px] font-medium">
          Klient
          {required ? <span className="text-[var(--danger)]"> *</span> : null}
          {!required ? (
            <span className="font-normal text-[var(--text-secondary)]"> (opcjonalnie)</span>
          ) : null}
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
              className="flex min-h-[60px] w-full items-center gap-2.5 border-b border-[var(--separator)] px-4 py-2.5 text-left last:border-0"
              onClick={() => {
                onChange(item)
                setQuery('')
                setItems([])
              }}
            >
              <span className="shrink-0 text-[var(--text-secondary)]">
                {item.kind === 'company' ? <Building2 size={18} /> : <UserRound size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold leading-5">{item.label}</span>
                <span className="block truncate text-[15px] leading-5 text-[var(--text-secondary)]">
                  {item.description || item.phone || (item.kind === 'company' ? 'firma' : 'osoba')}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
          onClick={() => openCreate('person')}
        >
          <Plus size={14} strokeWidth={2.2} />
          Nowa osoba
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
          onClick={() => openCreate('company')}
        >
          <Plus size={14} strokeWidth={2.2} />
          Nowa firma
        </button>
      </div>

      <CustomerCreateSheet
        open={createOpen}
        kind={createKind}
        onKindChange={setCreateKind}
        phone={phone}
        name={name}
        nip={nip}
        error={error}
        busy={busy}
        canSubmit={canSubmit}
        onPhoneChange={setPhone}
        onNameChange={setName}
        onNipChange={setNip}
        onClose={resetCreate}
        onSubmit={() => void submitCreate()}
      />
    </div>
  )
}

function CustomerCreateSheet({
  open,
  kind,
  onKindChange,
  phone,
  name,
  nip,
  error,
  busy,
  canSubmit,
  onPhoneChange,
  onNameChange,
  onNipChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  kind: 'person' | 'company'
  onKindChange: (kind: 'person' | 'company') => void
  phone: string
  name: string
  nip: string
  error: string | null
  busy: boolean
  canSubmit: boolean
  onPhoneChange: (value: string) => void
  onNameChange: (value: string) => void
  onNipChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Nowy klient"
      titleClassName="text-[26px] leading-8"
    >
      <div className="space-y-4">
        <SegmentedControl
          value={kind}
          onChange={onKindChange}
          options={[
            { id: 'person', label: 'Osoba' },
            { id: 'company', label: 'Firma' },
          ]}
        />

        {kind === 'company' ? (
          <TextField
            label="NIP"
            inputMode="numeric"
            autoComplete="off"
            value={nip}
            onChange={(e) => onNipChange(e.target.value)}
            placeholder="676 102 03 45"
            error={
              nip && nip.replace(/\D/g, '').length !== 10 ? 'NIP jest wymagany (10 cyfr).' : null
            }
          />
        ) : null}

        <TextField
          label="Telefon"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="601 234 567"
          required
        />

        {kind === 'company' ? (
          <>
            <TextField
              label="Nazwa firmy"
              labelHint="opcjonalnie"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Hotel Stary Sp. z o.o."
              autoComplete="organization"
            />
            <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
              Dane firmy uzupełni CRM na podstawie NIP.
            </p>
          </>
        ) : (
          <TextField
            label="Imię i nazwisko"
            labelHint="opcjonalnie"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Np. Anna Wiśniewska"
            autoComplete="name"
          />
        )}

        {error ? <p className="text-[15px] text-[var(--danger)]">{error}</p> : null}

        <Button className="mt-2" loading={busy} disabled={!canSubmit} onClick={onSubmit}>
          Dodaj klienta
        </Button>
      </div>
    </BottomSheet>
  )
}
