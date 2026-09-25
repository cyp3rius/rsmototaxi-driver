'use client'

import type { ReactNode } from 'react'
import { DriverChrome } from '@/components/shell/DriverChrome'

export default function AppSectionLayout({ children }: { children: ReactNode }) {
  return <DriverChrome>{children}</DriverChrome>
}
