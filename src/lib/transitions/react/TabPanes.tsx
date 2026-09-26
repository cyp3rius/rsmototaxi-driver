'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { tabTransition, scrollPaneToTop } from '@/lib/transitions/tabTransition'

/**
 * 1a · Keeps every tab mounted (scroll + state survive), animates switches.
 * Status bar / bottom nav stay outside — only panes move.
 */
export function TabPanes({
  active,
  panes,
  className,
}: {
  active: number
  panes: ReactNode[]
  className?: string
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const prev = useRef(active)

  useLayoutEffect(() => {
    const from = prev.current
    if (from === active) return
    const a = refs.current[from]
    const b = refs.current[active]
    prev.current = active
    if (a && b) void tabTransition(a, b, active > from ? 1 : -1)
  }, [active])

  return (
    <div className={className} style={{ position: 'relative', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      {panes.map((pane, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          hidden={i !== active}
          data-scroll
          data-tab-pane={i}
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            overscrollBehaviorY: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {pane}
        </div>
      ))}
    </div>
  )
}

export function scrollActivePaneToTop(active: number) {
  const pane = document.querySelector<HTMLElement>(`[data-tab-pane="${active}"]`)
  if (pane) scrollPaneToTop(pane)
}

/** Re-tap on the active tab → scroll its pane to the top. */
export function useReselectScrollTop(active: number) {
  const last = useRef(active)
  useEffect(() => {
    last.current = active
  }, [active])
  return (tapped: number) => {
    if (tapped === last.current) scrollActivePaneToTop(tapped)
  }
}
