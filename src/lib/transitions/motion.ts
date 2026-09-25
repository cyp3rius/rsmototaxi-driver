// Motion tokens for RS Moto Taxi - Kierowca. Keep in sync with README.md.

export const EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
export const EASE_IN = 'cubic-bezier(.4, 0, 1, 1)';
export const EASE_STACK = 'cubic-bezier(.32, .72, 0, 1)';

export const TAB = {
  outDuration: 90,
  inDuration: 210,
  inDelay: 90,
  outShift: 12, // px, towards the opposite side of the tapped tab
  inShift: 20,  // px, from the side of the tapped tab
} as const;

export const STACK = {
  duration: 380,
  parallax: -25,       // % of width the list moves under the detail
  dim: 0.12,           // max opacity of the dim layer over the list
  shadow: '-12px 0 32px rgba(2, 4, 7, .14)',
  edgeWidth: 24,       // px from the left edge where the back swipe can start
  completeRatio: 0.35, // release past 35% of width completes the pop
  flickVelocity: 0.5,  // px/ms, a fast flick completes regardless of distance
  minSettle: 180,      // ms, shortest settle after release
} as const;

export const REDUCED = { duration: 150 } as const;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
