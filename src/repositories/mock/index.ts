import type {
  AccountRepository,
  AgencyRepository,
  LinkageErrorRepository,
  ContractRepository,
  ContractFilters,
  InvoiceRepository,
  PaymentRepository,
  RouteIntegrationRepository,
  NotificationRepository,
  OpsLogRepository,
  PlanRepository,
  AgentRepository,
  AgentContractRepository,
  AgentPerformanceRepository,
  AgentEntitlementRepository,
  AgentSettlementRepository,
} from '../interfaces'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  Agency,
  CreateAgencyInput,
  UpdateAgencyInput,
  LinkageError,
  CreateLinkageErrorInput,
  UpdateLinkageErrorInput,
  Contract,
  CreateContractInput,
  UpdateContractInput,
  Invoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  Payment,
  CreatePaymentInput,
  RouteIntegration,
  CreateRouteIntegrationInput,
  UpdateRouteIntegrationInput,
  Notification,
  CreateNotificationInput,
  OpsLog,
  CreateOpsLogInput,
  Plan,
  CreatePlanInput,
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentContract,
  CreateAgentContractInput,
  AgentMonthlyPerformance,
  AgentMonthlyEntitlement,
  AgentSettlement,
  CreateAgentSettlementInput,
  UpdateAgentSettlementInput,
} from '@/domain/types'
import type { ContractStatus, InvoiceStatus, PaymentStatus, NotificationStatus, AgentSettlementStatus, PayoutStatus, PayoutMethod } from '@/domain/status'
import { generateId, randomDelay } from '@/lib/utils'
import {
  accounts as seedAccounts,
  agencies as seedAgencies,
  linkageErrors as seedLinkageErrors,
  contracts as seedContracts,
  invoices as seedInvoices,
  payments as seedPayments,
  routeIntegrations as seedRouteIntegrations,
  notifications as seedNotifications,
  opsLogs as seedOpsLogs,
  plans as seedPlans,
  agents as seedAgents,
  agentContracts as seedAgentContracts,
  agentPerformances as seedAgentPerformances,
  agentEntitlements as seedAgentEntitlements,
  agentSettlements as seedAgentSettlements,
} from '@/seed/data'

let accounts: Account[] = [...seedAccounts]
let agencies: Agency[] = [...seedAgencies]
let linkageErrors: LinkageError[] = [...seedLinkageErrors]
let contracts: Contract[] = [...seedContracts]
let invoices: Invoice[] = [...seedInvoices]
let payments: Payment[] = [...seedPayments]
let routeIntegrations: RouteIntegration[] = [...seedRouteIntegrations]
let notifications: Notification[] = [...seedNotifications]
let opsLogs: OpsLog[] = [...seedOpsLogs]
let plans: Plan[] = [...seedPlans]
let agents: Agent[] = [...seedAgents]
let agentContractsData: AgentContract[] = [...seedAgentContracts]
let agentPerformances: AgentMonthlyPerformance[] = [...seedAgentPerformances]
let agentEntitlements: AgentMonthlyEntitlement[] = [...seedAgentEntitlements]
let agentSettlements: AgentSettlement[] = [...seedAgentSettlements]

export const mockAccountRepository: AccountRepository = {
  async list(orgId: string): Promise<Account[]> {
    await randomDelay()
    return accounts.filter((a) => a.orgId === orgId)
  },

  async search(orgId: string, query: string): Promise<Account[]> {
    await randomDelay()
    const lowerQuery = query.toLowerCase()
    return accounts.filter(
      (a) => a.orgId === orgId && (
        a.accountName.toLowerCase().includes(lowerQuery) ||
        a.adminEmail.toLowerCase().includes(lowerQuery) ||
        a.prefecture.toLowerCase().includes(lowerQuery) ||
        a.addressDetail.toLowerCase().includes(lowerQuery)
      )
    )
  },

  async get(id: string): Promise<Account | null> {
    await randomDelay()
    return accounts.find((a) => a.id === id) || null
  },

  async create(input: CreateAccountInput): Promise<Account> {
    await randomDelay()
    const now = new Date()
    const account: Account = {
      ...input,
      id: generateId(),
      totalContracts: 0,
      totalMonthlyFee: 0,
      createdAt: now,
      updatedAt: now,
    }
    accounts.push(account)
    return account
  },

  async update(id: string, input: UpdateAccountInput): Promise<Account> {
    await randomDelay()
    const index = accounts.findIndex((a) => a.id === id)
    if (index === -1) throw new Error('Account not found')
    const updated = {
      ...accounts[index],
      ...input,
      updatedAt: new Date(),
    }
    accounts[index] = updated
    return updated
  },

  async listByAgency(agencyId: string): Promise<Account[]> {
    await randomDelay()
    return accounts.filter((a) => a.agencyId === agencyId)
  },
}

export const mockAgencyRepository: AgencyRepository = {
  async list(orgId: string): Promise<Agency[]> {
    await randomDelay()
    return agencies.filter((a) => a.orgId === orgId)
  },

  async search(orgId: string, query: string): Promise<Agency[]> {
    await randomDelay()
    const lowerQuery = query.toLowerCase()
    return agencies.filter(
      (a) => a.orgId === orgId && (
        a.agencyName.toLowerCase().includes(lowerQuery) ||
        a.email.toLowerCase().includes(lowerQuery)
      )
    )
  },

  async get(id: string): Promise<Agency | null> {
    await randomDelay()
    return agencies.find((a) => a.id === id) || null
  },

  async create(input: CreateAgencyInput): Promise<Agency> {
    await randomDelay()
    const now = new Date()
    const agency: Agency = {
      ...input,
      id: generateId(),
      acquiredLocationCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    agencies.push(agency)
    return agency
  },

  async update(id: string, input: UpdateAgencyInput): Promise<Agency> {
    await randomDelay()
    const index = agencies.findIndex((a) => a.id === id)
    if (index === -1) throw new Error('Agency not found')
    const updated = {
      ...agencies[index],
      ...input,
      updatedAt: new Date(),
    }
    agencies[index] = updated
    return updated
  },
}

export const mockLinkageErrorRepository: LinkageErrorRepository = {
  async list(orgId: string): Promise<LinkageError[]> {
    await randomDelay()
    return linkageErrors.filter((e) => e.orgId === orgId)
  },

  async listByAccount(accountId: string): Promise<LinkageError[]> {
    await randomDelay()
    return linkageErrors.filter((e) => e.accountId === accountId)
  },

  async listUnresolved(orgId: string): Promise<LinkageError[]> {
    await randomDelay()
    return linkageErrors.filter((e) => e.orgId === orgId && e.resolvedAt === null)
  },

  async get(id: string): Promise<LinkageError | null> {
    await randomDelay()
    return linkageErrors.find((e) => e.id === id) || null
  },

  async create(input: CreateLinkageErrorInput): Promise<LinkageError> {
    await randomDelay()
    const now = new Date()
    const error: LinkageError = {
      ...input,
      id: generateId(),
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    linkageErrors.push(error)
    return error
  },

  async update(id: string, input: UpdateLinkageErrorInput): Promise<LinkageError> {
    await randomDelay()
    const index = linkageErrors.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('LinkageError not found')
    const updated = {
      ...linkageErrors[index],
      ...input,
      updatedAt: new Date(),
    }
    linkageErrors[index] = updated
    return updated
  },

  async resolve(id: string): Promise<LinkageError> {
    await randomDelay()
    const index = linkageErrors.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('LinkageError not found')
    const now = new Date()
    const updated = {
      ...linkageErrors[index],
      resolvedAt: now,
      updatedAt: now,
    }
    linkageErrors[index] = updated
    return updated
  },
}

export const mockContractRepository: ContractRepository = {
  async list(orgId: string): Promise<Contract[]> {
    await randomDelay()
    return contracts.filter((c) => c.orgId === orgId)
  },

  async filter(orgId: string, filters: ContractFilters): Promise<Contract[]> {
    await randomDelay()
    return contracts.filter((c) => {
      if (c.orgId !== orgId) return false
      if (filters.status && filters.status.length > 0 && !filters.status.includes(c.status)) return false
      if (filters.planId && c.planId !== filters.planId) return false
      if (filters.billingMethod && c.billingMethod !== filters.billingMethod) return false
      if (filters.salesOwnerUserId && c.salesOwnerUserId !== filters.salesOwnerUserId) return false
      if (filters.opsOwnerUserId && c.opsOwnerUserId !== filters.opsOwnerUserId) return false
      return true
    })
  },

  async listByAccount(accountId: string): Promise<Contract[]> {
    await randomDelay()
    return contracts.filter((c) => c.accountId === accountId)
  },

  async get(id: string): Promise<Contract | null> {
    await randomDelay()
    return contracts.find((c) => c.id === id) || null
  },

  async create(input: CreateContractInput): Promise<Contract> {
    await randomDelay()
    const now = new Date()
    const contract: Contract = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    contracts.push(contract)
    return contract
  },

  async update(id: string, input: UpdateContractInput): Promise<Contract> {
    await randomDelay()
    const index = contracts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contract not found')
    const updated = {
      ...contracts[index],
      ...input,
      updatedAt: new Date(),
    }
    contracts[index] = updated
    return updated
  },

  async changeStatus(id: string, status: ContractStatus): Promise<Contract> {
    await randomDelay()
    const index = contracts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contract not found')
    const updated = {
      ...contracts[index],
      status,
      updatedAt: new Date(),
    }
    contracts[index] = updated
    return updated
  },
}

export const mockInvoiceRepository: InvoiceRepository = {
  async listByMonth(orgId: string, billingMonth: Date): Promise<Invoice[]> {
    await randomDelay()
    return invoices.filter(
      (i) =>
        i.orgId === orgId &&
        i.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        i.billingMonth.getMonth() === billingMonth.getMonth()
    )
  },

  async listByContract(contractId: string): Promise<Invoice[]> {
    await randomDelay()
    return invoices.filter((i) => i.contractId === contractId)
  },

  async listByStatus(orgId: string, statuses: InvoiceStatus[]): Promise<Invoice[]> {
    await randomDelay()
    return invoices.filter((i) => i.orgId === orgId && statuses.includes(i.status))
  },

  async get(id: string): Promise<Invoice | null> {
    await randomDelay()
    return invoices.find((i) => i.id === id) || null
  },

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    await randomDelay()
    const now = new Date()
    const invoice: Invoice = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    invoices.push(invoice)
    return invoice
  },

  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    await randomDelay()
    const index = invoices.findIndex((i) => i.id === id)
    if (index === -1) throw new Error('Invoice not found')
    const updated = {
      ...invoices[index],
      ...input,
      updatedAt: new Date(),
    }
    invoices[index] = updated
    return updated
  },

  async markSent(id: string): Promise<Invoice> {
    await randomDelay()
    const index = invoices.findIndex((i) => i.id === id)
    if (index === -1) throw new Error('Invoice not found')
    const now = new Date()
    const updated = {
      ...invoices[index],
      status: 'sent' as InvoiceStatus,
      sentAt: now,
      updatedAt: now,
    }
    invoices[index] = updated
    return updated
  },

  async markPaid(id: string): Promise<Invoice> {
    await randomDelay()
    const index = invoices.findIndex((i) => i.id === id)
    if (index === -1) throw new Error('Invoice not found')
    const updated = {
      ...invoices[index],
      status: 'paid' as InvoiceStatus,
      updatedAt: new Date(),
    }
    invoices[index] = updated
    return updated
  },

  async markOverdue(id: string): Promise<Invoice> {
    await randomDelay()
    const index = invoices.findIndex((i) => i.id === id)
    if (index === -1) throw new Error('Invoice not found')
    const updated = {
      ...invoices[index],
      status: 'overdue' as InvoiceStatus,
      updatedAt: new Date(),
    }
    invoices[index] = updated
    return updated
  },
}

export const mockPaymentRepository: PaymentRepository = {
  async listByContract(contractId: string): Promise<Payment[]> {
    await randomDelay()
    return payments.filter((p) => p.contractId === contractId)
  },

  async listByInvoice(invoiceId: string): Promise<Payment[]> {
    await randomDelay()
    return payments.filter((p) => p.invoiceId === invoiceId)
  },

  async listByStatus(orgId: string, statuses: PaymentStatus[]): Promise<Payment[]> {
    await randomDelay()
    return payments.filter((p) => p.orgId === orgId && statuses.includes(p.status))
  },

  async get(id: string): Promise<Payment | null> {
    await randomDelay()
    return payments.find((p) => p.id === id) || null
  },

  async create(input: CreatePaymentInput): Promise<Payment> {
    await randomDelay()
    const payment: Payment = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
    }
    payments.push(payment)
    return payment
  },

  async markSucceeded(id: string, paidAt: Date): Promise<Payment> {
    await randomDelay()
    const index = payments.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Payment not found')
    const updated = {
      ...payments[index],
      status: 'succeeded' as PaymentStatus,
      paidAt,
    }
    payments[index] = updated
    return updated
  },

  async markFailed(id: string, reason: string): Promise<Payment> {
    await randomDelay()
    const index = payments.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Payment not found')
    const updated = {
      ...payments[index],
      status: 'failed' as PaymentStatus,
      failureReason: reason,
    }
    payments[index] = updated
    return updated
  },
}

export const mockRouteIntegrationRepository: RouteIntegrationRepository = {
  async getByContract(contractId: string): Promise<RouteIntegration | null> {
    await randomDelay()
    return routeIntegrations.find((r) => r.contractId === contractId) || null
  },

  async listByStatus(orgId: string, statuses: string[]): Promise<RouteIntegration[]> {
    await randomDelay()
    return routeIntegrations.filter((r) => r.orgId === orgId && statuses.includes(r.status))
  },

  async create(input: CreateRouteIntegrationInput): Promise<RouteIntegration> {
    await randomDelay()
    const route: RouteIntegration = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    routeIntegrations.push(route)
    return route
  },

  async update(id: string, input: UpdateRouteIntegrationInput): Promise<RouteIntegration> {
    await randomDelay()
    const index = routeIntegrations.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('RouteIntegration not found')
    const updated = {
      ...routeIntegrations[index],
      ...input,
      updatedAt: new Date(),
    }
    routeIntegrations[index] = updated
    return updated
  },
}

export const mockNotificationRepository: NotificationRepository = {
  async listByContract(contractId: string): Promise<Notification[]> {
    await randomDelay()
    return notifications.filter((n) => n.contractId === contractId)
  },

  async listByStatus(orgId: string, statuses: NotificationStatus[]): Promise<Notification[]> {
    await randomDelay()
    return notifications.filter((n) => n.orgId === orgId && statuses.includes(n.status))
  },

  async get(id: string): Promise<Notification | null> {
    await randomDelay()
    return notifications.find((n) => n.id === id) || null
  },

  async createDraft(input: CreateNotificationInput): Promise<Notification> {
    await randomDelay()
    const notification: Notification = {
      ...input,
      id: generateId(),
      status: 'draft',
      createdAt: new Date(),
    }
    notifications.push(notification)
    return notification
  },

  async updateDraft(id: string, subject: string, body: string): Promise<Notification> {
    await randomDelay()
    const index = notifications.findIndex((n) => n.id === id)
    if (index === -1) throw new Error('Notification not found')
    const updated = {
      ...notifications[index],
      subject,
      body,
    }
    notifications[index] = updated
    return updated
  },

  async markSent(id: string): Promise<Notification> {
    await randomDelay()
    const index = notifications.findIndex((n) => n.id === id)
    if (index === -1) throw new Error('Notification not found')
    const now = new Date()
    const updated = {
      ...notifications[index],
      status: 'sent' as NotificationStatus,
      sentAt: now,
    }
    notifications[index] = updated
    return updated
  },

  async markFailed(id: string, errorMessage: string): Promise<Notification> {
    await randomDelay()
    const index = notifications.findIndex((n) => n.id === id)
    if (index === -1) throw new Error('Notification not found')
    const updated = {
      ...notifications[index],
      status: 'failed' as NotificationStatus,
      errorMessage,
    }
    notifications[index] = updated
    return updated
  },
}

export const mockOpsLogRepository: OpsLogRepository = {
  async listByContract(contractId: string): Promise<OpsLog[]> {
    await randomDelay()
    return opsLogs.filter((l) => l.contractId === contractId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  async append(input: CreateOpsLogInput): Promise<OpsLog> {
    await randomDelay()
    const log: OpsLog = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
    }
    opsLogs.push(log)
    return log
  },
}

export const mockPlanRepository: PlanRepository = {
  async list(orgId: string): Promise<Plan[]> {
    await randomDelay()
    return plans.filter((p) => p.orgId === orgId)
  },

  async listActive(orgId: string): Promise<Plan[]> {
    await randomDelay()
    return plans.filter((p) => p.orgId === orgId && p.isActive)
  },

  async get(id: string): Promise<Plan | null> {
    await randomDelay()
    return plans.find((p) => p.id === id) || null
  },

  async create(input: CreatePlanInput): Promise<Plan> {
    await randomDelay()
    const now = new Date()
    const plan: Plan = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    plans.push(plan)
    return plan
  },
}

export function resetMockData() {
  accounts = [...seedAccounts]
  agencies = [...seedAgencies]
  linkageErrors = [...seedLinkageErrors]
  contracts = [...seedContracts]
  invoices = [...seedInvoices]
  payments = [...seedPayments]
  routeIntegrations = [...seedRouteIntegrations]
  notifications = [...seedNotifications]
  opsLogs = [...seedOpsLogs]
  plans = [...seedPlans]
  agents = [...seedAgents]
  agentContractsData = [...seedAgentContracts]
  agentPerformances = [...seedAgentPerformances]
  agentEntitlements = [...seedAgentEntitlements]
  agentSettlements = [...seedAgentSettlements]
}

export function getMockAccounts() {
  return accounts
}

export function getMockAgencies() {
  return agencies
}

export function getMockLinkageErrors() {
  return linkageErrors
}

export function getMockContracts() {
  return contracts
}

export function getMockInvoices() {
  return invoices
}

export function getMockPayments() {
  return payments
}

export function getMockAgents() {
  return agents
}

export function getMockAgentSettlements() {
  return agentSettlements
}

// Agent Mock Repositories
export const mockAgentRepository: AgentRepository = {
  async list(orgId: string): Promise<Agent[]> {
    await randomDelay()
    return agents.filter((a) => a.orgId === orgId)
  },

  async listActive(orgId: string): Promise<Agent[]> {
    await randomDelay()
    return agents.filter((a) => a.orgId === orgId && a.isActive)
  },

  async get(id: string): Promise<Agent | null> {
    await randomDelay()
    return agents.find((a) => a.id === id) || null
  },

  async create(input: CreateAgentInput): Promise<Agent> {
    await randomDelay()
    const now = new Date()
    const agent: Agent = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    agents.push(agent)
    return agent
  },

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    await randomDelay()
    const index = agents.findIndex((a) => a.id === id)
    if (index === -1) throw new Error('Agent not found')
    const updated = {
      ...agents[index],
      ...input,
      updatedAt: new Date(),
    }
    agents[index] = updated
    return updated
  },

  async deactivate(id: string): Promise<Agent> {
    await randomDelay()
    const index = agents.findIndex((a) => a.id === id)
    if (index === -1) throw new Error('Agent not found')
    const updated = {
      ...agents[index],
      isActive: false,
      contractEndDate: new Date(),
      updatedAt: new Date(),
    }
    agents[index] = updated
    return updated
  },
}

export const mockAgentContractRepository: AgentContractRepository = {
  async listByAgent(agentId: string): Promise<AgentContract[]> {
    await randomDelay()
    return agentContractsData.filter((ac) => ac.agentId === agentId)
  },

  async listByContract(contractId: string): Promise<AgentContract[]> {
    await randomDelay()
    return agentContractsData.filter((ac) => ac.contractId === contractId)
  },

  async create(input: CreateAgentContractInput): Promise<AgentContract> {
    await randomDelay()
    const agentContract: AgentContract = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
    }
    agentContractsData.push(agentContract)
    return agentContract
  },

  async cancel(id: string): Promise<AgentContract> {
    await randomDelay()
    const index = agentContractsData.findIndex((ac) => ac.id === id)
    if (index === -1) throw new Error('AgentContract not found')
    const updated = {
      ...agentContractsData[index],
      status: 'cancelled' as const,
    }
    agentContractsData[index] = updated
    return updated
  },
}

export const mockAgentPerformanceRepository: AgentPerformanceRepository = {
  async listByAgent(agentId: string): Promise<AgentMonthlyPerformance[]> {
    await randomDelay()
    return agentPerformances.filter((p) => p.agentId === agentId)
  },

  async getByMonth(agentId: string, billingMonth: Date): Promise<AgentMonthlyPerformance | null> {
    await randomDelay()
    return agentPerformances.find(
      (p) =>
        p.agentId === agentId &&
        p.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        p.billingMonth.getMonth() === billingMonth.getMonth()
    ) || null
  },

  async upsert(agentId: string, billingMonth: Date, acquiredCount: number): Promise<AgentMonthlyPerformance> {
    await randomDelay()
    const existing = agentPerformances.findIndex(
      (p) =>
        p.agentId === agentId &&
        p.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        p.billingMonth.getMonth() === billingMonth.getMonth()
    )
    if (existing !== -1) {
      agentPerformances[existing] = {
        ...agentPerformances[existing],
        acquiredCount,
      }
      return agentPerformances[existing]
    }
    const performance: AgentMonthlyPerformance = {
      id: generateId(),
      agentId,
      billingMonth,
      acquiredCount,
      createdAt: new Date(),
    }
    agentPerformances.push(performance)
    return performance
  },
}

export const mockAgentEntitlementRepository: AgentEntitlementRepository = {
  async listByAgent(agentId: string): Promise<AgentMonthlyEntitlement[]> {
    await randomDelay()
    return agentEntitlements.filter((e) => e.agentId === agentId)
  },

  async getByMonth(agentId: string, billingMonth: Date): Promise<AgentMonthlyEntitlement | null> {
    await randomDelay()
    return agentEntitlements.find(
      (e) =>
        e.agentId === agentId &&
        e.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        e.billingMonth.getMonth() === billingMonth.getMonth()
    ) || null
  },

  async calculate(agentId: string, billingMonth: Date): Promise<AgentMonthlyEntitlement> {
    await randomDelay()
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) throw new Error('Agent not found')

    const activeContracts = agentContractsData.filter(
      (ac) => ac.agentId === agentId && ac.status === 'active'
    ).length

    const entitledCount = agent.monthlyTarget
    const earnedCount = Math.min(activeContracts, entitledCount)
    const deficitCount = entitledCount - earnedCount

    const existing = agentEntitlements.findIndex(
      (e) =>
        e.agentId === agentId &&
        e.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        e.billingMonth.getMonth() === billingMonth.getMonth()
    )

    const entitlement: AgentMonthlyEntitlement = {
      id: existing !== -1 ? agentEntitlements[existing].id : generateId(),
      agentId,
      billingMonth,
      entitledCount,
      earnedCount,
      deficitCount,
      createdAt: existing !== -1 ? agentEntitlements[existing].createdAt : new Date(),
    }

    if (existing !== -1) {
      agentEntitlements[existing] = entitlement
    } else {
      agentEntitlements.push(entitlement)
    }
    return entitlement
  },
}

export const mockAgentSettlementRepository: AgentSettlementRepository = {
  async listByAgent(agentId: string): Promise<AgentSettlement[]> {
    await randomDelay()
    return agentSettlements.filter((s) => s.agentId === agentId).sort(
      (a, b) => b.billingMonth.getTime() - a.billingMonth.getTime()
    )
  },

  async listByStatus(orgId: string, statuses: AgentSettlementStatus[]): Promise<AgentSettlement[]> {
    await randomDelay()
    const orgAgentIds = agents.filter((a) => a.orgId === orgId).map((a) => a.id)
    return agentSettlements.filter(
      (s) => orgAgentIds.includes(s.agentId) && statuses.includes(s.status)
    )
  },

  async listByPayoutStatus(orgId: string, statuses: PayoutStatus[]): Promise<AgentSettlement[]> {
    await randomDelay()
    const orgAgentIds = agents.filter((a) => a.orgId === orgId).map((a) => a.id)
    return agentSettlements.filter(
      (s) => orgAgentIds.includes(s.agentId) && statuses.includes(s.payoutStatus)
    )
  },

  async get(id: string): Promise<AgentSettlement | null> {
    await randomDelay()
    return agentSettlements.find((s) => s.id === id) || null
  },

  async getByMonth(agentId: string, billingMonth: Date): Promise<AgentSettlement | null> {
    await randomDelay()
    return agentSettlements.find(
      (s) =>
        s.agentId === agentId &&
        s.billingMonth.getFullYear() === billingMonth.getFullYear() &&
        s.billingMonth.getMonth() === billingMonth.getMonth()
    ) || null
  },

  async create(input: CreateAgentSettlementInput): Promise<AgentSettlement> {
    await randomDelay()
    const now = new Date()
    const settlement: AgentSettlement = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    agentSettlements.push(settlement)
    return settlement
  },

  async update(id: string, input: UpdateAgentSettlementInput): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      ...input,
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },

  async markInvoiced(id: string): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      status: 'invoiced' as AgentSettlementStatus,
      invoiceId: `agent-inv-${generateId()}`,
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },

  async markPaid(id: string): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      status: 'paid' as AgentSettlementStatus,
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },

  async requestPayout(id: string, method: string, providerId: string): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      payoutMethod: method as PayoutMethod,
      payoutStatus: 'requested' as PayoutStatus,
      payoutRequestedAt: new Date(),
      payoutProviderId: providerId,
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },

  async completePayout(id: string): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      payoutStatus: 'paid' as PayoutStatus,
      payoutCompletedAt: new Date(),
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },

  async failPayout(id: string, reason: string): Promise<AgentSettlement> {
    await randomDelay()
    const index = agentSettlements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('AgentSettlement not found')
    const updated = {
      ...agentSettlements[index],
      payoutStatus: 'failed' as PayoutStatus,
      payoutErrorReason: reason,
      updatedAt: new Date(),
    }
    agentSettlements[index] = updated
    return updated
  },
}
