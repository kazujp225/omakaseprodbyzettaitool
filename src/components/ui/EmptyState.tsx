import { FileQuestion, Search, Inbox, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./Button"

type EmptyStateVariant = 'default' | 'search' | 'filter'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

const defaultContent: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  default: {
    icon: <Inbox className="h-12 w-12" />,
    title: 'データがありません',
    description: 'まだデータが登録されていません。',
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    title: '検索結果がありません',
    description: '検索条件に一致する結果が見つかりませんでした。',
  },
  filter: {
    icon: <FileQuestion className="h-12 w-12" />,
    title: '該当するデータがありません',
    description: 'フィルター条件を変更してお試しください。',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const content = defaultContent[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon || content.icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {title || content.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description || content.description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}

export function NoDataIcon({ className }: { className?: string }) {
  return <FileQuestion className={cn('h-12 w-12', className)} />
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6">
          再試行
        </Button>
      )}
    </div>
  )
}
