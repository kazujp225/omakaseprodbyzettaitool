import { AgentContractStatus, AgentSettlementStatus, PayoutStatus, PayoutMethod } from '../status'

export interface Agent {
  id: string
  orgId: string
  name: string
  contractStartDate: Date
  contractEndDate: Date | null
  stockUnitPrice: number
  monthlyTarget: number
  settlementType: 'stock_only'
  isActive: boolean
  contactEmail: string | null
  contactPhone: string | null
  bankName: string | null
  bankBranch: string | null
  bankAccountType: 'ordinary' | 'current' | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AgentContract {
  id: string
  agentId: string
  contractId: string
  billingMonth: Date
  status: AgentContractStatus
  createdAt: Date
}

export interface AgentMonthlyPerformance {
  id: string
  agentId: string
  billingMonth: Date
  acquiredCount: number
  createdAt: Date
}

export interface AgentMonthlyEntitlement {
  id: string
  agentId: string
  billingMonth: Date
  entitledCount: number
  earnedCount: number
  deficitCount: number
  createdAt: Date
}

export interface AgentSettlement {
  id: string
  agentId: string
  billingMonth: Date
  entitledCount: number
  payableCount: number
  cancelledOffset: number
  unitPrice: number
  totalAmount: number
  status: AgentSettlementStatus
  invoiceId: string | null
  payoutMethod: PayoutMethod | null
  payoutStatus: PayoutStatus
  payoutRequestedAt: Date | null
  payoutCompletedAt: Date | null
  payoutProvider: string | null
  payoutProviderId: string | null
  payoutErrorReason: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateAgentInput = Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAgentInput = Partial<Omit<CreateAgentInput, 'orgId'>>

export type CreateAgentContractInput = Omit<AgentContract, 'id' | 'createdAt'>

export type CreateAgentSettlementInput = Omit<AgentSettlement, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAgentSettlementInput = Partial<Omit<CreateAgentSettlementInput, 'agentId' | 'billingMonth'>>
