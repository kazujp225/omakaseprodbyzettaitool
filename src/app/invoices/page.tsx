'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge, Button, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState, NoDataIcon, Modal, ModalFooter, Select } from '@/components/ui'
import { mockInvoiceRepository, mockContractRepository, mockAccountRepository, mockPaymentRepository } from '@/repositories/mock'
import type { Invoice, Contract, Account, Payment, CreateInvoiceInput } from '@/domain/types'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT } from '@/domain/status'
import { formatCurrency, formatDate, formatMonth, getBillingMonth, getOverdueDays } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

type TabStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<TabStatus>('draft')

  // 請求生成モーダル
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState('')

  const thisMonth = useMemo(() => getBillingMonth(), [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const billingMonth = getBillingMonth()
      const [invoicesData, contractsData, storesData] = await Promise.all([
        mockInvoiceRepository.listByMonth(DEFAULT_ORG_ID, billingMonth),
        mockContractRepository.list(DEFAULT_ORG_ID),
        mockAccountRepository.list(DEFAULT_ORG_ID),
      ])
      setInvoices(invoicesData)
      setContracts(contractsData)
      setAccounts(storesData)

      const paymentPromises = invoicesData.map((inv) => mockPaymentRepository.listByInvoice(inv.id))
      const paymentsArrays = await Promise.all(paymentPromises)
      setPayments(paymentsArrays.flat())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getAccountName = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId)
    if (!contract) return '不明'
    return accounts.find((a) => a.id === contract.accountId)?.accountName || '不明'
  }

  const getBillingMethod = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId)
    return contract?.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書'
  }

  const getPaymentStatus = (invoiceId: string) => {
    const invoicePayments = payments.filter((p) => p.invoiceId === invoiceId)
    const succeeded = invoicePayments.find((p) => p.status === 'succeeded')
    if (succeeded) return { label: '入金済', variant: 'success' as const }
    const failed = invoicePayments.find((p) => p.status === 'failed')
    if (failed) return { label: '決済失敗', variant: 'danger' as const }
    return null
  }

  const sendInvoice = async (invoiceId: string) => {
    setProcessing(true)
    try {
      await mockInvoiceRepository.markSent(invoiceId)
      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  // 今月分の請求がまだない契約を取得
  const contractsWithoutInvoice = contracts.filter((c) => {
    if (!['active', 'cancel_pending'].includes(c.status)) return false
    return !invoices.some((inv) => inv.contractId === c.id)
  })

  const generateInvoice = async () => {
    if (!selectedContractId) return
    setProcessing(true)
    try {
      const contract = contracts.find((c) => c.id === selectedContractId)
      if (!contract) return

      const billingMonth = getBillingMonth()
      const dueDate = new Date(billingMonth)
      dueDate.setDate(contract.paymentDay)
      dueDate.setMonth(dueDate.getMonth() + 1)

      const input: CreateInvoiceInput = {
        orgId: DEFAULT_ORG_ID,
        contractId: contract.id,
        billingMonth,
        amount: contract.contractMonthlyPriceSnapshot,
        dueDate,
        status: 'draft',
        pdfUrl: null,
        sentAt: null,
        issueDate: new Date(),
        adjustmentNote: null,
      }

      await mockInvoiceRepository.create(input)
      setGenerateModalOpen(false)
      setSelectedContractId('')
      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  const tabs: { status: TabStatus; label: string }[] = [
    { status: 'draft', label: '未送付' },
    { status: 'sent', label: '送付済' },
    { status: 'paid', label: '入金済' },
    { status: 'overdue', label: '期限超過' },
  ]

  const filteredInvoices = invoices.filter((inv) => inv.status === activeTab)

  const counts = tabs.reduce(
    (acc, tab) => ({
      ...acc,
      [tab.status]: invoices.filter((inv) => inv.status === tab.status).length,
    }),
    {} as Record<TabStatus, number>
  )

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = invoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">請求（今月）</h1>
            <p className="text-sm text-muted-foreground">{formatMonth(thisMonth)} の請求一覧</p>
          </div>
        </div>
        <Button onClick={() => setGenerateModalOpen(true)} disabled={contractsWithoutInvoice.length === 0} className="self-start sm:self-auto">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          請求を生成
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm" accent="primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">今月請求総額</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" accent="success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">入金済額</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" accent={overdueAmount > 0 ? 'danger' : 'none'}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${overdueAmount > 0 ? 'bg-destructive/10' : 'bg-muted'} rounded-lg flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${overdueAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">未回収額</p>
              <p className={`text-xl font-bold ${overdueAmount > 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(overdueAmount)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">回収率</p>
              <p className="text-lg font-bold text-primary">{collectionRate}%</p>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card padding="none">
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.status}
                onClick={() => setActiveTab(tab.status)}
                className={`
                  flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    activeTab === tab.status
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-md text-xs md:text-sm ${
                    activeTab === tab.status
                      ? 'bg-primary/10 text-primary'
                      : tab.status === 'overdue' && counts[tab.status] > 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {counts[tab.status]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-16">
            <EmptyState
              icon={
                <div className={`w-12 h-12 ${activeTab === 'overdue' ? 'bg-green-50' : 'bg-muted'} rounded-full flex items-center justify-center`}>
                  {activeTab === 'overdue' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <NoDataIcon />
                  )}
                </div>
              }
              title={activeTab === 'overdue' ? '期限超過の請求はありません' : `${tabs.find((t) => t.status === activeTab)?.label}の請求はありません`}
              description={activeTab === 'overdue' ? 'すべての請求が期限内に処理されています' : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗名</TableHead>
                  <TableHead className="hidden md:table-cell">支払方法</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>請求状態</TableHead>
                  <TableHead className="hidden sm:table-cell">期限</TableHead>
                  <TableHead className="hidden lg:table-cell">入金状況</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const paymentStatus = getPaymentStatus(invoice.id)
                const overdueDays = invoice.status === 'overdue' ? getOverdueDays(invoice.dueDate) : 0
                const contract = contracts.find((c) => c.id === invoice.contractId)
                return (
                  <TableRow
                    key={invoice.id}
                    clickable
                    onClick={() => contract && router.push(`/contracts/${contract.id}`)}
                    className={invoice.status === 'overdue' ? 'bg-destructive/10/30' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-8 h-8 md:w-9 md:h-9 ${invoice.status === 'overdue' ? 'bg-destructive/10' : 'bg-muted'} rounded-md flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xs md:text-sm font-semibold ${invoice.status === 'overdue' ? 'text-destructive' : 'text-primary'}`}>
                            {getAccountName(invoice.contractId).charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-foreground text-sm md:text-base truncate max-w-[120px] md:max-w-none">{getAccountName(invoice.contractId)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-foreground text-sm">{getBillingMethod(invoice.contractId)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground text-sm md:text-base">{formatCurrency(invoice.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                        <span className="text-xs">{INVOICE_STATUS_LABELS[invoice.status]}
                        {overdueDays > 0 && (
                          <span className="ml-1 font-bold">({overdueDays}日)</span>
                        )}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={`text-sm ${overdueDays > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {formatDate(invoice.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {paymentStatus ? (
                        <Badge variant={paymentStatus.variant}><span className="text-xs">{paymentStatus.label}</span></Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); sendInvoice(invoice.id); }}
                            loading={processing}
                          >
                            送付
                          </Button>
                        )}
                        {invoice.status === 'overdue' && (
                          <Button variant="danger" size="sm" onClick={(e) => e.stopPropagation()}>
                            督促
                          </Button>
                        )}
                        {contract && (
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            詳細
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* 請求生成モーダル */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => { setGenerateModalOpen(false); setSelectedContractId(''); }}
        title="請求を生成"
      >
        <div className="space-y-4">
          {contractsWithoutInvoice.length === 0 ? (
            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
              <p>今月分の請求を生成できる契約がありません</p>
              <p className="text-sm mt-1">すべての稼働中契約に請求が存在します</p>
            </div>
          ) : (
            <>
              <Select
                label="契約を選択"
                options={[
                  { value: '', label: '契約を選択してください' },
                  ...contractsWithoutInvoice.map((c) => {
                    const account = accounts.find((s) => s.id === c.accountId)
                    return {
                      value: c.id,
                      label: `${account?.accountName || '不明'} - ${formatCurrency(c.contractMonthlyPriceSnapshot)}/月`,
                    }
                  }),
                ]}
                value={selectedContractId}
                onChange={(value) => setSelectedContractId(value)}
              />
              {selectedContractId && (
                <div className="p-4 bg-muted rounded-lg">
                  {(() => {
                    const contract = contracts.find((c) => c.id === selectedContractId)
                    const account = accounts.find((s) => s.id === contract?.accountId)
                    if (!contract) return null
                    return (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">店舗名</dt>
                          <dd className="font-medium">{account?.accountName}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">請求月</dt>
                          <dd className="font-medium">{formatMonth(thisMonth)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">金額</dt>
                          <dd className="font-medium">{formatCurrency(contract.contractMonthlyPriceSnapshot)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">支払期限</dt>
                          <dd className="font-medium">翌月{contract.paymentDay}日</dd>
                        </div>
                      </dl>
                    )
                  })()}
                </div>
              )}
            </>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setGenerateModalOpen(false); setSelectedContractId(''); }}>
              キャンセル
            </Button>
            <Button
              onClick={generateInvoice}
              loading={processing}
              disabled={!selectedContractId}
            >
              請求を生成
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}
