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
  isDetailPath,
  isFullscreenPath,
  isTabRootPath,
  tabIndexFromPath,
  type TabIndex,
} from '@/lib/transitions/routes'

/**
 * Persistent chrome for 1a (tab fade-through) + 1c (list→detail stack).
 * Tab panes stay mounted; bottom nav is inside the list layer so it parallax-slides under detail.
 */
export function DriverChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/app'
  const router = useRouter()
  const fullscreen = isFullscreenPath(pathname)
  const detail = isDetailPath(pathname)
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

  if (fullscreen) {
    return <AppShell hideNav>{children}</AppShell>
  }

  const list = (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)]">
      <TabPanes active={active} panes={panes} className="flex-1" />
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
        open={detail}
        detail={detail ? children : null}
        list={list}
        onClosed={() => {
          // Edge-swipe / animated back finished — sync URL to previous history entry.
          if (isDetailPath(pathname)) router.back()
        }}
      />
      {!detail ? <div className="hidden" aria-hidden>{children}</div> : null}
    </AppShell>
  )
}
