'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'rs-driver-theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // ignore
  }
  return 'system'
}

function systemDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light') return 'light'
  if (preference === 'dark') return 'dark'
  return systemDark() ? 'dark' : 'light'
}

function applyDom(preference: ThemePreference) {
  if (typeof document === 'undefined') return
  const resolved = resolve(preference)
  const root = document.documentElement
  root.dataset.theme = preference === 'system' ? 'system' : preference
  root.dataset.colorScheme = resolved
  root.style.colorScheme = resolved
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const initial = readStored()
    setPreferenceState(initial)
    const next = resolve(initial)
    setResolved(next)
    applyDom(initial)
  }, [])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      setResolved(resolve('system'))
      applyDom('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    setResolved(resolve(next))
    applyDom(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return {
      preference: 'system' as ThemePreference,
      resolved: 'dark' as const,
      setPreference: (_: ThemePreference) => undefined,
    }
  }
  return ctx
}

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Jasny',
  dark: 'Ciemny',
}

export function nextTheme(current: ThemePreference): ThemePreference {
  if (current === 'system') return 'light'
  if (current === 'light') return 'dark'
  return 'system'
}
