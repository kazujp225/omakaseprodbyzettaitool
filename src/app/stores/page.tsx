'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState, SearchBar, FilterChip, Button } from '@/components/ui'
import { mockAccountRepository, mockContractRepository, mockInvoiceRepository } from '@/repositories/mock'
import type { Account, Contract, Invoice } from '@/domain/types'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANT, INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT } from '@/domain/status'
import { DEFAULT_ORG_ID } from '@/seed/data'

function StoreSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [stores, setStores] = useState<Account[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searched, setSearched] = useState(false)

  // フィルター
  const [prefectureFilter, setPrefectureFilter] = useState('')

  // 検索履歴
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('storeRecentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('storeRecentSearches', JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('storeRecentSearches')
  }

  const loadAllData = useCallback(async () => {
    const [contractsData, invoicesData] = await Promise.all([
      mockContractRepository.list(DEFAULT_ORG_ID),
      mockInvoiceRepository.listByStatus(DEFAULT_ORG_ID, ['draft', 'sent', 'paid', 'overdue']),
    ])
    setContracts(contractsData)
    setInvoices(invoicesData)
  }, [])

  const searchStores = useCallback(async (searchQuery: string) => {
    setLoading(true)
    setSearched(true)
    try {
      if (searchQuery.trim()) {
        const results = await mockAccountRepository.search(DEFAULT_ORG_ID, searchQuery)
        setStores(results)
      } else {
        const results = await mockAccountRepository.list(DEFAULT_ORG_ID)
        setStores(results)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  useEffect(() => {
    if (initialQuery) {
      searchStores(initialQuery)
    }
  }, [initialQuery, searchStores])

  const handleSearch = (searchValue?: string) => {
    const q = searchValue ?? query
    router.push(`/stores?q=${encodeURIComponent(q)}`)
    searchStores(q)
    saveRecentSearch(q)
  }

  const handleLoadAll = () => {
    setQuery('')
    setPrefectureFilter('')
    router.push('/stores')
    searchStores('')
  }

  // フィルタリングされたアカウント
  const filteredStores = stores.filter(store => {
    if (prefectureFilter && store.prefecture !== prefectureFilter) return false
    return true
  })

  const getActiveContract = (storeId: string) =>
    contracts.find((c) => c.accountId === storeId && ['active', 'cancel_pending'].includes(c.status))

  const getLatestInvoice = (storeId: string) => {
    const storeContracts = contracts.filter((c) => c.accountId === storeId)
    const contractIds = storeContracts.map((c) => c.id)
    const storeInvoices = invoices.filter((inv) => contractIds.includes(inv.contractId))
    return storeInvoices.sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime())[0]
  }

  const activeContractsCount = contracts.filter(c => c.status === 'active').length
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">店舗検索</h1>
        <p className="mt-1 text-sm text-muted-foreground">店舗名・電話番号・住所で検索できます</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">登録店舗数</p>
              <p className="text-xl font-bold text-foreground">{stores.length || '-'}店舗</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">稼働中契約</p>
              <p className="text-xl font-bold text-green-600">{activeContractsCount}件</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${overdueCount > 0 ? 'bg-destructive/10' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">未入金</p>
              <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{overdueCount}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 統合検索バー */}
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        placeholder="店舗名・カナ・電話番号・住所で検索... (⌘K)"
        recentSearches={recentSearches}
        onClearRecentSearches={clearRecentSearches}
        loading={loading}
      />

      {/* フィルターチップ */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">都道府県:</span>
          <div className="flex flex-wrap gap-1">
            {['東京都', '神奈川県', '大阪府', '愛知県', '福岡県'].map((pref) => {
              const count = stores.filter(s => s.prefecture === pref).length
              return (
                <FilterChip
                  key={pref}
                  label={pref.replace('県', '').replace('府', '').replace('都', '')}
                  count={count}
                  active={prefectureFilter === pref}
                  onClick={() => setPrefectureFilter(prefectureFilter === pref ? '' : pref)}
                />
              )
            })}
            {prefectureFilter && !['東京都', '神奈川県', '大阪府', '愛知県', '福岡県'].includes(prefectureFilter) && (
              <FilterChip
                label={prefectureFilter}
                active
                onClick={() => setPrefectureFilter('')}
              />
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLoadAll}>
          全件表示
        </Button>
      </div>

      {/* 検索結果サマリー */}
      {searched && stores.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{filteredStores.length}</span>
            {filteredStores.length !== stores.length && (
              <span className="text-muted-foreground/70"> / {stores.length}</span>
            )}
            件の店舗
          </span>
          {query && (
            <span className="text-sm text-muted-foreground/70">「{query}」で検索</span>
          )}
          {prefectureFilter && (
            <span className="text-sm text-muted-foreground/70">
              ・{prefectureFilter}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState message="検索中..." />
      ) : !searched ? (
        <Card>
          <EmptyState
            icon={
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            }
            title="検索してください"
            description="店舗名・電話番号・住所を入力して検索ボタンを押してください。全件表示で全ての店舗を一覧できます。"
          />
        </Card>
      ) : filteredStores.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            title="該当する店舗がありません"
            description="検索条件を変更してお試しください"
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">検索結果</h2>
              <Button variant="secondary" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV出力
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>都道府県</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>契約状態</TableHead>
                <TableHead>今月請求</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.map((store) => {
                const activeContract = getActiveContract(store.id)
                const latestInvoice = getLatestInvoice(store.id)
                return (
                  <TableRow key={store.id} clickable onClick={() => router.push(`/stores/${store.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-muted rounded-md flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{store.accountName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{store.accountName}</p>
                          <p className="text-sm text-muted-foreground">{store.adminEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground">{store.prefecture}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{store.accountManager || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{`${store.phoneArea}-${store.phoneLocal}-${store.phoneNumber}`}</span>
                    </TableCell>
                    <TableCell>
                      {activeContract ? (
                        <Badge variant={CONTRACT_STATUS_VARIANT[activeContract.status]}>
                          {CONTRACT_STATUS_LABELS[activeContract.status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">契約なし</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {latestInvoice ? (
                        <Badge variant={INVOICE_STATUS_VARIANT[latestInvoice.status]}>
                          {INVOICE_STATUS_LABELS[latestInvoice.status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/stores/${store.id}`}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        詳細
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

export default function StoresPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StoreSearchContent />
    </Suspense>
  )
}
