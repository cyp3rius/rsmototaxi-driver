'use client'

import { useRef, useState } from 'react'
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
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const maxRef = useRef(0)

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return
    const track = trackRef.current
    if (!track) return
    maxRef.current = Math.max(0, track.clientWidth - 56)
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const next = Math.min(maxRef.current, Math.max(0, e.clientX - rect.left - 28))
    setX(next)
  }

  async function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    if (x >= maxRef.current * 0.92) {
      setX(maxRef.current)
      await onConfirm()
      setX(0)
    } else {
      setX(0)
    }
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-16 w-full touch-none rounded-full bg-[var(--bg-surface-raised)]',
        disabled && 'opacity-[0.38]',
      )}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        className="absolute top-1 left-1 size-14 rounded-full bg-[var(--accent)] text-[var(--accent-on)] shadow"
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={label}
      />
    </div>
  )
}
