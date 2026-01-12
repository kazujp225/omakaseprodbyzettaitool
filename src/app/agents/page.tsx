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
          <h1 className="text-3xl font-bold text-navy-800">代理店管理</h1>
          <p className="mt-2 text-navy-400">OEM代理店の一覧と月次精算管理</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-navy-400">契約中代理店</p>
              <p className="text-xl font-bold text-navy-800">{totalActiveAgents}社</p>
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
              <p className="text-sm text-navy-400">今月精算予定</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalSettlementAmount)}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${draftCount > 0 ? 'bg-amber-50' : 'bg-gray-50'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${draftCount > 0 ? 'text-amber-600' : 'text-navy-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-navy-400">精算確定待ち</p>
              <p className={`text-xl font-bold ${draftCount > 0 ? 'text-amber-600' : 'text-navy-800'}`}>{draftCount}件</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${unpaidCount > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-md flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${unpaidCount > 0 ? 'text-red-600' : 'text-navy-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-navy-400">振込待ち</p>
              <p className={`text-xl font-bold ${unpaidCount > 0 ? 'text-red-600' : 'text-navy-800'}`}>{unpaidCount}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent List */}
      <Card padding="none">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { key: 'active', label: '契約中', count: agents.filter((a) => a.isActive).length },
              { key: 'inactive', label: '契約終了', count: agents.filter((a) => !a.isActive).length },
              { key: 'all', label: 'すべて', count: agents.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-primary-600 text-accent-600'
                    : 'border-transparent text-navy-400 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 text-sm rounded-md ${
                  filter === tab.key ? 'bg-primary-100 text-accent-600' : 'bg-gray-100 text-navy-500'
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>代理店名</TableHead>
                <TableHead>契約状態</TableHead>
                <TableHead className="text-right">今月実績 / 目標</TableHead>
                <TableHead className="text-right">支払件数</TableHead>
                <TableHead className="text-right">今月請求金額</TableHead>
                <TableHead>精算状態</TableHead>
                <TableHead>振込状態</TableHead>
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
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          agent.isActive ? 'bg-primary-100 text-accent-600' : 'bg-gray-100 text-navy-400'
                        }`}>
                          <span className="text-sm font-bold">{agent.name.charAt(0)}</span>
                        </div>
                        <div>
                          <Link
                            href={`/agents/${agent.id}`}
                            className="font-medium text-navy-800 hover:text-navy-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {agent.name}
                          </Link>
                          <p className="text-sm text-navy-400">
                            単価: {formatCurrency(agent.stockUnitPrice)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                        {agent.isActive ? '契約中' : '契約終了'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${
                        agent.activeContractCount >= agent.monthlyTarget ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {agent.activeContractCount}
                      </span>
                      <span className="text-gray-400"> / {agent.monthlyTarget}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {settlement ? settlement.payableCount : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {settlement ? formatCurrency(settlement.totalAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      {settlement ? (
                        <Badge variant={AGENT_SETTLEMENT_STATUS_VARIANT[settlement.status]}>
                          {AGENT_SETTLEMENT_STATUS_LABELS[settlement.status]}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {settlement ? (
                        <Badge variant={PAYOUT_STATUS_VARIANT[settlement.payoutStatus]}>
                          {PAYOUT_STATUS_LABELS[settlement.payoutStatus]}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
