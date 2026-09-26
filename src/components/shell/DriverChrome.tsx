'use client'

import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { BottomNav, bottomNavContentClearanceCss } from '@/components/shell/BottomNav'
import { DashboardScreen } from '@/components/screens/DashboardScreen'
import { TripsScreen } from '@/components/screens/TripsScreen'
import { ExpensesScreen } from '@/components/screens/ExpensesScreen'
import { PayoutsScreen } from '@/components/screens/PayoutsScreen'
import { ShiftsScreen } from '@/components/screens/ShiftsScreen'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { TabPanes, useReselectScrollTop } from '@/lib/transitions/react/TabPanes'
import {
  TabRefreshProvider,
  useRunTabRefresh,
} from '@/lib/transitions/react/TabRefresh'
import { StackLayer } from '@/lib/transitions/react/StackLayer'
import {
  isStackPath,
  isTabRootPath,
  tabIndexFromPath,
  type TabIndex,
} from '@/lib/transitions/routes'

/**
 * Persistent chrome for 1a (tab fade-through) + 1c (list→detail / form stack).
 * One shell-level PTR + one scroll per tab pane; bottom nav sits outside the scroller.
 */
export function DriverChrome({ children }: { children: ReactNode }) {
  return (
    <TabRefreshProvider>
      <DriverChromeInner>{children}</DriverChromeInner>
    </TabRefreshProvider>
  )
}

function DriverChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/app'
  const router = useRouter()
  const stacked = isStackPath(pathname)
  const pathTab = tabIndexFromPath(pathname)
  const [active, setActive] = useState<TabIndex>(pathTab)
  const onReselect = useReselectScrollTop(active)
  const runTabRefresh = useRunTabRefresh()

  useLayoutEffect(() => {
    // Keep the tab underlay on the screen that opened the stack (e.g. Start →
    // nowy kurs). Syncing from path would flash Kursy/Koszty under the sheet.
    if (stacked) return
    setActive(pathTab)
  }, [pathTab, stacked])

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
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          paddingBottom: bottomNavContentClearanceCss(),
        }}
      >
        <PullToRefresh
          disabled={stacked}
          onRefresh={async () => {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
              throw new Error('offline')
            }
            await runTabRefresh(active)
          }}
        >
          <TabPanes active={active} panes={panes} className="min-h-0 flex-1" />
        </PullToRefresh>
      </div>
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
          if (!isStackPath(pathname)) return
          // Views opened from Start keep underlay tab 0 — return straight to Start
          // (avoid flashing / landing on Kursy or Koszty).
          if (active === 0) {
            router.replace('/app')
            return
          }
          router.back()
        }}
      />
      {!stacked ? <div className="hidden" aria-hidden>{children}</div> : null}
    </AppShell>
  )
}
