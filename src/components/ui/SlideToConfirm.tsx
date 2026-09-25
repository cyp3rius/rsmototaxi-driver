'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export function SlideToConfirm({
  label,
  onConfirm,
  disabled,
}: {
  label: string
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLButtonElement>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const maxRef = useRef(0)
  const [max, setMax] = useState(0)
  const xRef = useRef(0)
  const startXRef = useRef(0)
  const startOffsetRef = useRef(0)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const next = Math.max(0, track.clientWidth - 66)
    maxRef.current = next
    setMax(next)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || confirming) return
    measure()
    setDragging(true)
    startXRef.current = e.clientX
    startOffsetRef.current = xRef.current
    thumbRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const next = Math.min(
      maxRef.current,
      Math.max(0, startOffsetRef.current + (e.clientX - startXRef.current)),
    )
    xRef.current = next
    setX(next)
  }

  async function finish(commit: boolean) {
    setDragging(false)
    if (commit) {
      setConfirming(true)
      xRef.current = maxRef.current
      setX(maxRef.current)
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(12)
        }
        await onConfirm()
      } finally {
        window.setTimeout(() => {
          xRef.current = 0
          setX(0)
          setConfirming(false)
        }, 280)
      }
      return
    }
    xRef.current = 0
    setX(0)
  }

  function onPointerUp() {
    if (!dragging) return
    const ratio = maxRef.current > 0 ? xRef.current / maxRef.current : 0
    void finish(ratio >= 0.88)
  }

  const progress = max > 0 ? x / max : 0
  const labelOpacity = Math.max(0, 1 - progress * 1.35)

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-[68px] w-full touch-none select-none overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--accent)_38%,transparent)]',
        disabled && 'opacity-[0.38]',
      )}
      style={{
        background: 'color-mix(in srgb, var(--accent) 16%, var(--bg-surface))',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `calc(${x}px + 66px)`,
          background: 'color-mix(in srgb, var(--accent) 28%, transparent)',
          transition: dragging ? 'none' : 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-11 text-[17px] font-semibold text-[var(--text-primary)]"
        style={{
          opacity: labelOpacity,
          transition: dragging ? 'none' : 'opacity 280ms ease',
        }}
      >
        {label}
      </span>
      <button
        ref={thumbRef}
        type="button"
        disabled={disabled || confirming}
        className="absolute top-[5px] left-[5px] flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-on)] shadow-[0_4px_14px_rgba(2,4,7,0.18)]"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => void finish(false)}
        aria-label={label}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
