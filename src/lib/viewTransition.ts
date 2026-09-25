/** View Transitions helpers (Safari 18+ / Chrome) with crossfade fallback. */
export function navigateWithViewTransition(navigate: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> }
  }
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      navigate()
    })
    return
  }
  navigate()
}

export function markWowSeen(firstLogin: boolean) {
  try {
    localStorage.setItem('rs-driver-wow-seen', '1')
    if (firstLogin) localStorage.setItem('rs-driver-wow-first-done', '1')
  } catch {
    // ignore
  }
}

export function isReturnVisit(): boolean {
  try {
    return localStorage.getItem('rs-driver-wow-seen') === '1'
  } catch {
    return false
  }
}
