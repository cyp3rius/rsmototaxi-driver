'use client'

import { Camera, FileUp, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'

export type ReceiptUiStatus =
  | 'missing'
  | 'processing'
  | 'needs_review'
  | 'verified'
  | 'offline'
  | null

export function ReceiptStatusBadge({ status }: { status: ReceiptUiStatus }) {
  if (!status || status === 'missing') {
    return (
      <StatusChip tone="warning" pulse={false}>
        Brak paragonu
      </StatusChip>
    )
  }
  if (status === 'processing') {
    return (
      <StatusChip tone="accent" pulse>
        Przetwarzanie
      </StatusChip>
    )
  }
  if (status === 'needs_review') {
    return (
      <div className="space-y-1">
        <StatusChip tone="danger" pulse={false}>
          Do sprawdzenia
        </StatusChip>
        <p className="text-[14px] text-[var(--text-secondary)]">Sprawdź wynik rozpoznania</p>
      </div>
    )
  }
  if (status === 'verified') {
    return (
      <StatusChip tone="success" pulse={false}>
        Zweryfikowany
      </StatusChip>
    )
  }
  return (
    <StatusChip tone="neutral" pulse={false}>
      Czeka na synchronizację
    </StatusChip>
  )
}

export function receiptUiStatusFromRecord(record: Record<string, unknown> | null | undefined): ReceiptUiStatus {
  if (!record) return 'missing'
  if (record._pendingSync) return 'offline'
  if (record.receiptAttachmentId) {
    const ocr = String(record.ocrStatus || '')
    if (ocr === 'pending' || ocr === 'processing') return 'processing'
    if (ocr === 'needs_review' || ocr === 'failed') return 'needs_review'
    if (ocr === 'applied' || ocr === 'extracted' || ocr === 'verified') return 'verified'
    return 'verified'
  }
  const type = String(record.tripType || '')
  if (record.platform || type === 'internal' || type === 'platform') return null
  return 'missing'
}

export function ReceiptSheet({
  open,
  onClose,
  onUpload,
  busy,
  subtitle = 'Zrób zdjęcie lub wybierz plik (obraz albo PDF).',
  initialDocumentNumber = '',
  status = null,
}: {
  open: boolean
  onClose: () => void
  onUpload: (file: File, documentNumber: string) => Promise<void>
  busy?: boolean
  subtitle?: string
  initialDocumentNumber?: string
  status?: ReceiptUiStatus
}) {
  const [docNumber, setDocNumber] = useState(initialDocumentNumber)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setDocNumber(initialDocumentNumber))
  }, [open, initialDocumentNumber])

  function pick(next: File | null) {
    if (!next) return
    setFile(next)
    if (next.type.startsWith('image/')) {
      const url = URL.createObjectURL(next)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
  }

  async function submit() {
    if (!file) return
    await onUpload(file, docNumber.trim())
    clearFile()
    setDocNumber('')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Dodaj paragon" subtitle={subtitle}>
      <div className="space-y-4">
        {status && status !== 'missing' ? <ReceiptStatusBadge status={status} /> : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface)] text-[16px] font-semibold"
          >
            <Camera size={20} strokeWidth={1.9} />
            Zrób zdjęcie
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface)] text-[16px] font-semibold"
          >
            <FileUp size={20} strokeWidth={1.9} />
            Wybierz plik
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Podgląd paragonu" className="max-h-48 w-full rounded-[14px] object-cover" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute right-2 top-2 inline-flex h-10 items-center gap-1 rounded-full bg-[var(--bg-surface)] px-3 text-[15px] font-semibold shadow"
            >
              <Trash2 size={16} />
              Usuń
            </button>
          </div>
        ) : file ? (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--bg-surface-raised)] px-4 py-3">
            <p className="truncate text-[15px]">{file.name}</p>
            <button type="button" onClick={clearFile} className="text-[15px] font-semibold text-[var(--danger)]">
              Usuń
            </button>
          </div>
        ) : null}
        <TextField
          label="Numer paragonu / faktury"
          value={docNumber}
          onChange={(e) => setDocNumber(e.target.value)}
          placeholder="OCR uzupełni — możesz poprawić"
        />
        <Button size="md" loading={busy} disabled={!file} onClick={() => void submit()}>
          Zapisz paragon
        </Button>
      </div>
    </BottomSheet>
  )
}
