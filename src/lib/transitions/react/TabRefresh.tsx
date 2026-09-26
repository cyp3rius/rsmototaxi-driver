'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

type RefreshFn = () => Promise<void>

type TabRefreshApi = {
  register: (tab: number, fn: RefreshFn) => void
  unregister: (tab: number) => void
  run: (tab: number) => Promise<void>
}

const TabRefreshContext = createContext<TabRefreshApi | null>(null)

/** Shell-owned registry: each tab screen registers its reload for chrome-level PTR. */
export function TabRefreshProvider({ children }: { children: ReactNode }) {
  const map = useRef(new Map<number, RefreshFn>())

  const register = useCallback((tab: number, fn: RefreshFn) => {
    map.current.set(tab, fn)
  }, [])

  const unregister = useCallback((tab: number) => {
    map.current.delete(tab)
  }, [])

  const run = useCallback(async (tab: number) => {
    const fn = map.current.get(tab)
    if (fn) await fn()
  }, [])

  return (
    <TabRefreshContext.Provider value={{ register, unregister, run }}>
      {children}
    </TabRefreshContext.Provider>
  )
}

export function useRegisterTabRefresh(tab: number, fn: RefreshFn) {
  const ctx = useContext(TabRefreshContext)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!ctx) return
    const wrapped = () => fnRef.current()
    ctx.register(tab, wrapped)
    return () => ctx.unregister(tab)
  }, [ctx, tab])
}

export function useRunTabRefresh() {
  const ctx = useContext(TabRefreshContext)
  return useCallback(
    async (tab: number) => {
      if (ctx) await ctx.run(tab)
    },
    [ctx],
  )
}
