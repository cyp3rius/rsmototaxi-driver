'use client'

import { useEffect, useRef } from 'react'
import { Spinner } from '@/components/ui/Spinner'

export const INFINITE_PAGE_SIZE = 10

/**
 * Bottom sentinel for infinite lists: when scrolled into view, loads the next page.
 * Shows the shared accent spinner while fetching; renders nothing when there is no more data.
 */
export function InfiniteScrollSentinel({
  hasMore,
  loading,
  onLoadMore,
  disabled,
}: {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    if (!loading) lock.current = false
    if (!hasMore || disabled) return
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (!hit || loading || lock.current) return
        lock.current = true
        onLoadMoreRef.current()
      },
      { root: null, rootMargin: '120px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, disabled])

  if (!hasMore && !loading) return null

  return (
    <div
      ref={ref}
      className="flex min-h-12 items-center justify-center py-3"
      aria-hidden={!loading}
    >
      {loading ? <Spinner size="sm" /> : <span className="h-1 w-1" />}
    </div>
  )
}
