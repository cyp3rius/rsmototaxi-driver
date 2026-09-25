import { EASE_IN, EASE_OUT, REDUCED, TAB, prefersReducedMotion } from './motion';

/**
 * 1a · tab switch: fade-through with direction.
 *
 * Both panes must be stacked in the same content box (between status bar and bottom nav),
 * e.g. `position: absolute; inset: 0` inside a `position: relative; overflow: hidden` parent.
 * The status bar, screen chrome and bottom nav are NOT animated. Update the active tab in
 * the nav immediately on tap, then call this.
 *
 * @param from pane currently visible
 * @param to   pane to show (already rendered, may be hidden)
 * @param dir  +1 when the new tab is to the right of the old one, -1 when to the left
 */
let running: Animation[] = [];

export function tabTransition(from: HTMLElement, to: HTMLElement, dir: 1 | -1): Promise<void> {
  // Rapid taps: jump the previous transition to its end state before starting a new one.
  running.forEach((a) => a.finish());
  running = [];

  to.hidden = false;
  to.style.zIndex = '2';
  from.style.zIndex = '1';
  from.style.pointerEvents = 'none';

  const reduced = prefersReducedMotion();
  const out = from.animate(
    reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: `translateX(${-dir * TAB.outShift}px)` },
        ],
    { duration: reduced ? REDUCED.duration : TAB.outDuration, easing: EASE_IN, fill: 'forwards' },
  );
  const inn = to.animate(
    reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: `translateX(${dir * TAB.inShift}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
    {
      duration: reduced ? REDUCED.duration : TAB.inDuration,
      delay: reduced ? 0 : TAB.inDelay,
      easing: EASE_OUT,
      fill: 'backwards',
    },
  );
  running = [out, inn];

  return Promise.all([out.finished, inn.finished])
    .catch(() => undefined)
    .then(() => {
      out.cancel();
      from.hidden = true;
      from.style.pointerEvents = '';
      from.style.zIndex = '';
      to.style.zIndex = '';
      running = [];
    });
}

/** Re-tap on the active tab: scroll its pane to the top. */
export function scrollPaneToTop(pane: HTMLElement): void {
  const scroller = pane.querySelector<HTMLElement>('[data-scroll]') ?? pane;
  scroller.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
