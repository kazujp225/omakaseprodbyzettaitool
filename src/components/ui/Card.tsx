import { cn } from '@/lib/utils'

type CardAccent = 'none' | 'primary' | 'success' | 'warning' | 'danger'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  accent?: CardAccent
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const accentStyles: Record<CardAccent, string> = {
  none: '',
  primary: 'border-t-2 border-t-primary-500',
  success: 'border-t-2 border-t-green-500',
  warning: 'border-t-2 border-t-amber-500',
  danger: 'border-t-2 border-t-red-500',
}

export function Card({ children, className, padding = 'md', accent = 'none' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-card',
        paddingStyles[padding],
        accentStyles[accent],
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  description?: string
  icon?: React.ReactNode
}

export function CardHeader({ children, className, description, icon }: CardHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center text-navy-600">
            {icon}
          </div>
        )}
        <div>
          {children}
          {description && (
            <p className="mt-1 text-sm text-navy-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-bold text-navy-800', className)}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('mt-1.5 text-sm text-navy-400', className)}>
      {children}
    </p>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('', className)}>{children}</div>
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-6 pt-6 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}
