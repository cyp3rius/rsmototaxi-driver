'use client'

import { createContext, useContext } from 'react'

/** True while pull-to-refresh holds the top spinner — page LoadingBlock must hide. */
export const PtrRefreshingContext = createContext(false)

export function usePtrRefreshing() {
  return useContext(PtrRefreshingContext)
}
