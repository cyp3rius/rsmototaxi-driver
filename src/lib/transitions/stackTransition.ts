import { EASE_STACK, REDUCED, STACK, prefersReducedMotion } from './motion';

/**
 * 1c · list → detail: detail slides in from the right, list moves -25% and dims.
 * Back: edge swipe that follows the finger, or the back arrow.
 *
 * DOM (inside a `position: relative; overflow: hidden` screen box, below the status bar):
 *   <div class="stack-list">…</div>      list screen (with its bottom nav)
 *   <div class="stack-dim"></div>         absolute, inset 0, background #020407, opacity 0, pointer-events none
 *   <div class="stack-detail">…</div>     absolute, inset 0, background var(--bg)
 *
 * The status bar stays fixed above all three.
 */
export interface StackEls {
  list: HTMLElement;
  dim: HTMLElement;
  detail: HTMLElement;
}

// Render state for progress p: 0 = list only, 1 = detail fully open.
function frame(p: number) {
  return {
    detail: { transform: `translateX(${(1 - p) * 100}%)` },
    list: { transform: `translateX(${STACK.parallax * p}%)` },
    dim: { opacity: String(STACK.dim * p) },
  };
}

function apply(els: StackEls, p: number) {
  const f = frame(p);
  els.detail.style.transform = f.detail.transform;
  els.list.style.transform = f.list.transform;
  els.dim.style.opacity = f.dim.opacity;
}

function animateTo(els: StackEls, from: number, to: number, duration: number): Promise<void> {
  const reduced = prefersReducedMotion();
  if (reduced) {
    // Reduced motion: no movement, 150 ms crossfade of the detail.
    apply(els, to);
    els.list.style.transform = '';
    els.detail.style.transform = '';
    const a = els.detail.animate([{ opacity: from }, { opacity: to }], { duration: REDUCED.duration, easing: 'linear' });
    return a.finished.then(() => undefined, () => undefined);
  }
  const a = frame(from), b = frame(to);
  const opts: KeyframeAnimationOptions = { duration, easing: EASE_STACK };
  const anims = [
    els.detail.animate([a.detail, b.detail], opts),
    els.list.animate([a.list, b.list], opts),
    els.dim.animate([a.dim, b.dim], opts),
  ];
  apply(els, to); // final state lives in inline styles; the animations only cover the motion
  return Promise.all(anims.map((x) => x.finished)).then(() => undefined, () => undefined);
}

export function pushDetail(els: StackEls): Promise<void> {
  els.detail.hidden = false;
  els.detail.style.boxShadow = STACK.shadow;
  els.list.style.pointerEvents = 'none';
  return animateTo(els, 0, 1, STACK.duration);
}

export function popDetail(els: StackEls, from = 1): Promise<void> {
  const duration = Math.max(STACK.minSettle, STACK.duration * from);
  return animateTo(els, from, 0, duration).then(() => {
    els.detail.hidden = true;
    els.detail.style.boxShadow = '';
    els.list.style.pointerEvents = '';
    els.list.style.transform = '';
  });
}

/**
 * Interactive back swipe from the left edge of the detail screen.
 * Put `touch-action: pan-y` on the detail so vertical scrolling keeps working.
 * Returns a cleanup function.
 */
export function attachEdgeSwipe(els: StackEls, onPopped: () => void): () => void {
  const el = els.detail;
  let startX = 0, startY = 0, lastX = 0, lastT = 0, v = 0, width = 1;
  let tracking = false, decided = false;

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const x = e.clientX - el.getBoundingClientRect().left;
    if (x > STACK.edgeWidth) return;
    tracking = true; decided = false;
    startX = lastX = e.clientX; startY = e.clientY; lastT = e.timeStamp; v = 0;
    width = el.offsetWidth;
  };
  const move = (e: PointerEvent) => {
    if (!tracking) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) || dx < 0) { tracking = false; return; } // vertical scroll wins
      decided = true;
      el.setPointerCapture(e.pointerId);
      els.list.style.pointerEvents = 'none';
    }
    const dt = Math.max(1, e.timeStamp - lastT);
    v = (e.clientX - lastX) / dt;
    lastX = e.clientX; lastT = e.timeStamp;
    apply(els, 1 - Math.min(1, Math.max(0, dx / width)));
  };
  const up = (e: PointerEvent) => {
    if (!tracking) return;
    tracking = false;
    if (!decided) return;
    const moved = Math.max(0, (e.clientX - startX) / width);
    const p = 1 - Math.min(1, moved);
    const complete = moved > STACK.completeRatio || v > STACK.flickVelocity;
    if (complete) {
      popDetail(els, p).then(onPopped);
    } else {
      animateTo(els, p, 1, Math.max(STACK.minSettle, STACK.duration * (1 - p)));
    }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
