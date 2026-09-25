/** Keep fixed bottom chrome aligned to the visual viewport (iOS Safari / PWA). */

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
 * Pin a fixed bottom bar to the real screen bottom, or to the visual viewport
 * bottom when the keyboard (etc.) meaningfully shortens it.
 *
 * Never track rubber-band / morph phantom gaps — those lift the nav “in the air”.
 */
export function pinFixedBottomElement(el: HTMLElement) {
  syncVisualViewportCssVars()
  const vv = window.visualViewport
  if (!vv || !isVisualViewportMeaningfullyShortened()) {
    el.style.top = ''
    el.style.bottom = '0px'
    return
  }
  const height = el.offsetHeight
  el.style.bottom = 'auto'
  el.style.top = `${Math.max(0, readVisualViewportBottomY() - height)}px`
}
