'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, LoadingState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, NoDataIcon } from '@/components/ui'
import { mockAccountRepository, mockContractRepository, mockPlanRepository, mockInvoiceRepository, mockPaymentRepository, mockNotificationRepository, mockRouteIntegrationRepository } from '@/repositories/mock'
import type { Account, Contract, Plan, Invoice, Payment, Notification, RouteIntegration } from '@/domain/types'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANT, INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT, ROUTE_STATUS_LABELS, ROUTE_STATUS_VARIANT, NOTIFICATION_TYPE_LABELS, NOTIFICATION_STATUS_LABELS } from '@/domain/status'
import { formatDate, formatCurrency, formatMonth } from '@/lib/utils'

interface StoreDetailPageProps {
  params: Promise<{ id: string }>
}

type TabType = 'overview' | 'contracts' | 'billing' | 'notifications' | 'logs'

export default function StoreDetailPage({ params }: StoreDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Account | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [routes, setRoutes] = useState<RouteIntegration[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [storeData, contractsData, plansData] = await Promise.all([
        mockAccountRepository.get(id),
        mockContractRepository.listByAccount(id),
        mockPlanRepository.list('org-001'),
      ])
      setStore(storeData)
      setContracts(contractsData)
      setPlans(plansData)

      if (contractsData.length > 0) {
        const invoicePromises = contractsData.map((c) => mockInvoiceRepository.listByContract(c.id))
        const paymentPromises = contractsData.map((c) => mockPaymentRepository.listByContract(c.id))
        const notificationPromises = contractsData.map((c) => mockNotificationRepository.listByContract(c.id))
        const routePromises = contractsData.map((c) => mockRouteIntegrationRepository.getByContract(c.id))

        const [invoicesArrays, paymentsArrays, notificationsArrays, routesData] = await Promise.all([
          Promise.all(invoicePromises),
          Promise.all(paymentPromises),
          Promise.all(notificationPromises),
          Promise.all(routePromises),
        ])

        setInvoices(invoicesArrays.flat())
        setPayments(paymentsArrays.flat())
        setNotifications(notificationsArrays.flat())
        setRoutes(routesData.filter((r): r is RouteIntegration => r !== null))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return <LoadingState />
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">店舗が見つかりません</h2>
        <Link href="/stores" className="mt-4 inline-block text-primary hover:text-primary/80">
          店舗検索に戻る
        </Link>
      </div>
    )
  }

  const getPlanName = (planId: string) => plans.find((p) => p.id === planId)?.name || '不明'
  const activeContract = contracts.find((c) => ['active', 'cancel_pending', 'closed_won'].includes(c.status))
  const activeRoute = routes.find((r) => r.contractId === activeContract?.id)

  const tabs: { id: TabType; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: '概要',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'contracts',
      label: '契約',
      count: contracts.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'billing',
      label: '請求/入金',
      count: invoices.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: '通知',
      count: notifications.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'logs',
      label: '操作ログ',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
  ]

  // Calculate stats
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/stores" className="hover:text-foreground transition-colors">店舗検索</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-foreground">{store.accountName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg sm:text-xl font-bold text-primary">{store.accountName.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{store.accountName}</h1>
              {activeContract && (
                <Badge variant={CONTRACT_STATUS_VARIANT[activeContract.status]}>
                  {CONTRACT_STATUS_LABELS[activeContract.status]}
                </Badge>
              )}
              {activeRoute && (
                <Badge variant={ROUTE_STATUS_VARIANT[activeRoute.status]} className="hidden sm:inline-flex">
                  ルート: {ROUTE_STATUS_LABELS[activeRoute.status]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{store.adminEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="secondary" className="flex-1 sm:flex-none">
            <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">編集</span>
          </Button>
          {activeContract && (
            <Button onClick={() => router.push(`/contracts/${activeContract.id}`)} className="flex-1 sm:flex-none">
              契約詳細へ
            </Button>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {`${store.phoneArea}-${store.phoneLocal}-${store.phoneNumber}`}
        </span>
        <span className="flex items-center gap-2 hidden sm:flex">
          <svg className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate max-w-[200px] md:max-w-none">{store.addressDetail}</span>
        </span>
        {store.adminEmail && (
          <span className="flex items-center gap-2 hidden md:flex">
            <svg className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {store.adminEmail}
          </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">契約数</p>
              <p className="text-xl font-bold text-foreground">{contracts.length}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累計請求額</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalInvoiceAmount)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">入金済み</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${overdueInvoices.length > 0 ? 'bg-destructive/10' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${overdueInvoices.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">未入金</p>
              <p className={`text-xl font-bold ${overdueInvoices.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{overdueInvoices.length}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1 px-1.5 sm:px-2 py-0.5 rounded-md text-xs sm:text-sm ${
                    activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-muted/50 rounded-lg border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    店舗情報
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">担当者</dt>
                      <dd className="text-sm font-medium text-foreground">{store.accountManager || '-'}</dd>
                    </div>
                    <div className="bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">メモ</dt>
                      <dd className="text-sm font-medium text-foreground">{store.memo || '-'}</dd>
                    </div>
                    <div className="bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">都道府県</dt>
                      <dd className="text-sm font-medium text-foreground">{store.prefecture}</dd>
                    </div>
                    <div className="bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">郵便番号</dt>
                      <dd className="text-sm font-medium text-foreground">{store.postalCode || '-'}</dd>
                    </div>
                    <div className="sm:col-span-2 bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">住所</dt>
                      <dd className="text-sm font-medium text-foreground">{store.addressDetail}</dd>
                    </div>
                    <div className="bg-card rounded-md p-3 border border-border">
                      <dt className="text-sm text-muted-foreground mb-1">登録日</dt>
                      <dd className="text-sm font-medium text-foreground">{formatDate(store.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    現在の契約
                  </h3>
                  {activeContract ? (
                    <Link
                      href={`/contracts/${activeContract.id}`}
                      className="block p-4 rounded-md bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-foreground">{getPlanName(activeContract.planId)}</span>
                        <Badge variant={CONTRACT_STATUS_VARIANT[activeContract.status]}>
                          {CONTRACT_STATUS_LABELS[activeContract.status]}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>月額</span>
                          <span className="font-semibold text-primary">{formatCurrency(activeContract.contractMonthlyPriceSnapshot)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>開始日</span>
                          <span>{formatDate(activeContract.startDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>支払方法</span>
                          <span>{activeContract.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書'}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-end text-primary text-sm font-medium group-hover:text-primary/80">
                        詳細を見る
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground mb-4">有効な契約はありません</p>
                      <Button variant="primary" size="sm">
                        新規契約を作成
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-foreground">契約履歴</h3>
                <Button size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  新規契約
                </Button>
              </div>
              {contracts.length === 0 ? (
                <EmptyState
                  icon={<NoDataIcon />}
                  title="契約履歴はありません"
                  className="py-12"
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>プラン</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="hidden sm:table-cell">支払方法</TableHead>
                        <TableHead className="hidden md:table-cell">月額</TableHead>
                        <TableHead className="hidden lg:table-cell">開始日</TableHead>
                        <TableHead className="hidden lg:table-cell">終了日</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow key={contract.id} clickable onClick={() => router.push(`/contracts/${contract.id}`)}>
                          <TableCell className="font-medium">{getPlanName(contract.planId)}</TableCell>
                          <TableCell>
                            <Badge variant={CONTRACT_STATUS_VARIANT[contract.status]}>
                              {CONTRACT_STATUS_LABELS[contract.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{contract.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書'}</TableCell>
                          <TableCell className="hidden md:table-cell">{formatCurrency(contract.contractMonthlyPriceSnapshot)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatDate(contract.startDate)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{contract.endDate ? formatDate(contract.endDate) : '-'}</TableCell>
                          <TableCell>
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              詳細
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">請求履歴</h3>
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={<NoDataIcon />}
                    title="請求履歴はありません"
                    className="py-12"
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>請求月</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead className="hidden sm:table-cell">期限</TableHead>
                          <TableHead className="hidden md:table-cell">送付日</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime()).map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{formatMonth(invoice.billingMonth)}</TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                                {INVOICE_STATUS_LABELS[invoice.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell className="hidden md:table-cell">{invoice.sentAt ? formatDate(invoice.sentAt) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">入金履歴</h3>
                {payments.length === 0 ? (
                  <EmptyState
                    icon={<NoDataIcon />}
                    title="入金履歴はありません"
                    className="py-12"
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日時</TableHead>
                          <TableHead>金額</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead className="hidden sm:table-cell">決済方法</TableHead>
                          <TableHead className="hidden md:table-cell">備考</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{formatDate(payment.createdAt)}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'succeeded' ? 'success' : payment.status === 'failed' ? 'danger' : 'neutral'}>
                                {payment.status === 'succeeded' ? '成功' : payment.status === 'failed' ? '失敗' : payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{payment.provider === 'monthlypay' ? '月額ペイ' : payment.provider === 'bank_transfer' ? '銀行振込' : payment.provider}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">{payment.failureReason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">通知履歴</h3>
              {notifications.length === 0 ? (
                <EmptyState
                  icon={<NoDataIcon />}
                  title="通知履歴はありません"
                  className="py-12"
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>種別</TableHead>
                        <TableHead className="hidden md:table-cell">件名</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="hidden sm:table-cell">送信先</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">{formatDate(notification.createdAt)}</TableCell>
                          <TableCell>{NOTIFICATION_TYPE_LABELS[notification.type]}</TableCell>
                          <TableCell className="hidden md:table-cell max-w-xs truncate">{notification.subject}</TableCell>
                          <TableCell>
                            <Badge variant={notification.status === 'sent' ? 'success' : notification.status === 'draft' ? 'neutral' : 'danger'}>
                              {NOTIFICATION_STATUS_LABELS[notification.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{notification.toEmail}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">操作ログ</h3>
              <p className="text-muted-foreground mb-4">店舗に関連する操作ログは契約詳細画面で確認できます</p>
              {activeContract && (
                <Button onClick={() => router.push(`/contracts/${activeContract.id}`)}>
                  契約詳細へ
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
