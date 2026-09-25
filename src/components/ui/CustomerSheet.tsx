'use client'

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
}

export function CustomerCreateSheet({
  open,
  onClose,
  onCreated,
  initialKind = 'person',
}: {
  open: boolean
  onClose: () => void
  onCreated: (customer: SelectedCustomer) => void
  initialKind?: 'person' | 'company'
}) {
  const [kind, setKind] = useState<'person' | 'company'>(initialKind)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [nip, setNip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setKind(initialKind)
      setError(null)
    })
  }, [open, initialKind])

  const canSubmit = useMemo(() => {
    if (phone.trim().length < 5) return false
    if (kind === 'company') return nip.replace(/\D/g, '').length === 10
    return true
  }, [phone, kind, nip])

  async function submit() {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      const body =
        kind === 'company'
          ? {
              kind: 'company' as const,
              primaryPhone: phone.trim(),
              displayName: name.trim() || undefined,
              nip: nip.replace(/\D/g, ''),
            }
          : {
              kind: 'person' as const,
              primaryPhone: phone.trim(),
              firstName: parts[0] || undefined,
              lastName: parts.slice(1).join(' ') || undefined,
              displayName: name.trim() || undefined,
            }
      const created = (await omClient.createCustomer(body)) as {
        id?: string
        displayName?: string
        primaryPhone?: string
      }
      const id = String(created.id || '')
      if (!id) throw new Error('Brak id klienta')
      onCreated({
        id,
        kind,
        label: created.displayName || name.trim() || phone.trim(),
        phone: created.primaryPhone || phone.trim(),
      })
      onClose()
      setPhone('')
      setName('')
      setNip('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać klienta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Dodaj klienta"
      subtitle="Telefon jest wymagany zawsze. Dane firmy uzupełni CRM na podstawie NIP."
    >
      <div className="space-y-4">
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { id: 'person', label: 'Osoba' },
            { id: 'company', label: 'Firma' },
          ]}
        />
        <TextField
          label="Telefon"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="504 013 184"
        />
        {kind === 'person' ? (
          <TextField
            label="Imię i nazwisko"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Opcjonalnie"
          />
        ) : (
          <>
            <TextField
              label="NIP"
              inputMode="numeric"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="10 cyfr"
              error={nip && nip.replace(/\D/g, '').length !== 10 ? 'NIP jest wymagany (10 cyfr).' : null}
            />
            <TextField
              label="Nazwa firmy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Opcjonalnie"
            />
          </>
        )}
        {error ? <p className="text-[15px] text-[var(--danger)]">{error}</p> : null}
        <Button loading={busy} disabled={!canSubmit} onClick={() => void submit()}>
          Dodaj klienta
        </Button>
      </div>
    </BottomSheet>
  )
}

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
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<'person' | 'company'>('person')

  const trimmedQuery = query.trim()
  const shownItems = trimmedQuery.length < 2 ? [] : items

  useEffect(() => {
    if (trimmedQuery.length < 2) return
    const t = window.setTimeout(() => {
      void omClient
        .searchCustomers(trimmedQuery)
        .then((res) => {
          const list = (res as { items?: Array<Record<string, unknown>> }).items || []
          setItems(
            list.map((item) => ({
              id: String(item.id),
              kind: (item.kind === 'company' ? 'company' : 'person') as 'person' | 'company',
              label: String(item.displayName || item.label || item.primaryPhone || 'Klient'),
              phone: item.primaryPhone ? String(item.primaryPhone) : null,
            })),
          )
        })
        .catch(() => setItems([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [trimmedQuery])

  return (
    <div>
      <p className="mb-2 text-[15px] font-medium">
        Klient
        {!required ? <span className="font-normal text-[var(--text-secondary)]"> (opcjonalnie)</span> : null}
      </p>
      {value ? (
        <div className="flex min-h-16 items-center gap-2.5 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-4 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{value.label}</span>
            <span className="block text-[15px] text-[var(--text-secondary)]">
              {value.kind === 'company' ? 'firma' : 'osoba'}
              {value.phone ? ` · ${value.phone}` : ''}
            </span>
          </span>
          <button
            type="button"
            className="text-[15px] font-semibold text-[var(--accent)]"
            onClick={() => onChange(null)}
          >
            Zmień
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po telefonie lub nazwisku"
            className="h-14 w-full rounded-[14px] border border-transparent bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none focus:border-[var(--accent)]"
          />
          {shownItems.length > 0 ? (
            <ul className="mt-2 overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
              {shownItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex min-h-[60px] w-full flex-col justify-center border-b border-[var(--separator)] px-4 text-left last:border-0"
                    onClick={() => {
                      onChange(item)
                      setQuery('')
                      setItems([])
                    }}
                  >
                    <span className="text-[16px] font-semibold">{item.label}</span>
                    <span className="text-[15px] text-[var(--text-secondary)]">{item.phone || item.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
              onClick={() => {
                setCreateKind('person')
                setCreateOpen(true)
              }}
            >
              + Nowa osoba
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full border border-[var(--separator)] px-3.5 text-[15px] font-semibold"
              onClick={() => {
                setCreateKind('company')
                setCreateOpen(true)
              }}
            >
              + Nowa firma
            </button>
          </div>
        </>
      )}
      <CustomerCreateSheet
        open={createOpen}
        initialKind={createKind}
        onClose={() => setCreateOpen(false)}
        onCreated={(customer) => {
          onChange(customer)
          setCreateOpen(false)
        }}
      />
    </div>
  )
}
