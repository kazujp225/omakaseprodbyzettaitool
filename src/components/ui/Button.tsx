'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-navy-800 text-white hover:bg-navy-900 hover:shadow-md focus:ring-navy-800 shadow-sm border border-transparent',
  secondary: 'bg-white text-ink hover:bg-warm-gray-50 hover:border-warm-gray-400 focus:ring-warm-gray-200 border border-warm-gray-200 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md focus:ring-red-500 shadow-sm border border-transparent',
  ghost: 'bg-transparent text-ink hover:bg-warm-gray-100 hover:text-navy-900 focus:ring-warm-gray-200',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs tracking-wide',
  md: 'px-4 py-2 text-sm tracking-wide',
  lg: 'px-6 py-3 text-base tracking-wide',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-[4px]',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'transition-all duration-200 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
