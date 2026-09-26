/** Soft edge fade at the bottom of stack details / sheets. */
export const BOTTOM_EDGE_FADE_HEIGHT_PX = 80

/** Extra scroll padding so content clears the fade (fade height + small gap). */
export const BOTTOM_EDGE_FADE_PAD_PX = BOTTOM_EDGE_FADE_HEIGHT_PX + 16

export function BottomEdgeFade({
  className,
  fromVar = '--bg-base',
}: {
  className?: string
  /** CSS variable name used as the opaque end of the gradient. */
  fromVar?: string
} = {}) {
  return (
    <div
      aria-hidden
      className={
        className ??
        'pointer-events-none absolute inset-x-0 bottom-0 z-[15]'
      }
      style={{
        height: BOTTOM_EDGE_FADE_HEIGHT_PX,
        background: `linear-gradient(to top, var(${fromVar}) 0%, color-mix(in srgb, var(${fromVar}) 70%, transparent) 42%, transparent 100%)`,
      }}
    />
  )
}
