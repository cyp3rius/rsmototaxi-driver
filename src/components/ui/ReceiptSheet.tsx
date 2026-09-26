'use client'

import { Camera, FileText, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { cn } from '@/lib/cn'

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
        <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
          Sprawdź wynik rozpoznania
        </p>
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

export function receiptUiStatusFromRecord(
  record: Record<string, unknown> | null | undefined,
): ReceiptUiStatus {
  if (!record) return 'missing'
  if (record._pendingSync) return 'offline'
  if (record.receiptAttachmentId) {
    const ocr = String(record.ocrStatus || '')
    const warnings = Array.isArray(record.warnings) ? record.warnings : []
    if (ocr === 'pending' || ocr === 'processing') return 'processing'
    if (ocr === 'needs_review' || ocr === 'failed' || warnings.length > 0) return 'needs_review'
    if (ocr === 'applied' || ocr === 'extracted' || ocr === 'verified') return 'verified'
    // Attachment present but OCR not finished yet
    return 'processing'
  }
  const type = String(record.tripType || '')
  if (record.platform || type === 'internal' || type === 'platform') return null
  return 'missing'
}

/** Successful OCR — receipt must not be replaced (trips + expenses). */
export function isReceiptChangeLocked(
  record: Record<string, unknown> | null | undefined,
): boolean {
  return receiptUiStatusFromRecord(record) === 'verified'
}

/**
 * Design 5.9 receipt sheet — shared by trip detail and expense flows.
 * Pick state: two full-width entries (camera + file). Preview: image, OCR status, document number.
 */
export function ReceiptSheet({
  open,
  onClose,
  onUpload,
  busy,
  subtitle = 'Zrób zdjęcie lub wybierz plik (obraz albo PDF).',
  initialDocumentNumber = '',
  status = null,
  reviewHint,
}: {
  open: boolean
  onClose: () => void
  onUpload: (file: File, documentNumber: string) => Promise<void>
  busy?: boolean
  subtitle?: string
  initialDocumentNumber?: string
  status?: ReceiptUiStatus
  /** Optional OCR mismatch / review copy under the number field. */
  reviewHint?: string | null
}) {
  const [docNumber, setDocNumber] = useState(initialDocumentNumber)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setFile(null)
        setDocNumber('')
        if (cameraRef.current) cameraRef.current.value = ''
        if (fileRef.current) fileRef.current.value = ''
      })
      return
    }
    queueMicrotask(() => setDocNumber(initialDocumentNumber))
  }, [open, initialDocumentNumber])

  function pick(next: File | null) {
    if (!next) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    if (next.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(next))
    } else {
      setPreview(null)
    }
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!file) return
    await onUpload(file, docNumber.trim())
    clearFile()
    setDocNumber('')
  }

  const hasFile = Boolean(file)
  const isReview = status === 'needs_review'
  const isProcessing = status === 'processing'
  const isLocked = status === 'verified'
  const showPreviewChrome = hasFile || (status && status !== 'missing')
  const ctaLabel = isReview ? 'Zatwierdź paragon' : 'Zapisz paragon'

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={showPreviewChrome ? undefined : 'Dodaj paragon'}
      titleClassName="!text-[26px] !leading-8"
    >
      <div className="flex flex-col gap-4">
        {!showPreviewChrome && subtitle ? (
          <p className="-mt-2 text-[16px] leading-[22px] text-[var(--text-secondary)]">{subtitle}</p>
        ) : null}

        {showPreviewChrome ? (
          <div className="flex items-center justify-between gap-3">
            <h2
              className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8"
              style={{ fontStretch: '115%' }}
            >
              Paragon
            </h2>
            {status === 'needs_review' ? (
              <StatusChip tone="danger" pulse={false}>
                Do sprawdzenia
              </StatusChip>
            ) : status === 'verified' ? (
              <StatusChip tone="success" pulse={false}>
                Zweryfikowany
              </StatusChip>
            ) : status === 'offline' ? (
              <StatusChip tone="neutral" pulse={false}>
                Czeka na synchronizację
              </StatusChip>
            ) : (
              <StatusChip tone="accent" pulse>
                Przetwarzanie
              </StatusChip>
            )}
          </div>
        ) : null}

        {isLocked ? (
          <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
            Paragon został zweryfikowany i nie można go już zmienić.
          </p>
        ) : null}

        {!hasFile && !isLocked ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="rs-accent-fill flex h-16 w-full items-center justify-center gap-2.5 rounded-full text-[18px] font-semibold active:scale-[0.98]"
            >
              <Camera size={22} strokeWidth={2} />
              Zrób zdjęcie
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--separator)] bg-[var(--bg-surface)] text-[18px] font-semibold active:scale-[0.98]"
            >
              <FileText size={22} strokeWidth={2} />
              Wybierz plik
              <span className="text-[15px] font-normal text-[var(--text-secondary)]">
                zdjęcie lub PDF
              </span>
            </button>
          </div>
        ) : null}

        {!isLocked ? (
          <>
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
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </>
        ) : null}

        {preview ? (
          <div className="relative overflow-hidden rounded-[18px] border border-[var(--separator)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Podgląd paragonu"
              className="max-h-[200px] w-full object-cover"
            />
          </div>
        ) : file ? (
          <div className="flex h-[120px] items-center justify-center gap-3 rounded-[18px] border border-[var(--separator)] bg-[var(--bg-surface-raised)] px-4">
            <FileText size={28} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
            <p className="min-w-0 truncate text-[15px] font-medium">{file.name}</p>
          </div>
        ) : null}

        {hasFile || showPreviewChrome ? (
          <label className="block">
            <span className="mb-2 block text-[15px] font-medium leading-5">
              Numer paragonu / faktury
            </span>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              readOnly={isLocked}
              placeholder={
                isLocked
                  ? '—'
                  : isProcessing || (!docNumber && hasFile)
                    ? 'Uzupełni się po rozpoznaniu'
                    : 'OCR uzupełni — możesz poprawić'
              }
              className={cn(
                'h-14 w-full rounded-[14px] border bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none transition',
                isLocked
                  ? 'border-transparent text-[var(--text-secondary)]'
                  : isReview
                    ? 'border-[var(--danger)] text-[var(--text-primary)]'
                    : 'border-transparent focus:border-[var(--accent)]',
                !docNumber ? 'placeholder:text-[var(--text-tertiary)]' : '',
              )}
            />
            {isLocked ? null : isReview && reviewHint ? (
              <span className="mt-2 block text-[15px] leading-5 text-[var(--danger)]">
                {reviewHint}
              </span>
            ) : hasFile && (isProcessing || !docNumber) ? (
              <span className="mt-2 block text-[15px] leading-5 text-[var(--text-secondary)]">
                Numer uzupełni się po rozpoznaniu. Możesz zamknąć, kurs zapisze się już teraz.
              </span>
            ) : null}
          </label>
        ) : null}

        {!hasFile && !isLocked && typeof navigator !== 'undefined' && !navigator.onLine ? (
          <p className="text-[15px] leading-5 text-[var(--text-secondary)]">
            Bez sieci paragon zapisze się w telefonie i wyśle po połączeniu.
          </p>
        ) : null}

        {hasFile && !isLocked ? (
          <div className="mt-2 flex flex-col gap-1">
            <Button size="lg" loading={busy} disabled={!file} onClick={() => void submit()}>
              {ctaLabel}
            </Button>
            <button
              type="button"
              onClick={clearFile}
              className="flex h-[52px] items-center justify-center gap-2 text-[16px] font-semibold text-[var(--danger)]"
            >
              <Trash2 size={18} strokeWidth={2} />
              Usuń zdjęcie
            </button>
          </div>
        ) : null}

        {isLocked ? (
          <Button size="lg" variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
        ) : null}
      </div>
    </BottomSheet>
  )
}
