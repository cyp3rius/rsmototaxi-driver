'use client'

import { Receipt, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ReceiptSheet } from '@/components/ui/ReceiptSheet'
import { useReceiptFile } from '@/components/ui/ReceiptFields'

/**
 * Design 5.7 completed trip — missing-receipt banner:
 * warning row + “Brak paragonu” + accent “Dodaj paragon”.
 */
export function MissingReceiptBanner({
  onAdd,
  label = 'Brak paragonu',
  actionLabel = 'Dodaj paragon',
}: {
  onAdd: () => void
  label?: string
  actionLabel?: string
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] tint-warning px-2 py-2 pl-4">
      <Receipt size={22} className="shrink-0 text-[var(--warning)]" strokeWidth={1.8} />
      <span className="flex-1 text-[16px] font-semibold">{label}</span>
      <Button size="md" className="!h-12 !w-auto shrink-0 px-4" onClick={onAdd}>
        {actionLabel}
      </Button>
    </div>
  )
}

/** Same layout as missing-receipt banner, danger tone — OCR needs review. */
export function NeedsReviewReceiptBanner({
  onCheck,
  label = 'Paragon wymaga sprawdzenia',
  actionLabel = 'Sprawdź',
}: {
  onCheck: () => void
  label?: string
  actionLabel?: string
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] tint-danger px-2 py-2 pl-4">
      <Receipt size={22} className="shrink-0 text-[var(--danger)]" strokeWidth={1.8} />
      <span className="flex-1 text-[16px] font-semibold text-[var(--danger)]">{label}</span>
      <Button
        size="md"
        variant="danger"
        className="!h-12 !w-auto shrink-0 px-4"
        onClick={onCheck}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

/**
 * Form control: same 5.7 banner opens ReceiptSheet (5.9). Used on past-trip create and new expense.
 */
export function AddReceiptControl({
  file,
  previewUrl,
  documentNumber,
  onPicked,
  onClear,
  sheetSubtitle = 'Zrób zdjęcie lub wybierz plik (obraz albo PDF).',
  requiredLabel = 'Paragon',
}: {
  file: File | null
  previewUrl: string | null
  documentNumber?: string
  onPicked: (file: File, documentNumber: string) => void
  onClear: () => void
  sheetSubtitle?: string
  requiredLabel?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <p className="text-[15px] font-[500]">
        {requiredLabel}{' '}
        <span className="font-[400] text-[var(--text-secondary)]">(wymagany)</span>
      </p>

      {!file ? (
        <MissingReceiptBanner onAdd={() => setOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface)]">
          {previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="max-h-40 w-full object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={onClear}
                aria-label="Usuń paragon"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <Receipt size={20} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{file.name}</p>
              <button
                type="button"
                className="text-[15px] font-semibold text-[var(--danger)]"
                onClick={onClear}
              >
                Usuń
              </button>
            </div>
          )}
          {documentNumber ? (
            <p className="border-t border-[var(--separator)] px-4 py-2.5 text-[15px] text-[var(--text-secondary)]">
              Numer · {documentNumber}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-[48px] w-full items-center justify-center border-t border-[var(--separator)] text-[15px] font-semibold text-[var(--accent)]"
          >
            Zmień paragon
          </button>
        </div>
      )}

      <ReceiptSheet
        open={open}
        onClose={() => setOpen(false)}
        subtitle={sheetSubtitle}
        initialDocumentNumber={documentNumber || ''}
        onUpload={async (nextFile, nextDoc) => {
          onPicked(nextFile, nextDoc)
          setOpen(false)
        }}
      />
    </div>
  )
}

/** Convenience hook pairing useReceiptFile + optional document number for create forms. */
export function useAddReceiptState() {
  const receipt = useReceiptFile()
  const [documentNumber, setDocumentNumber] = useState('')

  function pick(file: File, doc: string) {
    receipt.pick(file)
    setDocumentNumber(doc.trim())
  }

  function clear() {
    receipt.clear()
    setDocumentNumber('')
  }

  return {
    file: receipt.file,
    previewUrl: receipt.previewUrl,
    documentNumber,
    pick,
    clear,
  }
}
