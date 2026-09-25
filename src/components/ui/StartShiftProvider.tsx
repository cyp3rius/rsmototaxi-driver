'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { StartShiftSheet } from '@/components/ui/StartShiftSheet'

type StartShiftApi = {
  openStartShift: () => void
}

const StartShiftContext = createContext<StartShiftApi | null>(null)

export function StartShiftProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openStartShift = useCallback(() => setOpen(true), [])

  return (
    <StartShiftContext.Provider value={{ openStartShift }}>
      {children}
      <StartShiftSheet open={open} onClose={() => setOpen(false)} />
    </StartShiftContext.Provider>
  )
}

export function useStartShift(): StartShiftApi {
  const ctx = useContext(StartShiftContext)
  if (!ctx) {
    throw new Error('useStartShift must be used within StartShiftProvider')
  }
  return ctx
}
