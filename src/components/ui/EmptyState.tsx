import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="mb-5 text-gray-400">{icon}</div>}
      <h3 className="text-base font-semibold text-navy-700">{title}</h3>
      {description && <p className="mt-2 text-sm text-navy-400 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function NoDataIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-12 w-12', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'エラーが発生しました',
  message = 'しばらくしてからもう一度お試しください',
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-5 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-navy-700">{title}</h3>
      <p className="mt-2 text-sm text-navy-400 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2.5 text-sm font-medium text-white bg-navy-700 rounded-md hover:bg-navy-800 transition-colors shadow-sm"
        >
          再試行
        </button>
      )}
    </div>
  )
}
