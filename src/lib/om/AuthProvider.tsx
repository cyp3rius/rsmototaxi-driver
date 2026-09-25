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
import { omClient, type DriverMe } from './client'
import type { AuthSession } from './authStore'

type AuthState = {
  ready: boolean
  session: AuthSession | null
  me: DriverMe | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<DriverMe | null>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [me, setMe] = useState<DriverMe | null>(null)

  const refreshMe = useCallback(async () => {
    try {
      const payload = await omClient.me()
      setMe(payload)
      if (!omClient.getSession()) {
        setSession({
          authenticated: true,
          displayName: payload.member.displayName,
        })
      }
      return payload
    } catch {
      setMe(null)
      return null
    }
  }, [])

  useEffect(() => {
    const unsub = omClient.subscribe((next) => setSession(next))
    void (async () => {
      const hydrated = await omClient.hydrate()
      if (hydrated) await refreshMe()
      setReady(true)
    })()
    return () => {
      unsub()
    }
  }, [refreshMe])

  const login = useCallback(
    async (email: string, password: string) => {
      await omClient.login(email, password)
      await refreshMe()
    },
    [refreshMe],
  )

  const logout = useCallback(async () => {
    await omClient.logout()
    setMe(null)
  }, [])

  const value = useMemo(
    () => ({ ready, session, me, login, logout, refreshMe }),
    [ready, session, me, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
