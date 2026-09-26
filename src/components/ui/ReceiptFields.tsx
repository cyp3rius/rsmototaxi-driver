'use client'

import { Camera, File, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ReceiptFieldsProps = {
  file: File | null
  previewUrl: string | null
  onPick: (file: File | null) => void
  onClear: () => void
  /** When true, shows “(wymagany)” next to the label. Default true. */
  required?: boolean
  label?: string
}

/**
 * Inline receipt pickers for trip/expense forms (design 5.9 / 5.11).
 * Two entries: camera (`capture`) and file (image/PDF) — same chrome as costs.
 */
export function ReceiptFields({
  file,
  previewUrl,
  onPick,
  onClear,
  required = true,
  label = 'Paragon',
}: ReceiptFieldsProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pick(next: File | null) {
    if (!next) return
    onPick(next)
    if (cameraRef.current) cameraRef.current.value = ''
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <p className="mb-2 text-[15px] font-[500]">
        {label}
        {required ? (
          <span className="font-[400] text-[var(--text-secondary)]"> (wymagany)</span>
        ) : null}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface)] text-[16px] font-[600] active:scale-[0.98]"
        >
          <Camera size={20} strokeWidth={1.9} />
          Zrób zdjęcie
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--separator)] bg-[var(--bg-surface)] text-[16px] font-[600] active:scale-[0.98]"
        >
          <File size={20} strokeWidth={1.9} />
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
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-40 w-full rounded-[14px] object-cover"
          />
          <button
            type="button"
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
            onClick={onClear}
            aria-label="Usuń zdjęcie paragonu"
          >
            <X size={16} />
          </button>
        </div>
      ) : file ? (
        <div className="relative mt-3">
          <p className="rounded-[14px] bg-[var(--bg-surface-raised)] px-4 py-3 pr-12 text-[15px]">
            {file.name}
          </p>
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
            onClick={onClear}
            aria-label="Usuń plik paragonu"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Local file + object-URL preview helper for forms using ReceiptFields. */
export function useReceiptFile() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function pick(next: File | null) {
    if (!next) return
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next.type.startsWith('image/') ? URL.createObjectURL(next) : null
    })
    setFile(next)
  }

  function clear() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setFile(null)
  }

  return { file, previewUrl, pick, clear }
}
