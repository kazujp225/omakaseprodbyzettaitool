'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState } from '@/components/ui'
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
}

function MetricItem({ label, value, subValue, status = 'default', href }: MetricItemProps) {
  const statusColors = {
    default: 'bg-navy-600',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-accent-500',
  }

  const content = (
    <div className={`relative p-6 ${href ? 'hover:bg-navy-50 cursor-pointer' : ''} transition-colors h-full`}>
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusColors[status]}`} />

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-navy-400 tracking-wider uppercase">{label}</span>
        {status !== 'default' && (
          <span className={`w-2 h-2 rounded-full ${status === 'danger' ? 'bg-accent-500' :
            status === 'warning' ? 'bg-amber-500' :
              status === 'success' ? 'bg-green-500' : 'bg-navy-300'
            }`} />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-navy-900 leading-none tracking-tight whitespace-nowrap">{value}</span>
        {subValue && <span className="text-sm font-medium text-navy-400 whitespace-nowrap">{subValue}</span>}
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white border border-gray-200 rounded flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-navy-500 font-medium mt-0.5">システム状況とアラートの概要</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card padding="none" className="overflow-hidden border-gray-200">
          <MetricItem
            label="月次売上"
            value={formatCurrency(monthlyRevenue)}
            subValue="税込"
            href="/invoices"
          />
        </Card>
        <Card padding="none" className="overflow-hidden border-gray-200">
          <MetricItem
            label="稼働中契約"
            value={`${activeCount}件`}
            status="success"
            href="/contracts?status=active"
          />
        </Card>
        <Card padding="none" className="overflow-hidden border-gray-200">
          <MetricItem
            label="要対応"
            value={`${overdueCount + failedPaymentCount}件`}
            status={overdueCount + failedPaymentCount > 0 ? 'danger' : 'default'}
            href="/overdue"
          />
        </Card>
        <Card padding="none" className="overflow-hidden border-gray-200">
          <MetricItem
            label="システム状態"
            value={routeErrorCount > 0 ? 'エラー有' : '正常'}
            status={routeErrorCount > 0 ? 'warning' : 'success'}
          />
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Alerts Section */}
        <div className="xl:col-span-2">
          <Card padding="none" className="border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-base font-bold text-navy-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                要対応アラート
              </h2>
              <Link href="/overdue" className="text-sm font-medium text-navy-600 hover:text-navy-900 transition-colors">
                すべて表示 &rarr;
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-navy-800">すべて正常</h3>
                <p className="text-sm text-navy-400 mt-1">対応が必要なアラートはありません</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">店舗名</TableHead>
                    <TableHead className="whitespace-nowrap w-[120px]">ステータス</TableHead>
                    <TableHead className="whitespace-nowrap">対応</TableHead>
                    <TableHead className="text-right whitespace-nowrap">更新日時</TableHead>
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
                        <div className="max-w-[200px] lg:max-w-none">
                          <p className="font-medium text-navy-800 truncate">{alert.storeName}</p>
                          <p className="text-sm text-navy-400 mt-0.5 truncate">{alert.planName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.statusVariant} dot={alert.statusVariant === 'danger'}>
                          <span className="whitespace-nowrap">{alert.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-navy-600 hover:text-navy-900 flex items-center gap-1 whitespace-nowrap">
                          {alert.nextAction}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-navy-400 text-sm whitespace-nowrap">
                        {formatDate(alert.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="border-gray-200">
            <h3 className="text-base font-bold text-navy-800 mb-4 px-1">業務タスク</h3>
            <div className="space-y-3">
              {[
                {
                  label: '請求書下書き',
                  count: contracts.filter((c) => c.status === 'active' && c.billingMethod === 'invoice').length,
                  href: '/invoices?status=draft',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                },
                {
                  label: '決済エラー',
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
                  label: '解約手続き',
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
                  className={`flex items-center justify-between p-4 rounded border transition-all duration-200 group ${item.urgent && item.count > 0
                      ? 'bg-red-50 border-red-200 hover:border-red-300'
                      : 'bg-white border-gray-200 hover:border-navy-300 hover:shadow-sm'
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`${item.urgent && item.count > 0 ? 'text-red-500' : 'text-navy-400 group-hover:text-navy-600'
                      }`}>{item.icon}</span>
                    <span className={`text-sm font-medium ${item.urgent && item.count > 0 ? 'text-red-800' : 'text-navy-700'
                      }`}>{item.label}</span>
                  </span>
                  {item.count > 0 && (
                    <span className={`text-lg font-bold ${item.urgent ? 'text-red-600' : 'text-navy-800'
                      }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="border-gray-200">
            <h3 className="text-sm font-bold text-navy-500 mb-3 uppercase tracking-wider">システム情報</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-navy-500">最終更新</span>
                <span className="font-mono text-navy-800">{formatDate(new Date())}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-navy-500">接続状態</span>
                <span className="flex items-center gap-2 text-green-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-600" />
                  正常稼働中
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
