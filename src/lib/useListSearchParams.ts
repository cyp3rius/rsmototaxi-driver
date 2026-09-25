'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Sync list filters/sort with the URL so router.back() from a detail screen
 * restores the same tab, scope, and sort the user had.
 */
export function useListSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const get = useCallback(
    (key: string) => searchParams.get(key),
    [searchParams],
  )

  const patch = useCallback(
    (updates: Record<string, string | null | undefined>, opts?: { remove?: string[] }) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const key of opts?.remove || []) next.delete(key)
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') next.delete(key)
        else next.set(key, value)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return useMemo(() => ({ get, patch, searchParams }), [get, patch, searchParams])
}
