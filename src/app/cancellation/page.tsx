'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState } from '@/components/ui'
import { mockContractRepository, mockAccountRepository, mockPlanRepository, mockInvoiceRepository, mockPaymentRepository, mockRouteIntegrationRepository } from '@/repositories/mock'
import type { Contract, Account, Plan, Invoice, Payment, RouteIntegration } from '@/domain/types'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT, ROUTE_STATUS_LABELS, ROUTE_STATUS_VARIANT } from '@/domain/status'
import { formatDate } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

interface CancellationItem {
  contract: Contract
  account: Account
  plan: Plan
  lastInvoice: Invoice | null
  lastPayment: Payment | null
  route: RouteIntegration | null
  canComplete: boolean
  blockers: string[]
}

export default function CancellationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CancellationItem[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [contracts, accounts, plans] = await Promise.all([
        mockContractRepository.filter(DEFAULT_ORG_ID, { status: ['cancel_pending'] }),
        mockAccountRepository.list(DEFAULT_ORG_ID),
        mockPlanRepository.list(DEFAULT_ORG_ID),
      ])

      const cancellationItems: CancellationItem[] = []

      for (const contract of contracts) {
        const account = accounts.find((a) => a.id === contract.accountId)
        const plan = plans.find((p) => p.id === contract.planId)
        if (!account || !plan) continue

        const [invoices, payments, route] = await Promise.all([
          mockInvoiceRepository.listByContract(contract.id),
          mockPaymentRepository.listByContract(contract.id),
          mockRouteIntegrationRepository.getByContract(contract.id),
        ])

        const sortedInvoices = invoices.sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime())
        const lastInvoice = sortedInvoices[0] || null
        const lastPayment = lastInvoice
          ? payments.find((p) => p.invoiceId === lastInvoice.id && p.status === 'succeeded') || null
          : null

        const blockers: string[] = []
        if (lastInvoice && lastInvoice.status !== 'paid') {
          blockers.push('最終請求が未入金')
        }
        if (route && !['paused', 'deleted'].includes(route.status)) {
          blockers.push('ルートが停止/削除されていない')
        }

        cancellationItems.push({
          contract,
          account,
          plan,
          lastInvoice,
          lastPayment,
          route,
          canComplete: blockers.length === 0,
          blockers,
        })
      }

      setItems(cancellationItems)
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

  const readyToComplete = items.filter((i) => i.canComplete)
  const waitingItems = items.filter((i) => !i.canComplete)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">解約管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">解約予定の契約を管理</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">解約予定</p>
              <p className="text-xl font-bold text-foreground">{items.length}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${readyToComplete.length > 0 ? 'bg-green-50' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${readyToComplete.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">完了可能</p>
              <p className={`text-xl font-bold ${readyToComplete.length > 0 ? 'text-green-600' : 'text-foreground'}`}>
                {readyToComplete.length}件
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${waitingItems.length > 0 ? 'bg-amber-50' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${waitingItems.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">対応待ち</p>
              <p className={`text-xl font-bold ${waitingItems.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {waitingItems.length}件
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            title="解約予定の契約はありません"
            description="すべての契約が通常稼働中です"
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">解約予定一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗名</TableHead>
                  <TableHead className="hidden md:table-cell">プラン</TableHead>
                  <TableHead className="hidden sm:table-cell">解約予定日</TableHead>
                  <TableHead className="hidden lg:table-cell">最終請求</TableHead>
                  <TableHead className="hidden lg:table-cell">ルート状態</TableHead>
                  <TableHead>完了条件</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(({ contract, account, plan, lastInvoice, route, canComplete, blockers }) => (
                  <TableRow
                    key={contract.id}
                    clickable
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    className={canComplete ? 'bg-green-50/30' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 ${canComplete ? 'bg-green-50' : 'bg-amber-50'} rounded-md flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xs sm:text-sm font-semibold ${canComplete ? 'text-green-700' : 'text-amber-700'}`}>
                            {account.accountName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{account.accountName}</p>
                          {contract.cancellationReason && (
                            <p className="text-sm text-muted-foreground max-w-[150px] sm:max-w-[200px] truncate hidden sm:block">{contract.cancellationReason}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="neutral">{plan.name}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {contract.cancellationEffectiveDate
                        ? formatDate(contract.cancellationEffectiveDate)
                        : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {lastInvoice ? (
                        <Badge variant={INVOICE_STATUS_VARIANT[lastInvoice.status]}>
                          {INVOICE_STATUS_LABELS[lastInvoice.status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {route ? (
                        <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
                          {ROUTE_STATUS_LABELS[route.status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canComplete ? (
                        <Badge variant="success">完了可能</Badge>
                      ) : (
                        <div className="space-y-1">
                          {blockers.map((blocker, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs sm:text-sm text-destructive">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="truncate max-w-[80px] sm:max-w-none">{blocker}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {canComplete ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/contracts/${contract.id}`)
                          }}
                        >
                          <span className="hidden sm:inline">解約確定</span>
                          <span className="sm:hidden">確定</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/contracts/${contract.id}`)
                          }}
                        >
                          対応
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Steps guide */}
      <Card>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          解約完了までの手順
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { step: 1, title: '解約申請受付', desc: '契約ステータスを「解約予定」に変更' },
            { step: 2, title: '最終請求確認', desc: '最終請求を確定し、入金を確認' },
            { step: 3, title: 'ルート停止', desc: 'MEOツールを停止または削除' },
            { step: 4, title: '解約確定', desc: '契約ステータスを「解約完了」に（不可逆）' },
          ].map((item) => (
            <div key={item.step} className="bg-muted rounded-lg border border-border p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                  {item.step}
                </div>
                <h4 className="font-medium text-foreground text-sm sm:text-base">{item.title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground pl-8 sm:pl-11 hidden sm:block">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
