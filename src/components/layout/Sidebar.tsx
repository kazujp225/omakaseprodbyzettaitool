'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  Plus,
  FileText,
  CreditCard,
  AlertTriangle,
  XCircle,
  Users,
  Settings,
  Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Separator } from '@/components/ui/Separator'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    label: 'ダッシュボード',
    href: '/',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: '店舗検索',
    href: '/stores',
    icon: <Search className="h-5 w-5" />,
  },
  {
    label: '新規店舗登録',
    href: '/stores/new',
    icon: <Plus className="h-5 w-5" />,
  },
  {
    label: '契約一覧',
    href: '/contracts',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: '請求（今月）',
    href: '/invoices',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    label: '未入金/督促',
    href: '/overdue',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    label: '解約管理',
    href: '/cancellation',
    icon: <XCircle className="h-5 w-5" />,
  },
  {
    label: '代理店管理',
    href: '/agents',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'コール管理',
    href: '/calls',
    icon: <Phone className="h-5 w-5" />,
  },
  {
    label: '設定',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <div className="relative h-8 w-8 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-full w-full object-contain opacity-90"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            お任せ管理
          </span>
        </div>

        <ScrollArea className="flex-1 py-4">
          <div className="px-3 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contents
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors cursor-pointer group">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                管理者
              </p>
              <p className="text-xs text-muted-foreground truncate">
                admin@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
