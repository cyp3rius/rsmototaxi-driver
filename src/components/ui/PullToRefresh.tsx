'use client'

import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from 'react'

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>
  children: ReactNode
}) {
  const startY = useRef(0)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return
      startY.current = e.touches[0]?.clientY ?? 0
    },
    [refreshing],
  )

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing || !startY.current) return
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current
      if (dy > 0) setPull(Math.min(88, dy * 0.45))
    },
    [refreshing],
  )

  const onTouchEnd = useCallback(async () => {
    if (pull > 56 && !refreshing) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPull(0)
    startY.current = 0
  }, [onRefresh, pull, refreshing])

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => void onTouchEnd()}>
      <div
        className="flex items-center justify-center overflow-hidden text-[15px] text-[var(--text-secondary)] transition-[height]"
        style={{ height: refreshing ? 40 : pull }}
      >
        {refreshing || pull > 40 ? (refreshing ? 'Odświeżanie…' : 'Puść, aby odświeżyć') : null}
      </div>
      {children}
    </div>
  )
}
