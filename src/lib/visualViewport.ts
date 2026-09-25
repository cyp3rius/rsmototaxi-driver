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

export function syncVisualViewportCssVars() {
  if (typeof document === 'undefined') return
  const inset = readVisualViewportBottomInset()
  document.documentElement.style.setProperty('--vv-bottom', `${inset}px`)
}

/**
 * Safari often leaves `position:fixed; bottom:0` floating above the real bottom
 * after a fullscreen SPA transition (e.g. 5.3–5.4 → 5.5). A tiny scroll forces
 * a layout pass; pairing with visualViewport sync keeps it stuck correctly.
 */
export function forceFixedBottomReflow() {
  if (typeof window === 'undefined') return
  syncVisualViewportCssVars()
  const y = window.scrollY || window.pageYOffset || 0
  window.scrollTo(0, y <= 0 ? 1 : y)
  window.scrollTo(0, y)
  syncVisualViewportCssVars()
}
