'use client'

import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export function Select({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  disabled,
  id
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string, shouldClose = true) => {
    if (disabled) return
    onChange?.(optionValue)
    if (shouldClose) setIsOpen(false)
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-navy-600 mb-2"
        >
          {label}
        </label>
      )}

      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return

          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (isOpen) {
              setIsOpen(false)
            } else {
              setIsOpen(true)
            }
          }

          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            // If closed, open it but don't select yet
            if (!isOpen) {
              setIsOpen(true)
              return
            }

            const currentIndex = options.findIndex(opt => opt.value === value)
            const nextIndex = e.key === 'ArrowDown'
              ? (currentIndex + 1) % options.length
              : (currentIndex - 1 + options.length) % options.length

            // Select but keep open
            const targetIndex = currentIndex === -1 ? 0 : nextIndex
            handleSelect(options[targetIndex].value, false)
          }

          if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between',
          'rounded-md border px-4 py-2.5 text-base text-left',
          'transition-all duration-200 ease-out',
          'bg-white text-ink shadow-sm',
          error
            ? 'border-red-300 focus:ring-red-200'
            : 'border-warm-gray-200 hover:border-warm-gray-300 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 focus:ring-offset-0',
          disabled && 'bg-warm-gray-50 text-warm-gray-400 cursor-not-allowed opacity-70',
          isOpen && 'border-navy-600 ring-2 ring-navy-100',
          className
        )}
      >
        <span className={cn('block truncate', !selectedOption && 'text-warm-gray-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none flex items-center ml-2">
          <svg
            className={cn(
              "h-4 w-4 text-warm-gray-400 transition-transform duration-200",
              isOpen && "transform rotate-180 text-navy-600"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white rounded-lg shadow-xl border border-warm-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
          <div className="max-h-60 overflow-auto scrollbar-thin py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors',
                  option.value === value
                    ? 'bg-navy-50 text-navy-900 font-medium'
                    : 'text-ink hover:bg-warm-gray-50'
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <svg className="w-4 h-4 text-navy-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

