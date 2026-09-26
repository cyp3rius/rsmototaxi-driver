import { cn } from '@/lib/cn'

export function PlateBadge({
  plate,
  size = 'md',
  className,
}: {
  plate: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const dims =
    size === 'xl'
      ? {
          h: 'h-[50px]',
          pl: 'w-[26px] pb-1 text-[11px]',
          text: 'px-3.5 text-[30px]',
          radius: 'rounded-[7px]',
        }
      : size === 'lg'
        ? {
            h: 'h-[42px]',
            pl: 'w-[22px] pb-1 text-[10px]',
            text: 'px-[11px] text-[24px]',
            radius: 'rounded-[6px]',
          }
        : size === 'md'
          ? {
              h: 'h-8',
              pl: 'w-[18px] pb-0.5 text-[9px]',
              text: 'px-2 text-[18px]',
              radius: 'rounded-[5px]',
            }
          : {
              h: 'h-7',
              pl: 'w-4 pb-0.5 text-[8px]',
              text: 'px-2 text-[15px]',
              radius: 'rounded-[5px]',
            }

  return (
    <span
      className={cn(
        'inline-flex items-stretch overflow-hidden border border-[rgba(2,4,7,0.3)] bg-white text-[#0A0F14]',
        dims.h,
        dims.radius,
        className,
      )}
    >
      <span className={cn('flex items-end justify-center bg-[#003399] font-bold text-white', dims.pl)}>
        PL
      </span>
      <span
        className={cn(
          'flex items-center font-[family-name:var(--font-display)] font-semibold tracking-[0.04em]',
          dims.text,
        )}
        style={{ fontStretch: '112%' }}
      >
        {plate}
      </span>
    </span>
  )
}
