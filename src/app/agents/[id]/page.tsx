'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Card, CardTitle, Badge, Button, Modal, ModalFooter, LoadingState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import {
  mockAgentRepository,
  mockAgentSettlementRepository,
  mockAgentContractRepository,
  mockAgentPerformanceRepository,
  mockAgentEntitlementRepository,
  mockContractRepository,
  mockAccountRepository,
  mockOpsLogRepository,
} from '@/repositories/mock'
import type { Agent, AgentSettlement, AgentContract, AgentMonthlyPerformance, AgentMonthlyEntitlement, Contract, Account } from '@/domain/types'
import {
  AGENT_SETTLEMENT_STATUS_LABELS,
  AGENT_SETTLEMENT_STATUS_VARIANT,
  AGENT_CONTRACT_STATUS_LABELS,
  AGENT_CONTRACT_STATUS_VARIANT,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_VARIANT,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANT,
} from '@/domain/status'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { DEFAULT_USER_ID, DEFAULT_ORG_ID } from '@/seed/data'

interface AgentDetailPageProps {
  params: Promise<{ id: string }>
}

interface AgentContractWithDetails extends AgentContract {
  contract: Contract | null
  store: Account | null
}

interface MonthlyData {
  billingMonth: Date
  performance: AgentMonthlyPerformance | null
  entitlement: AgentMonthlyEntitlement | null
  settlement: AgentSettlement | null
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [, setSettlements] = useState<AgentSettlement[]>([])
  const [agentContracts, setAgentContracts] = useState<AgentContractWithDetails[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  const [confirmSettlementModal, setConfirmSettlementModal] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<AgentSettlement | null>(null)
  const [processing, setProcessing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const agentData = await mockAgentRepository.get(id)
      if (!agentData) {
        setLoading(false)
        return
      }
      setAgent(agentData)

      const [settlementsData, agentContractsData, performancesData, entitlementsData] = await Promise.all([
        mockAgentSettlementRepository.listByAgent(id),
        mockAgentContractRepository.listByAgent(id),
        mockAgentPerformanceRepository.listByAgent(id),
        mockAgentEntitlementRepository.listByAgent(id),
      ])

      setSettlements(settlementsData)

      const contractsWithDetails = await Promise.all(
        agentContractsData.map(async (ac) => {
          const contract = await mockContractRepository.get(ac.contractId)
          const store = contract ? await mockAccountRepository.get(contract.accountId) : null
          return { ...ac, contract, store }
        })
      )
      setAgentContracts(contractsWithDetails)

      const monthsSet = new Set<string>()
      settlementsData.forEach((s) => monthsSet.add(formatMonth(s.billingMonth)))
      performancesData.forEach((p) => monthsSet.add(formatMonth(p.billingMonth)))
      entitlementsData.forEach((e) => monthsSet.add(formatMonth(e.billingMonth)))

      const monthlyDataList: MonthlyData[] = []
      for (const monthStr of monthsSet) {
        const [year, month] = monthStr.split('/').map(Number)
        const billingMonth = new Date(year, month - 1, 1)

        const performance = performancesData.find(
          (p) => p.billingMonth.getFullYear() === year && p.billingMonth.getMonth() === month - 1
        ) || null
        const entitlement = entitlementsData.find(
          (e) => e.billingMonth.getFullYear() === year && e.billingMonth.getMonth() === month - 1
        ) || null
        const settlement = settlementsData.find(
          (s) => s.billingMonth.getFullYear() === year && s.billingMonth.getMonth() === month - 1
        ) || null

        monthlyDataList.push({ billingMonth, performance, entitlement, settlement })
      }

      monthlyDataList.sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime())
      setMonthlyData(monthlyDataList)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleConfirmSettlement = async () => {
    if (!selectedSettlement || !agent) return
    setProcessing(true)
    try {
      await mockAgentSettlementRepository.markInvoiced(selectedSettlement.id)
      await mockOpsLogRepository.append({
        orgId: DEFAULT_ORG_ID,
        contractId: `agent:${agent.id}`,
        actorUserId: DEFAULT_USER_ID,
        action: 'status_changed',
        before: { agentSettlement: selectedSettlement.status },
        after: { agentSettlement: 'invoiced' },
        reason: `代理店精算確定: ${agent.name} ${formatMonth(selectedSettlement.billingMonth)}分`,
      })
      setConfirmSettlementModal(false)
      setSelectedSettlement(null)
      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  const handleRequestPayout = async (settlement: AgentSettlement) => {
    if (!agent) return
    setProcessing(true)
    try {
      await mockAgentSettlementRepository.requestPayout(settlement.id, 'manual', `payout-${Date.now()}`)
      await mockOpsLogRepository.append({
        orgId: DEFAULT_ORG_ID,
        contractId: `agent:${agent.id}`,
        actorUserId: DEFAULT_USER_ID,
        action: 'status_changed',
        before: { agentPayoutStatus: settlement.payoutStatus },
        after: { agentPayoutStatus: 'requested' },
        reason: `代理店振込依頼: ${agent.name} ${formatMonth(settlement.billingMonth)}分`,
      })
      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  const handleCompletePayout = async (settlement: AgentSettlement) => {
    if (!agent) return
    setProcessing(true)
    try {
      await mockAgentSettlementRepository.completePayout(settlement.id)
      await mockAgentSettlementRepository.markPaid(settlement.id)
      await mockOpsLogRepository.append({
        orgId: DEFAULT_ORG_ID,
        contractId: `agent:${agent.id}`,
        actorUserId: DEFAULT_USER_ID,
        action: 'status_changed',
        before: { agentPayoutStatus: settlement.payoutStatus },
        after: { agentPayoutStatus: 'paid', agentSettlement: 'paid' },
        reason: `代理店振込完了: ${agent.name} ${formatMonth(settlement.billingMonth)}分`,
      })
      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">代理店が見つかりません</h2>
        <Link href="/agents" className="mt-4 text-foreground hover:text-primary">
          代理店一覧に戻る
        </Link>
      </div>
    )
  }

  const activeContractCount = agentContracts.filter((ac) => ac.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/agents" className="hover:text-foreground">
              代理店一覧
            </Link>
            <span>/</span>
            <span>{agent.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">
            単価: {formatCurrency(agent.stockUnitPrice)} / 目標: {agent.monthlyTarget}件
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={agent.isActive ? 'success' : 'neutral'} className="text-base px-4 py-2">
            {agent.isActive ? '契約中' : '契約終了'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardTitle>基本情報</CardTitle>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">契約開始日</dt>
              <dd className="text-sm font-medium text-foreground">{formatDate(agent.contractStartDate)}</dd>
            </div>
            {agent.contractEndDate && (
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">契約終了日</dt>
                <dd className="text-sm font-medium text-foreground">{formatDate(agent.contractEndDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">単価</dt>
              <dd className="text-sm font-medium text-foreground">{formatCurrency(agent.stockUnitPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">月間目標</dt>
              <dd className="text-sm font-medium text-foreground">{agent.monthlyTarget}件</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">現在の有効契約</dt>
              <dd className="text-sm font-medium text-foreground">{activeContractCount}件</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>連絡先</CardTitle>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">メール</dt>
              <dd className="text-sm font-medium text-foreground">{agent.contactEmail || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">電話</dt>
              <dd className="text-sm font-medium text-foreground">{agent.contactPhone || '-'}</dd>
            </div>
            {agent.notes && (
              <div>
                <dt className="text-sm text-muted-foreground">備考</dt>
                <dd className="mt-1 text-sm text-foreground">{agent.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle>振込先口座</CardTitle>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">銀行名</dt>
              <dd className="text-sm font-medium text-foreground">{agent.bankName || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">支店名</dt>
              <dd className="text-sm font-medium text-foreground">{agent.bankBranch || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">口座種別</dt>
              <dd className="text-sm font-medium text-foreground">
                {agent.bankAccountType === 'ordinary' ? '普通' : agent.bankAccountType === 'current' ? '当座' : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">口座番号</dt>
              <dd className="text-sm font-medium text-foreground">{agent.bankAccountNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">口座名義</dt>
              <dd className="text-sm font-medium text-foreground">{agent.bankAccountHolder || '-'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-border">
          <CardTitle>月次精算テーブル</CardTitle>
        </div>
        {monthlyData.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">精算データがありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>対象月</TableHead>
                <TableHead className="text-right">獲得数</TableHead>
                <TableHead className="text-right">権利数</TableHead>
                <TableHead className="text-right">不足</TableHead>
                <TableHead className="text-right">支払件数</TableHead>
                <TableHead className="text-right">相殺数</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>精算状態</TableHead>
                <TableHead>振込状態</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data) => {
                const { billingMonth, performance, entitlement, settlement } = data
                return (
                  <TableRow key={formatMonth(billingMonth)}>
                    <TableCell className="font-medium">{formatMonth(billingMonth)}</TableCell>
                    <TableCell className="text-right">{performance?.acquiredCount ?? '-'}</TableCell>
                    <TableCell className="text-right">{entitlement?.entitledCount ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {entitlement?.deficitCount !== undefined ? (
                        <span className={entitlement.deficitCount > 0 ? 'text-destructive font-medium' : ''}>
                          {entitlement.deficitCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">{settlement?.payableCount ?? '-'}</TableCell>
                    <TableCell className="text-right">{settlement?.cancelledOffset ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {settlement ? formatCurrency(settlement.totalAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      {settlement ? (
                        <Badge variant={AGENT_SETTLEMENT_STATUS_VARIANT[settlement.status]}>
                          {AGENT_SETTLEMENT_STATUS_LABELS[settlement.status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {settlement ? (
                        <Badge variant={PAYOUT_STATUS_VARIANT[settlement.payoutStatus]}>
                          {PAYOUT_STATUS_LABELS[settlement.payoutStatus]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {settlement?.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedSettlement(settlement)
                              setConfirmSettlementModal(true)
                            }}
                          >
                            精算確定
                          </Button>
                        )}
                        {settlement?.status === 'invoiced' && settlement.payoutStatus === 'unpaid' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRequestPayout(settlement)}
                            loading={processing}
                          >
                            振込依頼
                          </Button>
                        )}
                        {settlement?.payoutStatus === 'requested' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCompletePayout(settlement)}
                            loading={processing}
                          >
                            振込完了
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-border">
          <CardTitle>紐づき顧客契約</CardTitle>
        </div>
        {agentContracts.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">紐づき契約がありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>紐づけ開始月</TableHead>
                <TableHead>契約ステータス</TableHead>
                <TableHead>紐づけ状態</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentContracts.map((ac) => (
                <TableRow key={ac.id}>
                  <TableCell>
                    {ac.store ? (
                      <Link
                        href={`/contracts/${ac.contractId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {ac.store.accountName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">不明</span>
                    )}
                  </TableCell>
                  <TableCell>{formatMonth(ac.billingMonth)}</TableCell>
                  <TableCell>
                    {ac.contract ? (
                      <Badge variant={CONTRACT_STATUS_VARIANT[ac.contract.status]}>
                        {CONTRACT_STATUS_LABELS[ac.contract.status]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={AGENT_CONTRACT_STATUS_VARIANT[ac.status]}>
                      {AGENT_CONTRACT_STATUS_LABELS[ac.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/contracts/${ac.contractId}`}
                      className="text-sm text-foreground hover:text-primary"
                    >
                      詳細を見る
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={confirmSettlementModal}
        onClose={() => {
          setConfirmSettlementModal(false)
          setSelectedSettlement(null)
        }}
        title="精算を確定"
      >
        {selectedSettlement && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              以下の内容で精算を確定します。確定後は請求書が発行されます。
            </p>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">対象月</span>
                <span className="text-sm font-medium">{formatMonth(selectedSettlement.billingMonth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">支払件数</span>
                <span className="text-sm font-medium">{selectedSettlement.payableCount}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">相殺件数</span>
                <span className="text-sm font-medium">{selectedSettlement.cancelledOffset}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">単価</span>
                <span className="text-sm font-medium">{formatCurrency(selectedSettlement.unitPrice)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-sm font-medium text-foreground">合計金額</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(selectedSettlement.totalAmount)}
                </span>
              </div>
            </div>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmSettlementModal(false)
                  setSelectedSettlement(null)
                }}
              >
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleConfirmSettlement} loading={processing}>
                精算を確定
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  )
}
