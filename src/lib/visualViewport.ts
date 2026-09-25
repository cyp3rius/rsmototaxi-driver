/** Keep fixed bottom chrome aligned to the real screen bottom (iOS Safari / PWA). */

function readCssViewportHeight(unit: 'lvh' | 'dvh' | 'svh'): number {
  if (typeof document === 'undefined') return 0
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;top:0;left:0;height:100${unit};width:0;visibility:hidden;pointer-events:none`
  document.documentElement.appendChild(probe)
  const h = probe.offsetHeight
  probe.remove()
  return Number.isFinite(h) ? h : 0
}

/** Tallest known layout height — beats iOS “phantom gap” after fullscreen SPA morphs. */
export function readFrameHeight(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  const vvExtent = vv ? vv.offsetTop + vv.height : 0
  return Math.max(
    window.innerHeight,
    document.documentElement?.clientHeight ?? 0,
    vvExtent,
    readCssViewportHeight('lvh'),
    readCssViewportHeight('dvh'),
  )
}

export function readVisualViewportBottomInset(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
}

/** Distance from layout viewport top to the visual viewport’s bottom edge. */
export function readVisualViewportBottomY(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return window.innerHeight
  return vv.offsetTop + vv.height
}

/**
 * True when the visual viewport is clearly shortened (software keyboard / browser UI),
 * not the small “phantom gap” Safari leaves after a fullscreen SPA morph (5.3→5.5).
 */
export function isVisualViewportMeaningfullyShortened(): boolean {
  if (typeof window === 'undefined') return false
  const vv = window.visualViewport
  if (!vv) return false
  const inset = readVisualViewportBottomInset()
  if (inset < 24) return false
  // Keyboard / chrome typically eats a large share of height; morph phantom is ~40–80px.
  return vv.height < window.innerHeight * 0.82
}

export function syncVisualViewportCssVars() {
  if (typeof document === 'undefined') return
  const inset = isVisualViewportMeaningfullyShortened() ? readVisualViewportBottomInset() : 0
  document.documentElement.style.setProperty('--vv-bottom', `${inset}px`)
  document.documentElement.style.setProperty('--app-height', `${readFrameHeight()}px`)
}

/**
 * Safari often leaves `position:fixed` chrome misaligned after a fullscreen SPA
 * transition (e.g. 5.3–5.4 → 5.5). A tiny scroll forces a layout pass.
 */
export function forceFixedBottomReflow() {
  if (typeof window === 'undefined') return
  syncVisualViewportCssVars()
  const y = window.scrollY || window.pageYOffset || 0
  window.scrollTo(0, y <= 0 ? 1 : y)
  window.scrollTo(0, y)
  syncVisualViewportCssVars()
}

/** Custom event: BottomNav / toasts should re-pin after morph or route settle. */
export const VIEWPORT_SETTLE_EVENT = 'rs-driver:viewport-settle'

export function requestViewportSettle() {
  if (typeof window === 'undefined') return
  forceFixedBottomReflow()
  window.dispatchEvent(new Event(VIEWPORT_SETTLE_EVENT))
}

/**
 * Pin a fullscreen fixed chrome shell to the real screen frame.
 * Uses the *max* of layout / visual / large viewport heights so iOS morph
 * phantoms cannot leave a black gap under the tab bar.
 */
export function pinFixedChromeToVisualViewport(el: HTMLElement, maxWidthPx = 512) {
  const vv = window.visualViewport
  el.style.position = 'fixed'
  el.style.margin = '0'
  el.style.inset = ''
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.zIndex = el.style.zIndex || '0'
  el.style.transform = ''

  const layoutW = window.innerWidth
  const vvW = vv?.width ?? layoutW
  const width = Math.min(vvW, maxWidthPx)
  const left = vv
    ? vv.offsetLeft + (vvW - width) / 2
    : (layoutW - width) / 2
  el.style.left = `${Math.max(0, left)}px`
  el.style.width = `${width}px`

  if (vv && isVisualViewportMeaningfullyShortened()) {
    el.style.top = `${vv.offsetTop}px`
    el.style.height = `${vv.height}px`
    return
  }

  el.style.top = '0px'
  el.style.height = `${readFrameHeight()}px`
}

/**
 * Pin a fixed bottom bar to the real screen bottom, or to the visual viewport
 * bottom when the keyboard (etc.) meaningfully shortens it.
 */
export function pinFixedBottomElement(el: HTMLElement) {
  syncVisualViewportCssVars()
  const height = el.offsetHeight

  if (isVisualViewportMeaningfullyShortened()) {
    el.style.bottom = 'auto'
    el.style.top = `${Math.max(0, readVisualViewportBottomY() - height)}px`
    return
  }

  const bottomY = readFrameHeight()
  el.style.bottom = 'auto'
  el.style.top = `${Math.max(0, bottomY - height)}px`
}
