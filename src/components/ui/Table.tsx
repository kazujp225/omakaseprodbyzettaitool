import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full">{children}</table>
    </div>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return <thead className={cn('bg-gray-50 border-b-2 border-gray-200', className)}>{children}</thead>
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn('bg-white divide-y divide-gray-100', className)}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  clickable?: boolean
  accent?: 'primary' | 'success' | 'warning' | 'danger'
}

const accentStyles = {
  primary: 'hover:border-l-2 hover:border-l-accent-500 hover:pl-[calc(1rem-2px)]',
  success: 'hover:border-l-2 hover:border-l-green-500 hover:pl-[calc(1rem-2px)]',
  warning: 'hover:border-l-2 hover:border-l-amber-500 hover:pl-[calc(1rem-2px)]',
  danger: 'hover:border-l-2 hover:border-l-red-500 hover:pl-[calc(1rem-2px)]',
}

export function TableRow({ children, className, onClick, clickable, accent = 'primary' }: TableRowProps) {
  return (
    <tr
      className={cn(
        clickable && 'hover:bg-gray-50/80 cursor-pointer transition-all duration-150',
        clickable && accentStyles[accent],
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps {
  children?: React.ReactNode
  className?: string
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-bold text-warm-gray-500 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn('px-4 py-4 text-sm text-ink border-b border-warm-gray-100', className)}>
      {children}
    </td>
  )
}
