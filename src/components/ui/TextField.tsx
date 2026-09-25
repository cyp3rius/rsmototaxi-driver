'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  labelHint?: ReactNode
  error?: string | null
  prefix?: ReactNode
  suffix?: ReactNode
}

export function TextField({
  label,
  labelHint,
  error,
  className,
  id,
  type,
  prefix,
  suffix,
  ...rest
}: Props) {
  const inputId = id || rest.name || label
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const isDatetime = type === 'datetime-local' || type === 'date' || type === 'time'
  const resolvedType = isPassword && showPassword ? 'text' : type

  return (
    <label className="block min-w-0 max-w-full overflow-hidden">
      <span className="mb-2 block text-[15px] font-medium leading-5 text-[var(--text-primary)]">
        {label}
        {labelHint ? (
          <span className="font-normal text-[var(--text-secondary)]"> {labelHint}</span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative flex h-14 w-full min-w-0 max-w-full items-center overflow-hidden rounded-[14px] border bg-[var(--bg-surface-raised)]',
          error ? 'border-[var(--danger)]' : 'border-transparent focus-within:border-[var(--accent)]',
          prefix || suffix ? 'px-4' : '',
        )}
      >
        {prefix ? (
          <span className="mr-2 shrink-0 text-[17px] font-medium text-[var(--text-secondary)]">
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          type={resolvedType}
          className={cn(
            'box-border h-full w-full min-w-0 max-w-full flex-1 bg-transparent text-[17px] outline-none',
            isDatetime
              ? '[&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-datetime-edit]:min-w-0'
              : '',
            isPassword || suffix ? 'pr-10' : '',
            prefix || suffix ? 'px-0' : 'px-4',
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}
        {suffix && !isPassword ? (
          <span className="ml-2 shrink-0 text-[17px] font-medium text-[var(--text-secondary)]">
            {suffix}
          </span>
        ) : null}
      </span>
      {error ? <span className="mt-1 block text-[15px] text-[var(--danger)]">{error}</span> : null}
    </label>
  )
}
