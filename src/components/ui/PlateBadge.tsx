import { cn } from '@/lib/cn'

export function PlateBadge({
  plate,
  size = 'md',
  className,
}: {
  plate: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const tall = size === 'md'
  return (
    <span
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-[5px] border border-[rgba(2,4,7,0.3)] bg-white text-[#0A0F14]',
        tall ? 'h-8' : 'h-7',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-end justify-center bg-[#003399] pb-0.5 font-bold text-white',
          tall ? 'w-[18px] text-[9px]' : 'w-4 text-[8px]',
        )}
      >
        PL
      </span>
      <span
        className={cn(
          'flex items-center px-2 font-[family-name:var(--font-display)] font-semibold tracking-[0.04em]',
          tall ? 'text-[18px]' : 'text-[15px]',
          'font-[stretch:112%]',
        )}
        style={{ fontStretch: '112%' }}
      >
        {plate}
      </span>
    </span>
  )
}
