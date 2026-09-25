'use client'

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 mx-auto max-w-lg px-5"
      style={{ bottom: 'calc(64px + var(--safe-bottom) + 12px)' }}
    >
      <div className="rounded-[18px] bg-[var(--text-primary)] px-4 py-3 text-center text-[15px] font-medium text-[var(--bg-base)] shadow-lg">
        {message}
      </div>
    </div>
  )
}
