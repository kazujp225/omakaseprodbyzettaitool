'use client'

import { cn } from '@/lib/utils'
import { useEffect, useCallback, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ isOpen, onClose, title, description, icon, children, className, size = 'md' }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose]
  )

  const handleClose = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 200)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // 少し遅延を入れてアニメーションをトリガー
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isVisible && !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200',
            isAnimating ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal Panel */}
        <div
          className={cn(
            'relative w-full bg-white rounded-xl shadow-2xl border border-gray-200/50',
            'transform transition-all duration-200 ease-out',
            isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4',
            sizeStyles[size],
            className
          )}
        >
          {/* Header */}
          {title && (
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-start gap-4">
                {icon && (
                  <div className="flex-shrink-0 w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-navy-800">{title}</h2>
                  {description && (
                    <p className="mt-1 text-sm text-navy-400">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-5 mt-5',
        'border-t border-gray-100',
        '-mx-6 -mb-5 px-6 py-4 bg-gray-50/50 rounded-b-xl',
        className
      )}
    >
      {children}
    </div>
  )
}
