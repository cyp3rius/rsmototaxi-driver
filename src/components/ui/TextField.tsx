'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
}

export function TextField({ label, error, className, id, type, ...rest }: Props) {
  const inputId = id || rest.name || label
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword && showPassword ? 'text' : type

  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-medium leading-5 text-[var(--text-primary)]">{label}</span>
      <span className="relative block">
        <input
          id={inputId}
          type={resolvedType}
          className={cn(
            'h-14 w-full rounded-[14px] border bg-[var(--bg-surface-raised)] px-4 text-[17px] outline-none transition',
            isPassword ? 'pr-12' : '',
            error ? 'border-[var(--danger)]' : 'border-transparent focus:border-[var(--accent)]',
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
      </span>
      {error ? <span className="mt-1 block text-[15px] text-[var(--danger)]">{error}</span> : null}
    </label>
  )
}
