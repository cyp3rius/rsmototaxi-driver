'use client'

import { cn } from '@/lib/cn'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
}

export function TextField({ label, error, className, id, ...rest }: Props) {
  const inputId = id || rest.name || label
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium leading-5 text-[var(--text-primary)]">{label}</span>
      <input
        id={inputId}
        className={cn(
          'h-14 w-full rounded-[14px] border bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none transition',
          error ? 'border-[var(--danger)]' : 'border-transparent focus:border-[var(--accent)]',
          className,
        )}
        {...rest}
      />
      {error ? <span className="mt-1 block text-[15px] text-[var(--danger)]">{error}</span> : null}
    </label>
  )
}
