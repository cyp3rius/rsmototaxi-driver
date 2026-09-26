'use client'

import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '@/components/ui/Spinner'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'lg' | 'md'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'lg',
  loading,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: Props) {
  const height = size === 'lg' ? 'h-16 text-[18px]' : 'h-14 text-[17px]'
  const styles =
    variant === 'primary'
      ? 'rs-accent-fill'
      : variant === 'secondary'
        ? 'bg-transparent border border-[var(--separator)] text-[var(--text-primary)]'
        : variant === 'danger'
          ? 'bg-[var(--danger)] text-white'
          : 'bg-transparent text-[var(--text-primary)]'

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2.5 rounded-full font-[600] transition active:scale-[0.98] disabled:opacity-[0.38]',
        height,
        styles,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" aria-hidden className="border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
