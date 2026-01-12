'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-navy-600 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-md border px-4 py-2.5 text-base text-ink',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-colors duration-200 ease-out',
            'placeholder:text-warm-gray-400 bg-white shadow-sm',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-warm-gray-200 hover:border-warm-gray-300 focus:border-navy-600 focus:ring-navy-100',
            'disabled:bg-warm-gray-50 disabled:text-warm-gray-400 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-2 text-sm text-navy-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
