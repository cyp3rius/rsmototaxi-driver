'use client'

import { Camera, Ellipsis, FileUp, Fuel, ParkingSquare, Wrench, X, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { ActionBar } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelectTile } from '@/components/ui/SelectTile'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { COST_TYPE_OPTIONS } from '@/lib/tripMeta'

const icons = {
  fuel: Fuel,
  road: ArrowUpDown,
  parking: ParkingSquare,
  wrench: Wrench,
  ellipsis: Ellipsis,
} as const

export default function NewExpensePage() {
  const router = useRouter()
  const [costType, setCostType] = useState<(typeof COST_TYPE_OPTIONS)[number]['id']>('fuel')
  const [amount, setAmount] = useState('')
  const [vat, setVat] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pick(next: File | null) {
    if (!next) return
    setFile(next)
    if (next.type.startsWith('image/')) setPreview(URL.createObjectURL(next))
    else setPreview(null)
  }

  async function save() {
    if (!file) {
      setToast('Paragon jest wymagany')
      return
    }
    if (!amount.trim()) {
      setToast('Podaj kwotę brutto')
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
        vatRate: vat,
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
      <PageHeader title="Zarejestruj koszt" onClose={() => router.back()} />
      <p className="px-5 text-[15px] leading-5 text-[var(--text-secondary)]">
        Koszt wejdzie do rozliczenia tygodniowego. Paragon jest wymagany, VAT możesz pominąć, uzupełni go rozpoznanie
        paragonu.
      </p>

      <div className="space-y-4 px-5 pb-36 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {COST_TYPE_OPTIONS.map((opt) => {
            const Icon = icons[opt.icon] || Ellipsis
            return (
              <SelectTile
                key={opt.id}
                selected={costType === opt.id}
                onClick={() => setCostType(opt.id)}
                label={opt.label}
                icon={<Icon size={22} strokeWidth={1.8} />}
              />
            )
          })}
        </div>

        <div>
          <p className="mb-2 text-[15px] font-medium">Kwota brutto</p>
          <div className="flex h-16 items-center justify-between rounded-[14px] border-[1.5px] border-[var(--accent)] bg-[var(--bg-surface)] px-4 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-transparent font-[family-name:var(--font-display)] text-[30px] font-semibold tabular-nums outline-none"
              style={{ fontStretch: '110%' }}
            />
            <span className="text-[18px] font-medium text-[var(--text-secondary)]">zł</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="mb-2 text-[15px] font-medium">
              VAT <span className="font-normal text-[var(--text-secondary)]">opcjonalnie</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[8, 23].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setVat((v) => (v === rate ? null : rate))}
                  className={`flex h-14 items-center justify-center rounded-[14px] text-[16px] font-semibold ${
                    vat === rate
                      ? 'border-2 border-[var(--accent)] tint-accent-soft'
                      : 'border border-[var(--separator)]'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[15px] font-medium">Kiedy</p>
            <div className="flex h-14 items-center rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-3.5 text-[16px]">
              Dziś
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[15px] font-medium">
            Paragon <span className="font-normal text-[var(--text-secondary)]">(wymagany)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] text-[16px] font-semibold"
            >
              <Camera size={20} strokeWidth={1.9} />
              Zrób zdjęcie
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] text-[16px] font-semibold"
            >
              <FileUp size={20} strokeWidth={1.9} />
              Wybierz plik
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {preview ? (
            <div className="relative mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-40 w-full rounded-[14px] object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : file ? (
            <p className="mt-3 rounded-[14px] bg-[var(--bg-surface-raised)] px-4 py-3 text-[15px]">{file.name}</p>
          ) : null}
        </div>
      </div>

      <ActionBar>
        <Button loading={busy} onClick={() => void save()}>
          Zapisz koszt
        </Button>
      </ActionBar>
      <Toast message={toast} />
    </AppShell>
  )
}
