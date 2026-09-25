'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'success' | 'warning' | 'error'

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<number | null>(null)
  const seq = useRef(0)

  const dismiss = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setToast(null)
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      if (timer.current) window.clearTimeout(timer.current)
      seq.current += 1
      setToast({ id: seq.current, message, tone })
      timer.current = window.setTimeout(() => {
        setToast(null)
        timer.current = null
      }, AUTO_DISMISS_MS)
    },
    [],
  )

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      warning: (message) => show(message, 'warning'),
      error: (message) => show(message, 'error'),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastItem | null
  onDismiss: () => void
}) {
  if (!toast) return null

  const isError = toast.tone === 'error'
  const isWarning = toast.tone === 'warning'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] mx-auto flex max-w-lg justify-center px-5"
      style={{ bottom: 'calc(64px + var(--safe-bottom) + 16px)' }}
    >
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'pointer-events-auto flex max-w-full items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-left shadow-[0_8px_24px_rgba(2,4,7,0.28)]',
          isError
            ? 'bg-[var(--danger)] text-white'
            : isWarning
              ? 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)] ring-1 ring-[color-mix(in_srgb,var(--warning)_45%,transparent)]'
              : 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)] ring-1 ring-[var(--separator)]',
        )}
      >
        <ToneIcon tone={toast.tone} />
        <span className="min-w-0 flex-1 text-[15px] font-[500] leading-5">{toast.message}</span>
        <span
          className={cn(
            'flex size-7 flex-none items-center justify-center rounded-full',
            isError ? 'text-white/80' : 'text-[var(--text-secondary)]',
          )}
          aria-hidden
        >
          <X size={16} strokeWidth={2.2} />
        </span>
      </button>
    </div>
  )
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return (
      <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[var(--success)] text-white">
        <Check size={16} strokeWidth={2.6} />
      </span>
    )
  }
  if (tone === 'warning') {
    return (
      <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[var(--warning)] text-[#020407]">
        <TriangleAlert size={15} strokeWidth={2.4} />
      </span>
    )
  }
  return (
    <span className="flex size-7 flex-none items-center justify-center rounded-full bg-white/20 text-white">
      <X size={16} strokeWidth={2.6} />
    </span>
  )
}
