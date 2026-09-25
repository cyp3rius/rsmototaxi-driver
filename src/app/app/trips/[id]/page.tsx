'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { SlideToConfirm } from '@/components/ui/SlideToConfirm'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/TextField'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { useAuth } from '@/lib/om/AuthProvider'

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { me, refreshMe } = useAuth()
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [docNumber, setDocNumber] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void omClient.getTrips({ id: params.id }).then((res) => setTrip(res.items[0] ?? null))
  }, [params.id])

  const status = String(trip?.status || '')
  const hideNav = status === 'in_progress'
  const onShift = me?.dashboardState === 'C'

  async function setStatus(next: string) {
    if (!trip) return
    setBusy(true)
    try {
      await omClient.updateTrip({ id: trip.id, status: next })
      await refreshMe()
      const res = await omClient.getTrips({ id: params.id })
      setTrip(res.items[0] ?? null)
      setToast(next === 'in_progress' ? 'Kurs rozpoczęty' : 'Kurs zakończony')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Błąd aktualizacji')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  async function uploadReceipt(file: File) {
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('tripId', params.id)
      const uploaded = (await omClient.uploadAttachment(form)) as { id?: string }
      await omClient.updateTrip({
        id: params.id,
        receiptAttachmentId: uploaded.id,
        receiptDocumentNumber: docNumber || null,
        completionMode: 'receipt',
        status: status === 'scheduled' ? 'completed' : status,
      })
      const res = await omClient.getTrips({ id: params.id })
      setTrip(res.items[0] ?? null)
      setReceiptOpen(false)
      setToast('Paragon dodany')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload nieudany')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <AppShell hideNav={hideNav}>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button type="button" className="mb-3 text-[15px] text-[var(--accent)]" onClick={() => router.back()}>
          Wróć
        </button>
        {!trip ? (
          <p className="text-[var(--text-secondary)]">Ładowanie…</p>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold">Szczegóły kursu</h1>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">{status}</p>
            <p className="mt-4 text-[17px]">
              {trip.startedAt
                ? new Date(String(trip.startedAt)).toLocaleString('pl-PL')
                : '—'}
            </p>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
              {String(trip.tripType)}
              {trip.platform ? ` · ${String(trip.platform)}` : ''}
            </p>

            <div className="mt-8 space-y-3">
              {status === 'scheduled' && onShift ? (
                <SlideToConfirm label="Przesuń, aby rozpocząć" onConfirm={() => setStatus('in_progress')} disabled={busy} />
              ) : null}
              {status === 'scheduled' && !onShift ? (
                <Button onClick={() => router.push('/app/shifts?start=1')}>Rozpocznij zmianę, żeby ruszyć</Button>
              ) : null}
              {status === 'in_progress' ? (
                <SlideToConfirm label="Przesuń, aby zakończyć" onConfirm={() => setStatus('completed')} disabled={busy} />
              ) : null}
              {trip.platform ? (
                <p className="rounded-[14px] bg-[var(--bg-surface-raised)] px-3 py-2 text-[15px]">Kurs z platformy — tylko odczyt</p>
              ) : (
                <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
                  {trip.receiptAttachmentId ? 'Paragon dodany' : 'Dodaj paragon'}
                </Button>
              )}
            </div>
          </>
        )}

        <BottomSheet open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Paragon">
          <p className="mb-4 text-[15px] text-[var(--text-secondary)]">
            Dodanie paragonu do kursu zaplanowanego oznaczy go jako zakończony.
          </p>
          <TextField label="Numer dokumentu (opcjonalnie)" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          <div className="mt-4 space-y-2">
            <label className="block">
              <span className="sr-only">Zrób zdjęcie</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="block w-full text-[15px]"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadReceipt(file)
                }}
              />
            </label>
            <label className="block">
              <span className="sr-only">Wybierz plik</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-[15px]"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadReceipt(file)
                }}
              />
            </label>
          </div>
        </BottomSheet>
        <Toast message={toast} />
      </div>
    </AppShell>
  )
}
