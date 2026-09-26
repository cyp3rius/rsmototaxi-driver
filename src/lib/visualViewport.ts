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

/** Home-screen / installed PWA (no Safari toolbars). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean(nav.standalone)
  )
}

/**
 * Live-measure safe-area insets. Prefer this over CSS custom props alone —
 * iOS can report env() as 0 at first paint (esp. display:fullscreen), then
 * never refresh vars defined as `env(...)` on :root.
 */
export function readSafeAreaInsets(): {
  top: number
  right: number
  bottom: number
  left: number
} {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText =
    'position:fixed;inset:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);' +
    'padding-left:env(safe-area-inset-left,0px);'
  document.documentElement.appendChild(el)
  const cs = getComputedStyle(el)
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  }
  el.remove()
  return insets
}

/**
 * Frame height for the driver chrome.
 * Must match the *visible* layout viewport — never `screen.height`.
 * Oversizing clips the tab-bar labels and ActionBar safe-area padding under
 * `overflow:hidden`, which looks like “icons only” / “footer button covered”.
 */
export function readFrameHeight(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport

  if (isStandaloneDisplay()) {
    return Math.round(
      Math.max(window.innerHeight, vv?.height ?? 0, readCssViewportHeight('dvh')),
    )
  }

  const vvExtent = vv ? vv.offsetTop + vv.height : 0
  return Math.round(
    Math.max(
      window.innerHeight,
      document.documentElement?.clientHeight ?? 0,
      vvExtent,
      readCssViewportHeight('lvh'),
      readCssViewportHeight('dvh'),
    ),
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
  return vv.height < window.innerHeight * 0.82
}

export function syncVisualViewportCssVars() {
  if (typeof document === 'undefined') return
  const inset = isVisualViewportMeaningfullyShortened() ? readVisualViewportBottomInset() : 0
  let safe = readSafeAreaInsets()

  // iOS display:fullscreen (and some standalone installs) report env() = 0 while
  // black-translucent still draws under the status bar / home indicator.
  // Without a fallback, titles collide with the clock and the tab bar floats.
  if (
    isStandaloneDisplay() &&
    safe.top === 0 &&
    safe.bottom === 0 &&
    typeof window !== 'undefined' &&
    Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0) >= 375 &&
    Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0) >= 812
  ) {
    const tall = Math.max(window.screen.width, window.screen.height)
    safe = {
      ...safe,
      top: tall >= 852 ? 59 : 47,
      bottom: 34,
    }
  }

  document.documentElement.style.setProperty('--vv-bottom', `${inset}px`)
  document.documentElement.style.setProperty('--app-height', `${readFrameHeight()}px`)
  document.documentElement.style.setProperty('--safe-top', `${safe.top}px`)
  document.documentElement.style.setProperty('--safe-bottom', `${safe.bottom}px`)
  document.documentElement.style.setProperty('--safe-left', `${safe.left}px`)
  document.documentElement.style.setProperty('--safe-right', `${safe.right}px`)
  const mode = isStandaloneDisplay()
    ? window.matchMedia('(display-mode: fullscreen)').matches
      ? 'fullscreen'
      : 'standalone'
    : 'browser'
  document.documentElement.dataset.displayMode = mode
}

/**
 * Safari often leaves `position:fixed` chrome misaligned after a fullscreen SPA
 * transition. A tiny scroll forces a layout pass — but only in an unlocked Safari tab.
 * Never do this in PWA / while root scroll is locked (it shifts the whole shell).
 */
export function forceFixedBottomReflow() {
  if (typeof window === 'undefined') return
  syncVisualViewportCssVars()
  if (rootScrollLockCount > 0 || isStandaloneDisplay()) return
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

let rootScrollLockCount = 0
let lockedScrollY = 0

function isTouchInsideScroller(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('[data-scroll], [data-sheet-panel], .rs-scrollable'))
}

function preventRootTouchMove(e: TouchEvent) {
  if (isTouchInsideScroller(e.target)) return
  e.preventDefault()
}

/**
 * Freeze document rubber-band so only in-chrome scrollers (`[data-scroll]`) move.
 * Without this, iOS can pan the layout viewport while the list scrolls separately —
 * hiding the top of the shell and leaving a gap under the tab bar.
 */
export function lockAppViewport() {
  if (typeof document === 'undefined') return
  rootScrollLockCount += 1
  if (rootScrollLockCount > 1) return

  lockedScrollY = window.scrollY || window.pageYOffset || 0
  document.documentElement.classList.add('rs-app-lock')
  document.body.style.top = `-${lockedScrollY}px`
  window.scrollTo(0, 0)
  syncVisualViewportCssVars()
  document.addEventListener('touchmove', preventRootTouchMove, { passive: false })
}

export function unlockAppViewport() {
  if (typeof document === 'undefined') return
  rootScrollLockCount = Math.max(0, rootScrollLockCount - 1)
  if (rootScrollLockCount > 0) return

  document.removeEventListener('touchmove', preventRootTouchMove)
  document.documentElement.classList.remove('rs-app-lock')
  document.body.style.top = ''
  window.scrollTo(0, lockedScrollY)
  lockedScrollY = 0
}

/**
 * Pin a fullscreen fixed chrome shell to the real screen frame.
 * Prefer top+bottom stretch (matches CSS). Only set an explicit height when the
 * visual viewport is meaningfully shortened (keyboard) or in Safari tab mode.
 */
export function pinFixedChromeToVisualViewport(el: HTMLElement, maxWidthPx = 512) {
  const vv = window.visualViewport
  el.style.position = 'fixed'
  el.style.margin = '0'
  el.style.inset = ''
  el.style.right = 'auto'
  el.style.zIndex = el.style.zIndex || '0'
  el.style.transform = ''

  const layoutW = window.innerWidth
  const vvW = vv?.width ?? layoutW
  const width = Math.min(vvW, maxWidthPx)
  const left = vv ? vv.offsetLeft + (vvW - width) / 2 : (layoutW - width) / 2
  el.style.left = `${Math.max(0, left)}px`
  el.style.width = `${width}px`

  if (vv && isVisualViewportMeaningfullyShortened()) {
    el.style.top = `${vv.offsetTop}px`
    el.style.bottom = 'auto'
    el.style.height = `${vv.height}px`
    return
  }

  if (isStandaloneDisplay()) {
    el.style.top = '0px'
    el.style.bottom = '0px'
    el.style.height = 'auto'
    return
  }

  el.style.top = '0px'
  el.style.bottom = 'auto'
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

  if (isStandaloneDisplay()) {
    el.style.top = ''
    el.style.bottom = '0px'
    return
  }

  const bottomY = readFrameHeight()
  el.style.bottom = 'auto'
  el.style.top = `${Math.max(0, bottomY - height)}px`
}
