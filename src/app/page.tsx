'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { LoadingState } from '@/components/ui/Spinner'
import { mockContractRepository, mockInvoiceRepository, mockPaymentRepository, mockRouteIntegrationRepository } from '@/repositories/mock'
import { mockAccountRepository, mockPlanRepository } from '@/repositories/mock'
import type { Contract, Invoice, Account, Plan, RouteIntegration, Payment } from '@/domain/types'
import { formatCurrency, formatDate, getOverdueDays } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

interface MetricItemProps {
  label: string
  value: string | number
  subValue?: string
  status?: 'default' | 'success' | 'warning' | 'danger'
  href?: string
  minimal?: boolean
}

function MetricItem({ label, value, subValue, status = 'default', href, minimal = false }: MetricItemProps) {
  const content = (
    <div className={`relative p-6 ${href ? 'hover:bg-muted/50 cursor-pointer' : ''} transition-colors h-full flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">{label}</span>
        {status !== 'default' && !minimal && (
          <span className={`w-2 h-2 rounded-full ${status === 'danger' ? 'bg-destructive' :
            status === 'warning' ? 'bg-amber-500' :
              status === 'success' ? 'bg-green-500' : 'bg-muted-foreground'
            }`} />
        )}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-foreground leading-none tracking-tight whitespace-nowrap text-monospaced-numbers">{value}</span>
        {subValue && <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{subValue}</span>}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{content}</Link> : <div className="h-full">{content}</div>
}

interface AlertItem {
  id: string
  storeName: string
  planName: string
  status: string
  statusVariant: 'success' | 'warning' | 'danger' | 'neutral'
  nextAction: string
  nextActionHref: string
  overdueDays?: number
  updatedAt: Date
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [routes, setRoutes] = useState<RouteIntegration[]>([])
  const [failedPayments, setFailedPayments] = useState<Payment[]>([])
  const [greeting, setGreeting] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [contractsData, accountsData, plansData, overdueInvoices, routeErrors, failedPaymentsData] = await Promise.all([
        mockContractRepository.list(DEFAULT_ORG_ID),
        mockAccountRepository.list(DEFAULT_ORG_ID),
        mockPlanRepository.list(DEFAULT_ORG_ID),
        mockInvoiceRepository.listByStatus(DEFAULT_ORG_ID, ['overdue']),
        mockRouteIntegrationRepository.listByStatus(DEFAULT_ORG_ID, ['error']),
        mockPaymentRepository.listByStatus(DEFAULT_ORG_ID, ['failed']),
      ])
      setContracts(contractsData)
      setAccounts(accountsData)
      setPlans(plansData)
      setInvoices(overdueInvoices)
      setRoutes(routeErrors)
      setFailedPayments(failedPaymentsData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは')
  }, [loadData])

  if (loading) return <LoadingState />

  const activeCount = contracts.filter((c) => c.status === 'active').length
  const overdueCount = invoices.length
  const routeErrorCount = routes.length
  const failedPaymentCount = failedPayments.length
  const monthlyRevenue = contracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.contractMonthlyPriceSnapshot, 0)

  const getAccountName = (accountId: string) => accounts.find((a) => a.id === accountId)?.accountName || '不明'
  const getPlanName = (planId: string) => plans.find((p) => p.id === planId)?.name || '不明'

  const alerts: AlertItem[] = [
    ...failedPayments.map((p): AlertItem => {
      const contract = contracts.find((c) => c.id === p.contractId)
      return {
        id: p.id,
        storeName: contract ? getAccountName(contract.accountId) : '不明なアカウント',
        planName: contract ? getPlanName(contract.planId) : '',
        status: '決済失敗',
        statusVariant: 'danger',
        nextAction: '再決済を実行',
        nextActionHref: `/contracts/${p.contractId}`,
        updatedAt: p.createdAt,
      }
    }),
    ...invoices.map((inv): AlertItem => {
      const contract = contracts.find((c) => c.id === inv.contractId)
      return {
        id: inv.id,
        storeName: contract ? getAccountName(contract.accountId) : '不明なアカウント',
        planName: '月額プラン',
        status: `期限超過 ${getOverdueDays(inv.dueDate)}日`,
        statusVariant: 'danger',
        nextAction: '督促を送信',
        nextActionHref: `/overdue`,
        overdueDays: getOverdueDays(inv.dueDate),
        updatedAt: inv.updatedAt,
      }
    }),
    ...routes.map((r): AlertItem => {
      const contract = contracts.find((c) => c.id === r.contractId)
      return {
        id: r.id,
        storeName: contract ? getAccountName(contract.accountId) : '不明なアカウント',
        planName: 'MEO連携',
        status: '同期エラー',
        statusVariant: 'danger',
        nextAction: 'ログを確認',
        nextActionHref: `/contracts/${r.contractId}`,
        updatedAt: r.updatedAt,
      }
    }),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  return (
    <div className="space-y-10 pb-12">
      {/* Editorial Header */}
      <div className="border-b border-border pb-4 sm:pb-6">
        <div className="flex items-start sm:items-end justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {greeting}、
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-muted-foreground font-medium mt-0.5 sm:mt-1">
              本日の業務状況です。
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground tracking-wider uppercase">TODAY</p>
            <p className="text-sm sm:text-lg md:text-xl font-medium text-foreground text-monospaced-numbers">{formatDate(new Date())}</p>
          </div>
        </div>
      </div>

      {/* Asymmetric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Primary Insight Card (Wider) */}
        <div className="md:col-span-8">
          <Card padding="none" className="h-full overflow-hidden">
            <div className="p-4 md:p-8 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-muted rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none" />

              <div>
                <h2 className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Financial Overview</h2>
                <div className="flex flex-wrap items-baseline gap-2 md:gap-4 mt-2">
                  <span className="text-3xl md:text-5xl font-bold text-foreground tracking-tight text-monospaced-numbers">{formatCurrency(monthlyRevenue)}</span>
                  <span className="text-sm md:text-lg text-muted-foreground font-medium">税込 / 月次</span>
                </div>
              </div>

              <div className="mt-6 md:mt-8 grid grid-cols-2 gap-4 md:gap-8">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">稼働中契約</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{activeCount}<span className="text-sm font-normal text-muted-foreground ml-1">件</span></p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">前月比</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">+12<span className="text-sm font-normal text-green-500 ml-1">%</span></p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Secondary Metric Column */}
        <div className="md:col-span-4 grid grid-cols-2 md:flex md:flex-col gap-4 md:gap-6">
          <Card padding="none" className="flex-1 min-w-0">
            <MetricItem
              label="Action Required"
              value={`${overdueCount + failedPaymentCount}件`}
              status={overdueCount + failedPaymentCount > 0 ? 'danger' : 'default'}
              href="/overdue"
            />
          </Card>
          <Card padding="none" className="flex-1 min-w-0">
            <MetricItem
              label="System Status"
              value={routeErrorCount > 0 ? 'エラー有' : '正常'}
              status={routeErrorCount > 0 ? 'warning' : 'success'}
              minimal
            />
          </Card>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Alerts Section */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              Attention
            </h2>
            <Link href="/overdue" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground">
              すべて表示
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            {alerts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-foreground">すべて正常</h3>
                <p className="text-sm text-muted-foreground mt-1">対応が必要なアラートはありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap">店舗名</TableHead>
                      <TableHead className="whitespace-nowrap w-[120px]">ステータス</TableHead>
                      <TableHead className="whitespace-nowrap hidden sm:table-cell">対応</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden md:table-cell">更新日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.slice(0, 5).map((alert) => (
                      <TableRow
                        key={alert.id}
                        clickable
                        onClick={() => window.location.href = alert.nextActionHref}
                      >
                        <TableCell>
                          <div className="max-w-[150px] sm:max-w-[200px] lg:max-w-none">
                            <p className="font-bold text-foreground truncate text-sm sm:text-[15px]">{alert.storeName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.planName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.statusVariant} dot={alert.statusVariant === 'danger'}>
                            <span className="whitespace-nowrap text-xs sm:text-sm">{alert.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 whitespace-nowrap transition-colors">
                            {alert.nextAction}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap text-monospaced-numbers hidden md:table-cell">
                          {formatDate(alert.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6 overflow-hidden">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Quick Tasks</h3>
            <div className="flex overflow-x-auto pb-4 gap-3 md:grid md:grid-cols-1 md:gap-3 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
              {[
                {
                  label: '請求書作成',
                  count: contracts.filter((c) => c.status === 'active' && c.billingMethod === 'invoice').length,
                  href: '/invoices?status=draft',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                },
                {
                  label: '未入金確認',
                  count: failedPaymentCount,
                  href: '/overdue',
                  urgent: true,
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )
                },
                {
                  label: '解約処理',
                  count: contracts.filter((c) => c.status === 'cancel_pending').length,
                  href: '/cancellation',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex-none w-[200px] md:w-auto snap-center flex items-center justify-between p-4 rounded-lg border transition-all duration-200 group bg-card shadow-sm ${item.urgent && item.count > 0
                    ? 'border-destructive/20 hover:border-destructive/50'
                    : 'border-border hover:border-muted-foreground/50'
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`${item.urgent && item.count > 0 ? 'text-destructive' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>{item.icon}</span>
                    <span className={`text-sm font-medium ${item.urgent && item.count > 0 ? 'text-destructive' : 'text-foreground'
                      }`}>{item.label}</span>
                  </span>
                  {item.count > 0 && (
                    <span className={`text-lg font-bold ${item.urgent ? 'text-destructive' : 'text-foreground'
                      }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
