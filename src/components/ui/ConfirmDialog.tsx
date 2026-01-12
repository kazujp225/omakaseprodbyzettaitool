'use client'

import * as React from "react"
import { useState, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./AlertDialog"
import { Input } from "./Input"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./Button"

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
  confirmInput?: string
}

const typeConfig: Record<ConfirmType, { icon: React.ReactNode; bgColor: string; buttonClass: string }> = {
  danger: {
    icon: <AlertTriangle className="h-6 w-6 text-destructive" />,
    bgColor: 'bg-destructive/10',
    buttonClass: buttonVariants({ variant: 'destructive' }),
  },
  warning: {
    icon: <AlertCircle className="h-6 w-6 text-amber-600" />,
    bgColor: 'bg-amber-100',
    buttonClass: buttonVariants({ variant: 'destructive' }),
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-600" />,
    bgColor: 'bg-blue-100',
    buttonClass: buttonVariants({ variant: 'default' }),
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

  const config = typeConfig[type]

  const handleConfirm = async () => {
    if (confirmInput && inputValue !== confirmInput) return

    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
      setInputValue('')
    }
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const isConfirmDisabled = confirmInput ? inputValue !== confirmInput : false

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
              {config.icon}
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">{message}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {confirmInput && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              確認のため「<span className="text-destructive font-semibold">{confirmInput}</span>」と入力してください
            </label>
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmInput}
              className={cn(
                inputValue === confirmInput && "border-green-500 focus-visible:ring-green-500"
              )}
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={handleClose}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled || loading}
            className={config.buttonClass}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Convenience hook
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
