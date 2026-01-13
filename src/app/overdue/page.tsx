'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState } from '@/components/ui'
import { mockInvoiceRepository, mockContractRepository, mockAccountRepository, mockPaymentRepository, mockNotificationRepository } from '@/repositories/mock'
import type { Invoice, Contract, Account, Payment, Notification } from '@/domain/types'
import { formatCurrency, formatDate, formatMonth, getOverdueDays } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

interface OverdueItem {
  invoice: Invoice
  contract: Contract
  account: Account
  payments: Payment[]
  notifications: Notification[]
  overdueDays: number
  reminderCount: number
}

export default function OverduePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([])
  const [failedPayments, setFailedPayments] = useState<{ payment: Payment; contract: Contract; account: Account }[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [overdueInvoices, contracts, accounts, failedPaymentsData] = await Promise.all([
        mockInvoiceRepository.listByStatus(DEFAULT_ORG_ID, ['overdue']),
        mockContractRepository.list(DEFAULT_ORG_ID),
        mockAccountRepository.list(DEFAULT_ORG_ID),
        mockPaymentRepository.listByStatus(DEFAULT_ORG_ID, ['failed']),
      ])

      const items: OverdueItem[] = []
      for (const invoice of overdueInvoices) {
        const contract = contracts.find((c) => c.id === invoice.contractId)
        if (!contract) continue
        const account = accounts.find((s) => s.id === contract.accountId)
        if (!account) continue

        const [payments, notifications] = await Promise.all([
          mockPaymentRepository.listByInvoice(invoice.id),
          mockNotificationRepository.listByContract(contract.id),
        ])

        const reminderNotifications = notifications.filter(
          (n) => ['reminder_1', 'reminder_2', 'final_notice'].includes(n.type) && n.status === 'sent'
        )

        items.push({
          invoice,
          contract,
          account,
          payments,
          notifications,
          overdueDays: getOverdueDays(invoice.dueDate),
          reminderCount: reminderNotifications.length,
        })
      }

      items.sort((a, b) => b.overdueDays - a.overdueDays)
      setOverdueItems(items)

      const failedItems = failedPaymentsData.map((payment) => {
        const contract = contracts.find((c) => c.id === payment.contractId)
        const account = contract ? accounts.find((a) => a.id === contract.accountId) : null
        return { payment, contract: contract!, account: account! }
      }).filter((item) => item.contract && item.account)
      setFailedPayments(failedItems)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return <LoadingState />
  }

  const totalOverdue = overdueItems.reduce((sum, item) => sum + item.invoice.amount, 0)
  const criticalCount = overdueItems.filter(item => item.overdueDays >= 14).length
  const hasIssues = overdueItems.length > 0 || failedPayments.length > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${hasIssues ? 'bg-destructive/10' : 'bg-green-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {hasIssues ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">未入金/督促</h1>
            <p className="text-sm text-muted-foreground">
              {hasIssues ? '期限超過・決済失敗の案件を管理' : 'すべての請求が正常に処理されています'}
            </p>
          </div>
        </div>
        {hasIssues && (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg self-start sm:self-auto">
            <span className="w-2 h-2 bg-destructive/100 rounded-full" />
            <span className="text-sm font-medium text-destructive">要対応あり</span>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm" accent={overdueItems.length > 0 ? 'danger' : 'success'}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${overdueItems.length > 0 ? 'bg-destructive/10' : 'bg-green-50'} rounded-lg flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${overdueItems.length > 0 ? 'text-destructive' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">未入金件数</p>
              <p className={`text-xl font-bold ${overdueItems.length > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {overdueItems.length}件
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm" accent={failedPayments.length > 0 ? 'warning' : 'none'}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${failedPayments.length > 0 ? 'bg-amber-50' : 'bg-muted'} rounded-lg flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${failedPayments.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">決済失敗</p>
              <p className={`text-xl font-bold ${failedPayments.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {failedPayments.length}件
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${criticalCount > 0 ? 'bg-destructive/10' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${criticalCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">14日超過（危険）</p>
              <p className={`text-xl font-bold ${criticalCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {criticalCount}件
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">未回収金額</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalOverdue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Failed payments section */}
      {failedPayments.length > 0 && (
        <Card padding="none">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-md flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">決済失敗（優先対応）</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">再決済依頼または支払い方法の変更が必要です</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗名</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead className="hidden sm:table-cell">失敗理由</TableHead>
                  <TableHead className="hidden md:table-cell">発生日</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedPayments.map(({ payment, contract, account }) => (
                  <TableRow key={payment.id} clickable onClick={() => router.push(`/contracts/${contract.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-50 rounded-md flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-amber-700">{account.accountName.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{account.accountName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">{formatCurrency(payment.amount)}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="danger">{payment.failureReason || '不明'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${contract.id}`) }}>
                        対応
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Overdue items */}
      <Card padding="none">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-destructive/10 rounded-md flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">期限超過一覧</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">延滞日数順（長い順）</p>
              </div>
            </div>
            {overdueItems.length > 0 && (
              <Button variant="secondary" size="sm" className="self-start sm:self-auto">
                <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">CSV出力</span>
              </Button>
            )}
          </div>
        </div>

        {overdueItems.length === 0 ? (
          <div className="p-8 sm:p-16">
            <EmptyState
              icon={
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
              title="未入金の請求はありません"
              description="すべての請求が期限内に入金されています"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗名</TableHead>
                  <TableHead className="hidden sm:table-cell">対象月</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>延滞</TableHead>
                  <TableHead className="hidden md:table-cell">督促回数</TableHead>
                  <TableHead className="hidden lg:table-cell">支払方法</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueItems.map(({ invoice, contract, account, overdueDays, reminderCount }) => {
                  const urgencyLevel = overdueDays >= 14 ? 'critical' : overdueDays >= 7 ? 'warning' : 'normal'
                  return (
                    <TableRow
                      key={invoice.id}
                      clickable
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                      className={urgencyLevel === 'critical' ? 'bg-destructive/10/30' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 ${urgencyLevel === 'critical' ? 'bg-destructive/10' : urgencyLevel === 'warning' ? 'bg-amber-50' : 'bg-muted'} rounded-md flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-xs sm:text-sm font-semibold ${urgencyLevel === 'critical' ? 'text-destructive' : urgencyLevel === 'warning' ? 'text-amber-700' : 'text-primary'}`}>
                              {account.accountName.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{account.accountName}</p>
                            {contract.cancellationReason && (
                              <p className="text-sm text-muted-foreground hidden sm:block truncate">{contract.cancellationReason}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatMonth(invoice.billingMonth)}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground text-sm sm:text-base">{formatCurrency(invoice.amount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={overdueDays >= 14 ? 'danger' : overdueDays >= 7 ? 'warning' : 'neutral'}>
                          {overdueDays}日
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${i < reminderCount ? 'bg-destructive/100' : 'bg-border'}`}
                            />
                          ))}
                          <span className={`ml-2 text-sm ${reminderCount >= 2 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {reminderCount}回
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="neutral">
                          {contract.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={reminderCount >= 2 ? 'danger' : 'primary'}
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${contract.id}`) }}
                        >
                          <span className="hidden sm:inline">{reminderCount === 0 ? '督促1回目' : reminderCount === 1 ? '督促2回目' : '最終通知'}</span>
                          <span className="sm:hidden">督促</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
