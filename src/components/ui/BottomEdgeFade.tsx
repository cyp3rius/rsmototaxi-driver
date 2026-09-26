/** Soft edge fade at the bottom of stack details / sheets. */
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
        'pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-20'
      }
      style={{
        background: `linear-gradient(to top, var(${fromVar}) 0%, color-mix(in srgb, var(${fromVar}) 70%, transparent) 42%, transparent 100%)`,
      }}
    />
  )
}
