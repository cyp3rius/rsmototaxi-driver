'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'

const COST_TYPES = [
  { id: 'fuel', label: 'Paliwo' },
  { id: 'toll', label: 'Opłata drogowa' },
  { id: 'parking', label: 'Parking' },
  { id: 'maintenance', label: 'Serwis' },
  { id: 'other', label: 'Inny' },
]

export default function NewExpensePage() {
  const router = useRouter()
  const [costType, setCostType] = useState('fuel')
  const [amount, setAmount] = useState('')
  const [vat, setVat] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  async function save() {
    if (!file) {
      setToast('Paragon jest wymagany')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const uploaded = (await omClient.uploadAttachment(form)) as { id?: string }
      await omClient.createExpense({
        costType,
        amountGross: Number(amount.replace(',', '.')),
        vatRate: vat ? Number(vat) : null,
        receiptAttachmentId: uploaded.id,
        occurredAt: new Date().toISOString(),
      })
      setToast('Koszt zapisany')
      window.setTimeout(() => router.replace('/app/expenses'), 600)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się zapisać')
      setBusy(false)
    }
  }

  return (
    <AppShell hideNav>
      <div className="px-5 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <button type="button" className="mb-3 text-[15px] text-[var(--accent)]" onClick={() => router.back()}>
          Wróć
        </button>
        <h1 className="text-[22px] font-semibold">Nowy koszt</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {COST_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setCostType(type.id)}
              className={`rounded-[18px] p-4 text-left ${
                costType === type.id
                  ? 'tint-accent'
                  : 'bg-[var(--bg-surface)]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          <TextField
            label="Kwota brutto"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            label="VAT % (opcjonalnie)"
            inputMode="numeric"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            placeholder="8 lub 23"
          />
          <label className="block">
            <span className="mb-2 block text-[15px] font-medium">Paragon</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button loading={busy} onClick={() => void save()}>
            Zapisz koszt
          </Button>
        </div>
        <Toast message={toast} />
      </div>
    </AppShell>
  )
}
