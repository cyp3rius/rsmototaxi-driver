import { cn } from '@/lib/cn'

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ id: T; label: string }>
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[var(--bg-surface-raised)] p-1">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'h-11 rounded-[10px] text-[15px] font-semibold transition',
              active
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)]',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
