'use client'

import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { BottomNav } from '@/components/shell/BottomNav'
import { DashboardScreen } from '@/components/screens/DashboardScreen'
import { TripsScreen } from '@/components/screens/TripsScreen'
import { ExpensesScreen } from '@/components/screens/ExpensesScreen'
import { PayoutsScreen } from '@/components/screens/PayoutsScreen'
import { ShiftsScreen } from '@/components/screens/ShiftsScreen'
import { TabPanes, useReselectScrollTop } from '@/lib/transitions/react/TabPanes'
import { StackLayer } from '@/lib/transitions/react/StackLayer'
import {
  isStackPath,
  isTabRootPath,
  tabIndexFromPath,
  type TabIndex,
} from '@/lib/transitions/routes'

/**
 * Persistent chrome for 1a (tab fade-through) + 1c (list→detail / form stack).
 * Tab panes stay mounted; bottom nav sits in the list layer (parallax under detail).
 */
export function DriverChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/app'
  const router = useRouter()
  const stacked = isStackPath(pathname)
  const pathTab = tabIndexFromPath(pathname)
  const [active, setActive] = useState<TabIndex>(pathTab)
  const onReselect = useReselectScrollTop(active)

  useLayoutEffect(() => {
    setActive(pathTab)
  }, [pathTab])

  const panes = useMemo(
    () => [
      <DashboardScreen key="start" />,
      <TripsScreen key="trips" />,
      <ExpensesScreen key="expenses" />,
      <PayoutsScreen key="payouts" />,
      <ShiftsScreen key="shifts" />,
    ],
    [],
  )

  const list = (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <TabPanes active={active} panes={panes} className="min-h-0 flex-1" />
      <BottomNav
        activeIndex={active}
        onNavigate={(index, href) => {
          if (index === active && isTabRootPath(pathname)) {
            onReselect(index)
            return
          }
          setActive(index as TabIndex)
          router.push(href)
        }}
      />
    </div>
  )

  return (
    <AppShell hideNav>
      <StackLayer
        open={stacked}
        detail={stacked ? children : null}
        list={list}
        onClosed={() => {
          if (isStackPath(pathname)) router.back()
        }}
      />
      {!stacked ? <div className="hidden" aria-hidden>{children}</div> : null}
    </AppShell>
  )
}
