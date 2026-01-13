'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState, NoDataIcon } from '@/components/ui'
import { mockAgentRepository, mockAgentSettlementRepository, mockAgentContractRepository } from '@/repositories/mock'
import type { Agent, AgentSettlement } from '@/domain/types'
import { AGENT_SETTLEMENT_STATUS_LABELS, AGENT_SETTLEMENT_STATUS_VARIANT, PAYOUT_STATUS_LABELS, PAYOUT_STATUS_VARIANT } from '@/domain/status'
import { formatCurrency } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

interface AgentWithStats extends Agent {
  currentMonthSettlement: AgentSettlement | null
  activeContractCount: number
}

export default function AgentsPage() {
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const agentList = await mockAgentRepository.list(DEFAULT_ORG_ID)

      const agentsWithStats = await Promise.all(
        agentList.map(async (agent) => {
          const settlements = await mockAgentSettlementRepository.listByAgent(agent.id)
          const thisMonth = new Date()
          const currentMonthSettlement = settlements.find(
            (s) =>
              s.billingMonth.getFullYear() === thisMonth.getFullYear() &&
              s.billingMonth.getMonth() === thisMonth.getMonth()
          ) || null

          const agentContracts = await mockAgentContractRepository.listByAgent(agent.id)
          const activeContractCount = agentContracts.filter((ac) => ac.status === 'active').length

          return {
            ...agent,
            currentMonthSettlement,
            activeContractCount,
          }
        })
      )

      setAgents(agentsWithStats)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAgents = agents.filter((agent) => {
    if (filter === 'all') return true
    if (filter === 'active') return agent.isActive
    return !agent.isActive
  })

  const totalActiveAgents = agents.filter((a) => a.isActive).length
  const totalSettlementAmount = agents
    .filter((a) => a.isActive && a.currentMonthSettlement)
    .reduce((sum, a) => sum + (a.currentMonthSettlement?.totalAmount || 0), 0)
  const draftCount = agents.filter(
    (a) => a.isActive && a.currentMonthSettlement?.status === 'draft'
  ).length
  const unpaidCount = agents.filter(
    (a) => a.isActive && a.currentMonthSettlement?.payoutStatus === 'unpaid' && a.currentMonthSettlement?.status === 'invoiced'
  ).length

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">代理店管理</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">OEM代理店の一覧と月次精算管理</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">契約中代理店</p>
              <p className="text-xl font-bold text-foreground">{totalActiveAgents}社</p>
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
              <p className="text-sm text-muted-foreground">今月精算予定</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalSettlementAmount)}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${draftCount > 0 ? 'bg-amber-50' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${draftCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">精算確定待ち</p>
              <p className={`text-xl font-bold ${draftCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>{draftCount}件</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${unpaidCount > 0 ? 'bg-destructive/10' : 'bg-muted'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${unpaidCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">振込待ち</p>
              <p className={`text-xl font-bold ${unpaidCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{unpaidCount}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent List */}
      <Card padding="none">
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex min-w-max">
            {[
              { key: 'active', label: '契約中', count: agents.filter((a) => a.isActive).length },
              { key: 'inactive', label: '契約終了', count: agents.filter((a) => !a.isActive).length },
              { key: 'all', label: 'すべて', count: agents.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm rounded-md ${
                  filter === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {filteredAgents.length === 0 ? (
          <EmptyState
            title="代理店がありません"
            description={filter === 'active' ? '契約中の代理店がありません' : '該当する代理店がありません'}
            icon={<NoDataIcon />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代理店名</TableHead>
                  <TableHead className="hidden sm:table-cell">契約状態</TableHead>
                  <TableHead className="text-right hidden md:table-cell">今月実績 / 目標</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">支払件数</TableHead>
                  <TableHead className="text-right">今月請求金額</TableHead>
                  <TableHead className="hidden sm:table-cell">精算状態</TableHead>
                  <TableHead className="hidden md:table-cell">振込状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => {
                  const settlement = agent.currentMonthSettlement
                  return (
                    <TableRow
                      key={agent.id}
                      clickable
                      onClick={() => window.location.href = `/agents/${agent.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            agent.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            <span className="text-xs sm:text-sm font-bold">{agent.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/agents/${agent.id}`}
                              className="font-medium text-foreground hover:text-foreground truncate block max-w-[120px] sm:max-w-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {agent.name}
                            </Link>
                            <p className="text-sm text-muted-foreground hidden sm:block">
                              単価: {formatCurrency(agent.stockUnitPrice)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                          {agent.isActive ? '契約中' : '契約終了'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className={`font-medium ${
                          agent.activeContractCount >= agent.monthlyTarget ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {agent.activeContractCount}
                        </span>
                        <span className="text-muted-foreground"> / {agent.monthlyTarget}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium hidden lg:table-cell">
                        {settlement ? settlement.payableCount : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {settlement ? formatCurrency(settlement.totalAmount) : '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {settlement ? (
                          <Badge variant={AGENT_SETTLEMENT_STATUS_VARIANT[settlement.status]}>
                            {AGENT_SETTLEMENT_STATUS_LABELS[settlement.status]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {settlement ? (
                          <Badge variant={PAYOUT_STATUS_VARIANT[settlement.payoutStatus]}>
                            {PAYOUT_STATUS_LABELS[settlement.payoutStatus]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
