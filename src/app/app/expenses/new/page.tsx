'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ActionBar, actionBarContentPadCss } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { CostTypeIcon } from '@/components/ui/CostTypeIcon'
import { PageHeader } from '@/components/ui/PageHeader'
import { AddReceiptControl, useAddReceiptState } from '@/components/ui/AddReceiptControl'
import { SelectTile } from '@/components/ui/SelectTile'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { omClient } from '@/lib/om/client'
import { translateApiError } from '@/lib/om/errors'
import { formatTime } from '@/lib/format'
import { useStackBack } from '@/lib/transitions/react/StackLayer'
import { COST_TYPE_OPTIONS } from '@/lib/tripMeta'

export default function NewExpensePage() {
  const router = useRouter()
  const stackBack = useStackBack()
  const [costType, setCostType] = useState<(typeof COST_TYPE_OPTIONS)[number]['id']>('fuel')
  const [amount, setAmount] = useState('')
  const [vat, setVat] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const receipt = useAddReceiptState()

  const whenLabel = useMemo(() => {
    const now = new Date()
    return `Dziś, ${formatTime(now.toISOString())}`
  }, [])

  async function save() {
    if (!receipt.file) {
      toast.warning('Paragon jest wymagany')
      return
    }
    if (!amount.trim()) {
      toast.warning('Podaj kwotę brutto')
      return
    }
    const parsedAmount = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.warning('Podaj poprawną kwotę')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', receipt.file)
      const uploaded = (await omClient.uploadAttachment(form)) as { id?: string }
      await omClient.createExpense({
        costType,
        amount: parsedAmount,
        vatRatePercent: vat,
        receiptAttachmentId: uploaded.id,
        receiptDocumentNumber: receipt.documentNumber || null,
        occurredAt: new Date().toISOString(),
        notes: notes.trim() || null,
      })
      toast.success('Koszt zapisany')
      window.setTimeout(() => router.replace('/app/expenses'), 600)
    } catch (err) {
      toast.error(translateApiError(err instanceof Error ? err.message : null))
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Zarejestruj koszt" onClose={stackBack} />

      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-3"
        data-scroll
        style={{ paddingBottom: actionBarContentPadCss() }}
      >
        <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
          Koszt wejdzie do rozliczenia tygodniowego. Paragon jest wymagany, VAT możesz pominąć, uzupełni go rozpoznanie
          paragonu.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {COST_TYPE_OPTIONS.map((opt) => (
            <SelectTile
              key={opt.id}
              selected={costType === opt.id}
              onClick={() => setCostType(opt.id)}
              label={opt.label}
              icon={<CostTypeIcon type={opt.id} />}
            />
          ))}
        </div>

        <div>
          <p className="mb-2 text-[15px] font-[500]">Kwota brutto</p>
          <div className="flex h-16 items-center justify-between rounded-[14px] border-[1.5px] border-[var(--accent)] bg-[var(--bg-surface)] px-4 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-transparent font-[family-name:var(--font-display)] text-[30px] font-[600] tabular-nums outline-none"
              style={{ fontStretch: '110%' }}
            />
            <span className="text-[18px] font-[500] text-[var(--text-secondary)]">zł</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="mb-2 text-[15px] font-[500]">
              VAT <span className="font-[400] text-[var(--text-secondary)]">opcjonalnie</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[8, 23].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setVat((v) => (v === rate ? null : rate))}
                  className={`flex h-14 items-center justify-center rounded-[14px] text-[16px] ${
                    vat === rate
                      ? 'border-2 border-[var(--accent)] font-[600] tint-accent-soft'
                      : 'border border-[var(--separator)] font-[500]'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[15px] font-[500]">Kiedy</p>
            <div className="flex h-14 items-center rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-3.5 text-[16px]">
              {whenLabel}
            </div>
          </div>
        </div>

        <AddReceiptControl
          file={receipt.file}
          previewUrl={receipt.previewUrl}
          documentNumber={receipt.documentNumber}
          onPicked={receipt.pick}
          onClear={receipt.clear}
        />

        <div>
          <p className="mb-2 text-[15px] font-[500]">Notatki</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. tankowanie przed kursem do Zakopanego"
            rows={3}
            maxLength={5000}
            className="min-h-20 w-full resize-none rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-4 py-3.5 text-[16px] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <ActionBar>
        <Button loading={busy} onClick={() => void save()}>
          Zapisz koszt
        </Button>
      </ActionBar>
    </div>
  )
}
