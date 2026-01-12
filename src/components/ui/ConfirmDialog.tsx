'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

type ConfirmType = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  type?: ConfirmType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmInput?: string // 入力が必要な場合（例：「削除」と入力）
}

const typeConfig: Record<ConfirmType, { icon: React.ReactNode; bgColor: string; buttonVariant: 'danger' | 'primary' }> = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bgColor: 'bg-red-100',
    buttonVariant: 'danger',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: 'bg-amber-100',
    buttonVariant: 'danger',
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: 'bg-blue-100',
    buttonVariant: 'primary',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type = 'danger',
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  confirmInput,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isExiting, setIsExiting] = useState(false)

  const config = typeConfig[type]

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      setInputValue('')
      onClose()
    }, 200)
  }, [onClose])

  const handleConfirm = async () => {
    if (confirmInput && inputValue !== confirmInput) return

    setLoading(true)
    try {
      await onConfirm()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const isConfirmDisabled = confirmInput ? inputValue !== confirmInput : false

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-200',
            isExiting ? 'opacity-0' : 'opacity-100'
          )}
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Dialog */}
        <div
          className={cn(
            'relative w-full max-w-md bg-white rounded-xl shadow-2xl',
            'transform transition-all duration-200',
            isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          )}
        >
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-start gap-4">
              <div className={cn('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', config.bgColor)}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-navy-800">{title}</h3>
                <p className="mt-2 text-sm text-navy-500 leading-relaxed">{message}</p>
              </div>
            </div>

            {/* Confirm Input */}
            {confirmInput && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-navy-600 mb-2">
                  確認のため「<span className="text-red-600 font-semibold">{confirmInput}</span>」と入力してください
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 text-sm border rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1',
                    inputValue === confirmInput
                      ? 'border-green-300 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:ring-red-500'
                  )}
                  placeholder={confirmInput}
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                {cancelText}
              </Button>
              <Button
                variant={config.buttonVariant}
                onClick={handleConfirm}
                loading={loading}
                disabled={isConfirmDisabled}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 便利なフック
interface UseConfirmOptions {
  type?: ConfirmType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmInput?: string
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<UseConfirmOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resolveRef?.(false)
  }, [resolveRef])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    resolveRef?.(true)
  }, [resolveRef])

  const Dialog = options ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...options}
    />
  ) : null

  return { confirm, Dialog }
}
