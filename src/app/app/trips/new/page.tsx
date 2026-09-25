'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'

const TRIP_TYPES = [
  { id: 'client', label: 'Klient' },
  { id: 'street_hail', label: 'Z ulicy' },
  { id: 'internal', label: 'Wewnętrzny' },
  { id: 'private', label: 'Prywatny' },
  { id: 'other', label: 'Inny' },
] as const

export default function NewTripPage() {
  const router = useRouter()
  const { me, refreshMe } = useAuth()
  const onShift = me?.dashboardState === 'C'
  const [step, setStep] = useState<1 | 2>(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tripType, setTripType] = useState<(typeof TRIP_TYPES)[number]['id']>('client')
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function save() {
    if (!onShift && live) {
      setToast('Rozpocznij zmianę, żeby ruszyć kurs live')
      return
    }
    setBusy(true)
    try {
      const now = new Date()
      const body: Record<string, unknown> = {
        tripType,
        status: live ? 'in_progress' : 'completed',
        startedAt: now.toISOString(),
        endedAt: live ? null : now.toISOString(),
        metadata: {
          tripRequest: { from, to },
        },
      }
      const result = (await omClient.createTrip(body)) as { id?: string; status?: string }
      await refreshMe()
      if (result.status === 'pending_authorization' || tripType === 'internal') {
        setToast('Kurs zapisany. Czeka na autoryzację.')
      } else {
        setToast('Kurs zapisany')
      }
      window.setTimeout(() => {
        router.replace(result.id ? `/app/trips/${result.id}` : '/app/trips')
      }, 600)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zapisać kursu')
      setBusy(false)
    }
  }

  return (
    <AppShell hideNav>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button type="button" className="mb-3 text-[15px] text-[var(--accent)]" onClick={() => router.back()}>
          Wróć
        </button>
        <h1 className="text-[22px] font-semibold">Nowy kurs</h1>
        <p className="mt-1 text-[15px] text-[var(--text-secondary)]">Krok {step}/2</p>

        {step === 1 ? (
          <div className="mt-6 space-y-4">
            {onShift ? (
              <button
                type="button"
                onClick={() => setLive((v) => !v)}
                className={`w-full rounded-[18px] border p-4 text-left ${
                  live
                    ? 'border-[var(--accent)] tint-accent-soft'
                    : 'border-[var(--separator)] bg-[var(--bg-surface)]'
                }`}
              >
                <p className="font-semibold">Kurs live</p>
                <p className="mt-1 text-[15px] text-[var(--text-secondary)]">Start od razu z licznikiem</p>
              </button>
            ) : (
              <div className="rounded-[18px] bg-[var(--bg-surface)] p-4 text-[15px] text-[var(--text-secondary)]">
                Kurs live dostępny po rozpoczęciu zmiany.
              </div>
            )}
            <TextField label="Skąd" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField label="Dokąd" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="pt-4">
              <Button disabled={!from.trim() || !to.trim()} onClick={() => setStep(2)}>
                Dalej: szczegóły kursu
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-[15px] font-medium">Typ kursu</p>
            <div className="grid grid-cols-2 gap-3">
              {TRIP_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTripType(type.id)}
                  className={`rounded-[18px] p-4 text-left ${
                    tripType === type.id
                      ? 'tint-accent'
                      : 'bg-[var(--bg-surface)]'
                  }`}
                >
                  <span className="font-semibold">{type.label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-4">
              <Button loading={busy} onClick={() => void save()}>
                Zapisz kurs
              </Button>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Wstecz
              </Button>
            </div>
          </div>
        )}
        <Toast message={toast} />
      </div>
    </AppShell>
  )
}
