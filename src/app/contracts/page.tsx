'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge, Select, Button, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState, Modal, ModalFooter, Input, useToastHelpers, SearchBar, ActiveFilters, FilterChip } from '@/components/ui'
import { mockContractRepository, mockAccountRepository, mockPlanRepository, mockRouteIntegrationRepository, mockInvoiceRepository } from '@/repositories/mock'
import type { Contract, Account, Plan, RouteIntegration, Invoice, CreateContractInput } from '@/domain/types'
import { CONTRACT_STATUS, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANT, ROUTE_STATUS_LABELS, ROUTE_STATUS_VARIANT, INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT, ContractStatus } from '@/domain/status'
import { formatDate, getBillingMonth } from '@/lib/utils'
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/seed/data'

function ContractListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToastHelpers()
  const statusParam = searchParams.get('status')

  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stores, setStores] = useState<Account[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [routes, setRoutes] = useState<RouteIntegration[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<string>(statusParam || '')
  const [billingMethodFilter, setBillingMethodFilter] = useState<string>('')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // 検索機能
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // localStorage から最近の検索を読み込む
  useEffect(() => {
    const saved = localStorage.getItem('contractRecentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('contractRecentSearches', JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('contractRecentSearches')
  }

  // 契約作成モーダル
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newContract, setNewContract] = useState({
    accountId: '',
    planId: '',
    billingMethod: 'monthlypay' as 'monthlypay' | 'invoice',
    paymentDay: 10,
    startDate: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const thisMonth = getBillingMonth()
      const [contractsData, storesData, plansData, routesData, invoicesData] = await Promise.all([
        mockContractRepository.list(DEFAULT_ORG_ID),
        mockAccountRepository.list(DEFAULT_ORG_ID),
        mockPlanRepository.list(DEFAULT_ORG_ID),
        mockRouteIntegrationRepository.listByStatus(DEFAULT_ORG_ID, ['preparing', 'running', 'paused', 'deleting', 'deleted', 'error']),
        mockInvoiceRepository.listByMonth(DEFAULT_ORG_ID, thisMonth),
      ])
      setContracts(contractsData)
      setStores(storesData)
      setPlans(plansData)
      setRoutes(routesData)
      setInvoices(invoicesData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam)
    }
  }, [statusParam])

  const getAccountName = (accountId: string) => stores.find((s) => s.id === accountId)?.accountName || '不明'
  const getPlanName = (planId: string) => plans.find((p) => p.id === planId)?.name || '不明'
  const getRoute = (contractId: string) => routes.find((r) => r.contractId === contractId)
  const getInvoice = (contractId: string) => invoices.find((i) => i.contractId === contractId)

  const filteredContracts = contracts.filter((c) => {
    // テキスト検索
    if (searchQuery) {
      const store = stores.find(s => s.id === c.accountId)
      const plan = plans.find(p => p.id === c.planId)
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        store?.accountName.toLowerCase().includes(searchLower) ||
        store?.adminEmail?.toLowerCase().includes(searchLower) ||
        plan?.name.toLowerCase().includes(searchLower) ||
        c.notes?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    // 通常のフィルター
    if (statusFilter && c.status !== statusFilter) return false
    if (billingMethodFilter && c.billingMethod !== billingMethodFilter) return false
    if (planFilter && c.planId !== planFilter) return false
    return true
  })

  const billingOptions = [
    { value: '', label: 'すべて' },
    { value: 'monthlypay', label: '月額ペイ' },
    { value: 'invoice', label: '請求書' },
  ]

  const statusOptions = [
    { value: '', label: 'すべて' },
    ...Object.values(CONTRACT_STATUS).map((value) => ({
      value,
      label: CONTRACT_STATUS_LABELS[value as ContractStatus],
    })),
  ]

  const planOptions = [
    { value: '', label: 'すべて' },
    ...plans.map((p) => ({ value: p.id, label: p.name })),
  ]

  const getNextAction = (contract: Contract): { label: string; href: string } | null => {
    const route = getRoute(contract.id)
    const invoice = getInvoice(contract.id)

    if (contract.status === 'lead') {
      return { label: '契約成立へ', href: `/contracts/${contract.id}` }
    }
    if (contract.status === 'closed_won') {
      return { label: '初回入金確認', href: `/contracts/${contract.id}` }
    }
    if (contract.status === 'cancel_pending') {
      return { label: '解約処理', href: `/contracts/${contract.id}` }
    }
    if (route?.status === 'error') {
      return { label: 'エラー対応', href: `/contracts/${contract.id}` }
    }
    if (invoice?.status === 'overdue') {
      return { label: '督促送信', href: `/contracts/${contract.id}` }
    }
    if (invoice?.status === 'draft' && contract.billingMethod === 'invoice') {
      return { label: '請求書送付', href: `/contracts/${contract.id}` }
    }
    return null
  }

  const clearFilters = () => {
    setStatusFilter('')
    setBillingMethodFilter('')
    setPlanFilter('')
    setSearchQuery('')
    router.push('/contracts')
  }

  // アクティブフィルターのリスト生成
  const activeFilters = [
    ...(searchQuery ? [{
      id: 'search',
      label: '検索',
      value: searchQuery,
      color: 'neutral' as const,
    }] : []),
    ...(statusFilter ? [{
      id: 'status',
      label: 'ステータス',
      value: CONTRACT_STATUS_LABELS[statusFilter as ContractStatus],
      color: 'primary' as const,
    }] : []),
    ...(billingMethodFilter ? [{
      id: 'billing',
      label: '支払方法',
      value: billingMethodFilter === 'monthlypay' ? '月額ペイ' : '請求書',
      color: 'neutral' as const,
    }] : []),
    ...(planFilter ? [{
      id: 'plan',
      label: 'プラン',
      value: plans.find(p => p.id === planFilter)?.name || '',
      color: 'neutral' as const,
    }] : []),
  ]

  const removeFilter = (filterId: string) => {
    switch (filterId) {
      case 'search':
        setSearchQuery('')
        break
      case 'status':
        setStatusFilter('')
        router.push('/contracts')
        break
      case 'billing':
        setBillingMethodFilter('')
        break
      case 'plan':
        setPlanFilter('')
        break
    }
  }

  const handleCreateContract = async () => {
    if (!newContract.accountId || !newContract.planId || !newContract.startDate) return
    setCreating(true)
    try {
      const selectedPlan = plans.find((p) => p.id === newContract.planId)
      const selectedStore = stores.find((s) => s.id === newContract.accountId)
      const input: CreateContractInput = {
        orgId: DEFAULT_ORG_ID,
        accountId: newContract.accountId,
        planId: newContract.planId,
        status: 'lead',
        startDate: new Date(newContract.startDate),
        endDate: null,
        billingMethod: newContract.billingMethod,
        contractMonthlyPriceSnapshot: selectedPlan?.monthlyPrice || 0,
        salesOwnerUserId: DEFAULT_USER_ID,
        opsOwnerUserId: null,
        cancellationRequestedAt: null,
        cancellationEffectiveDate: null,
        cancellationReason: null,
        paymentDay: newContract.paymentDay,
        notes: newContract.notes || null,
      }
      const created = await mockContractRepository.create(input)
      setCreateModalOpen(false)
      resetCreateForm()
      toast.success('契約を作成しました', `${selectedStore?.accountName || 'アカウント'} の契約を作成しました`)
      router.push(`/contracts/${created.id}`)
    } catch {
      toast.error('エラーが発生しました', '契約の作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateForm = () => {
    setNewContract({
      accountId: '',
      planId: '',
      billingMethod: 'monthlypay',
      paymentDay: 10,
      startDate: '',
      notes: '',
    })
  }

  const openCreateModal = () => {
    resetCreateForm()
    setCreateModalOpen(true)
  }

  const hasActiveFilters = searchQuery || statusFilter || billingMethodFilter || planFilter

  const activeCount = contracts.filter(c => c.status === 'active').length
  const leadCount = contracts.filter(c => c.status === 'lead').length
  const cancelPendingCount = contracts.filter(c => c.status === 'cancel_pending').length

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">契約一覧</h1>
            <p className="text-sm text-muted-foreground">{filteredContracts.length}件の契約</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="secondary" className="hidden sm:flex">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV出力
          </Button>
          <Button onClick={openCreateModal} className="flex-1 sm:flex-none">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新規契約
          </Button>
        </div>
      </div>

      {/* 統合検索バー */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={(q) => {
          saveRecentSearch(q)
        }}
        placeholder="店舗名、プラン名で検索... (⌘K)"
        recentSearches={recentSearches}
        onClearRecentSearches={clearRecentSearches}
        suggestions={stores.slice(0, 5).map((s, i) => ({
          id: `store-${i}`,
          label: s.accountName,
          type: 'suggestion' as const,
          icon: (
            <svg className="w-4 h-4 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        }))}
      />

      {/* アクティブフィルター表示 */}
      <ActiveFilters
        filters={activeFilters}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card padding="sm" accent="success">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">稼働中</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">{activeCount}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" accent="primary">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">商談中</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{leadCount}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" accent={cancelPendingCount > 0 ? 'warning' : 'none'}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${cancelPendingCount > 0 ? 'bg-amber-50' : 'bg-muted'} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${cancelPendingCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">解約予定</p>
              <p className={`text-lg sm:text-xl font-bold ${cancelPendingCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>{cancelPendingCount}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">合計</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{contracts.length}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 md:pb-0">
        <span className="text-xs sm:text-sm text-muted-foreground mr-0.5 sm:mr-1 whitespace-nowrap">ステータス:</span>
        {Object.entries(CONTRACT_STATUS).map(([, value]) => {
          const count = contracts.filter((c) => c.status === value).length
          const isActive = statusFilter === value
          const chipColor = value === 'cancelled' ? 'danger' : value === 'cancel_pending' ? 'warning' : value === 'active' ? 'success' : 'primary'
          return (
            <FilterChip
              key={value}
              label={CONTRACT_STATUS_LABELS[value as ContractStatus]}
              count={count}
              active={isActive}
              color={chipColor}
              size="sm"
              onClick={() => {
                setStatusFilter(isActive ? '' : value)
                router.push(isActive ? '/contracts' : `/contracts?status=${value}`)
              }}
            />
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="w-full lg:w-64 flex-shrink-0">
            <Card className="lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">フィルタ</h3>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <Select
                  label="ステータス"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value)
                    router.push(value ? `/contracts?status=${value}` : '/contracts')
                  }}
                />
                <Select
                  label="支払方法"
                  options={billingOptions}
                  value={billingMethodFilter}
                  onChange={(value) => setBillingMethodFilter(value)}
                />
                <Select
                  label="プラン"
                  options={planOptions}
                  value={planFilter}
                  onChange={(value) => setPlanFilter(value)}
                />

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                    フィルタをクリア
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Results Table */}
        <div className="flex-1 min-w-0">
          {!showFilterPanel && (
            <button
              onClick={() => setShowFilterPanel(true)}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              フィルタを表示
            </button>
          )}

          {filteredContracts.length === 0 ? (
            <Card>
              <EmptyState
                title="該当する契約がありません"
                description="フィルタ条件を変更してください"
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>店舗名</TableHead>
                      <TableHead>契約状態</TableHead>
                      <TableHead className="hidden md:table-cell">プラン</TableHead>
                      <TableHead className="hidden lg:table-cell">支払方法</TableHead>
                      <TableHead className="hidden sm:table-cell">今月請求</TableHead>
                      <TableHead className="hidden lg:table-cell">ルート状態</TableHead>
                      <TableHead className="hidden md:table-cell">次アクション</TableHead>
                      <TableHead className="hidden xl:table-cell">最終更新</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => {
                      const route = getRoute(contract.id)
                      const invoice = getInvoice(contract.id)
                      const nextAction = getNextAction(contract)
                      return (
                        <TableRow
                          key={contract.id}
                          clickable
                          onClick={() => router.push(`/contracts/${contract.id}`)}
                        >
                          <TableCell>
                            <span className="font-medium text-foreground text-sm md:text-base">{getAccountName(contract.accountId)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={CONTRACT_STATUS_VARIANT[contract.status]}>
                              <span className="text-xs">{CONTRACT_STATUS_LABELS[contract.status]}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-foreground text-sm">{getPlanName(contract.planId)}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{contract.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書'}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {invoice ? (
                              <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                                <span className="text-xs">{INVOICE_STATUS_LABELS[invoice.status]}</span>
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {route ? (
                              <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
                                <span className="text-xs">{ROUTE_STATUS_LABELS[route.status]}</span>
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {nextAction ? (
                              <Link
                                href={nextAction.href}
                                className="text-sm font-medium text-primary hover:text-primary/80 whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {nextAction.label}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm hidden xl:table-cell">{formatDate(contract.updatedAt)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 契約作成モーダル */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { resetCreateForm(); setCreateModalOpen(false); }}
        title="新規契約作成"
        description="店舗との契約を作成します"
        icon={
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        size="lg"
      >
        <div className="space-y-5">
          {/* 店舗・プラン選択 */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-primary/10 rounded text-primary text-xs flex items-center justify-center font-bold">1</span>
              店舗・プラン
            </h4>
            <div className="space-y-4 pl-7">
              <Select
                label="店舗"
                options={[
                  { value: '', label: '店舗を選択してください' },
                  ...stores.map((s) => ({ value: s.id, label: s.accountName })),
                ]}
                value={newContract.accountId}
                onChange={(value) => setNewContract({ ...newContract, accountId: value })}
              />
              <Select
                label="プラン"
                options={[
                  { value: '', label: 'プランを選択してください' },
                  ...plans.map((p) => ({ value: p.id, label: `${p.name}（${p.monthlyPrice.toLocaleString()}円/月）` })),
                ]}
                value={newContract.planId}
                onChange={(value) => setNewContract({ ...newContract, planId: value })}
              />
            </div>
          </div>

          {/* 支払設定 */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-primary/10 rounded text-primary text-xs flex items-center justify-center font-bold">2</span>
              支払設定
            </h4>
            <div className="space-y-4 pl-7">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="支払方法"
                  options={[
                    { value: 'monthlypay', label: '月額ペイ' },
                    { value: 'invoice', label: '請求書払い' },
                  ]}
                  value={newContract.billingMethod}
                  onChange={(value) => setNewContract({ ...newContract, billingMethod: value as 'monthlypay' | 'invoice' })}
                />
                <Select
                  label="課金日"
                  options={Array.from({ length: 28 }, (_, i) => ({
                    value: String(i + 1),
                    label: `毎月${i + 1}日`,
                  }))}
                  value={String(newContract.paymentDay)}
                  onChange={(value) => setNewContract({ ...newContract, paymentDay: Number(value) })}
                />
              </div>
            </div>
          </div>

          {/* 契約期間 */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-primary/10 rounded text-primary text-xs flex items-center justify-center font-bold">3</span>
              契約期間
            </h4>
            <div className="space-y-4 pl-7">
              <Input
                label="契約開始日"
                type="date"
                value={newContract.startDate}
                onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
              />
              <Input
                label="備考"
                value={newContract.notes}
                onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })}
                placeholder="特記事項があれば入力"
              />
            </div>
          </div>

          {/* プレビュー */}
          {newContract.accountId && newContract.planId && newContract.startDate && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                契約プレビュー
              </h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">店舗</dt>
                  <dd className="font-medium text-foreground">{stores.find(s => s.id === newContract.accountId)?.accountName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">プラン</dt>
                  <dd className="font-medium text-foreground">{plans.find(p => p.id === newContract.planId)?.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">月額</dt>
                  <dd className="font-medium text-foreground">{plans.find(p => p.id === newContract.planId)?.monthlyPrice.toLocaleString()}円</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">開始日</dt>
                  <dd className="font-medium text-foreground">{newContract.startDate}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">契約は「見込み」ステータスで作成されます</p>
              <p className="mt-0.5 text-amber-600">契約成立後、初回入金を確認してから「稼働中」へ遷移してください</p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => { resetCreateForm(); setCreateModalOpen(false); }}>
              キャンセル
            </Button>
            <Button
              onClick={handleCreateContract}
              loading={creating}
              disabled={!newContract.accountId || !newContract.planId || !newContract.startDate}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              契約を作成
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}

export default function ContractsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ContractListContent />
    </Suspense>
  )
}
