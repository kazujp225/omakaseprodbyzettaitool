import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  Agency,
  CreateAgencyInput,
  UpdateAgencyInput,
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
  LinkageError,
  CreateLinkageErrorInput,
  UpdateLinkageErrorInput,
  CallRecord,
  CreateCallRecordInput,
  UpdateCallRecordInput,
  CallHistory,
  CreateCallHistoryInput,
} from '@/domain/types'
import type { ContractStatus, InvoiceStatus, PaymentStatus, NotificationStatus, AgentSettlementStatus, PayoutStatus, CallRecordStatus, CallResult } from '@/domain/status'

export interface AccountRepository {
  list(orgId: string): Promise<Account[]>
  search(orgId: string, query: string): Promise<Account[]>
  get(id: string): Promise<Account | null>
  create(input: CreateAccountInput): Promise<Account>
  update(id: string, input: UpdateAccountInput): Promise<Account>
  listByAgency(agencyId: string): Promise<Account[]>
}

export interface AgencyRepository {
  list(orgId: string): Promise<Agency[]>
  search(orgId: string, query: string): Promise<Agency[]>
  get(id: string): Promise<Agency | null>
  create(input: CreateAgencyInput): Promise<Agency>
  update(id: string, input: UpdateAgencyInput): Promise<Agency>
}

export interface LinkageErrorRepository {
  list(orgId: string): Promise<LinkageError[]>
  listByAccount(accountId: string): Promise<LinkageError[]>
  listUnresolved(orgId: string): Promise<LinkageError[]>
  get(id: string): Promise<LinkageError | null>
  create(input: CreateLinkageErrorInput): Promise<LinkageError>
  update(id: string, input: UpdateLinkageErrorInput): Promise<LinkageError>
  resolve(id: string): Promise<LinkageError>
}

export interface ContractFilters {
  status?: ContractStatus[]
  planId?: string
  billingMethod?: 'monthlypay' | 'invoice'
  salesOwnerUserId?: string
  opsOwnerUserId?: string
}

export interface ContractRepository {
  list(orgId: string): Promise<Contract[]>
  filter(orgId: string, filters: ContractFilters): Promise<Contract[]>
  listByAccount(accountId: string): Promise<Contract[]>
  get(id: string): Promise<Contract | null>
  create(input: CreateContractInput): Promise<Contract>
  update(id: string, input: UpdateContractInput): Promise<Contract>
  changeStatus(id: string, status: ContractStatus): Promise<Contract>
}

export interface InvoiceRepository {
  listByMonth(orgId: string, billingMonth: Date): Promise<Invoice[]>
  listByContract(contractId: string): Promise<Invoice[]>
  listByStatus(orgId: string, statuses: InvoiceStatus[]): Promise<Invoice[]>
  get(id: string): Promise<Invoice | null>
  create(input: CreateInvoiceInput): Promise<Invoice>
  update(id: string, input: UpdateInvoiceInput): Promise<Invoice>
  markSent(id: string): Promise<Invoice>
  markPaid(id: string): Promise<Invoice>
  markOverdue(id: string): Promise<Invoice>
}

export interface PaymentRepository {
  listByContract(contractId: string): Promise<Payment[]>
  listByInvoice(invoiceId: string): Promise<Payment[]>
  listByStatus(orgId: string, statuses: PaymentStatus[]): Promise<Payment[]>
  get(id: string): Promise<Payment | null>
  create(input: CreatePaymentInput): Promise<Payment>
  markSucceeded(id: string, paidAt: Date): Promise<Payment>
  markFailed(id: string, reason: string): Promise<Payment>
}

export interface RouteIntegrationRepository {
  getByContract(contractId: string): Promise<RouteIntegration | null>
  listByStatus(orgId: string, statuses: string[]): Promise<RouteIntegration[]>
  create(input: CreateRouteIntegrationInput): Promise<RouteIntegration>
  update(id: string, input: UpdateRouteIntegrationInput): Promise<RouteIntegration>
}

export interface NotificationRepository {
  listByContract(contractId: string): Promise<Notification[]>
  listByStatus(orgId: string, statuses: NotificationStatus[]): Promise<Notification[]>
  get(id: string): Promise<Notification | null>
  createDraft(input: CreateNotificationInput): Promise<Notification>
  updateDraft(id: string, subject: string, body: string): Promise<Notification>
  markSent(id: string): Promise<Notification>
  markFailed(id: string, errorMessage: string): Promise<Notification>
}

export interface OpsLogRepository {
  listByContract(contractId: string): Promise<OpsLog[]>
  append(input: CreateOpsLogInput): Promise<OpsLog>
}

export interface PlanRepository {
  list(orgId: string): Promise<Plan[]>
  listActive(orgId: string): Promise<Plan[]>
  get(id: string): Promise<Plan | null>
  create(input: CreatePlanInput): Promise<Plan>
}

export interface AgentRepository {
  list(orgId: string): Promise<Agent[]>
  listActive(orgId: string): Promise<Agent[]>
  get(id: string): Promise<Agent | null>
  create(input: CreateAgentInput): Promise<Agent>
  update(id: string, input: UpdateAgentInput): Promise<Agent>
  deactivate(id: string): Promise<Agent>
}

export interface AgentContractRepository {
  listByAgent(agentId: string): Promise<AgentContract[]>
  listByContract(contractId: string): Promise<AgentContract[]>
  create(input: CreateAgentContractInput): Promise<AgentContract>
  cancel(id: string): Promise<AgentContract>
}

export interface AgentPerformanceRepository {
  listByAgent(agentId: string): Promise<AgentMonthlyPerformance[]>
  getByMonth(agentId: string, billingMonth: Date): Promise<AgentMonthlyPerformance | null>
  upsert(agentId: string, billingMonth: Date, acquiredCount: number): Promise<AgentMonthlyPerformance>
}

export interface AgentEntitlementRepository {
  listByAgent(agentId: string): Promise<AgentMonthlyEntitlement[]>
  getByMonth(agentId: string, billingMonth: Date): Promise<AgentMonthlyEntitlement | null>
  calculate(agentId: string, billingMonth: Date): Promise<AgentMonthlyEntitlement>
}

export interface AgentSettlementRepository {
  listByAgent(agentId: string): Promise<AgentSettlement[]>
  listByStatus(orgId: string, statuses: AgentSettlementStatus[]): Promise<AgentSettlement[]>
  listByPayoutStatus(orgId: string, statuses: PayoutStatus[]): Promise<AgentSettlement[]>
  get(id: string): Promise<AgentSettlement | null>
  getByMonth(agentId: string, billingMonth: Date): Promise<AgentSettlement | null>
  create(input: CreateAgentSettlementInput): Promise<AgentSettlement>
  update(id: string, input: UpdateAgentSettlementInput): Promise<AgentSettlement>
  markInvoiced(id: string): Promise<AgentSettlement>
  markPaid(id: string): Promise<AgentSettlement>
  requestPayout(id: string, method: string, providerId: string): Promise<AgentSettlement>
  completePayout(id: string): Promise<AgentSettlement>
  failPayout(id: string, reason: string): Promise<AgentSettlement>
}

// Call Record Repository
export interface CallRecordFilters {
  status?: CallRecordStatus[]
  acquisitionCompany?: string
  meoProvider?: string
  hasReCallSchedule?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface CallRecordRepository {
  list(orgId: string): Promise<CallRecord[]>
  filter(orgId: string, filters: CallRecordFilters): Promise<CallRecord[]>
  search(orgId: string, query: string): Promise<CallRecord[]>
  get(id: string): Promise<CallRecord | null>
  getByIndex(orgId: string, index: number): Promise<CallRecord | null>
  count(orgId: string): Promise<number>
  create(input: CreateCallRecordInput): Promise<CallRecord>
  update(id: string, input: UpdateCallRecordInput): Promise<CallRecord>
  getNext(orgId: string, currentId: string): Promise<CallRecord | null>
  getPrevious(orgId: string, currentId: string): Promise<CallRecord | null>
  getFirst(orgId: string): Promise<CallRecord | null>
  getLast(orgId: string): Promise<CallRecord | null>
  getPosition(orgId: string, id: string): Promise<number>
}

export interface CallHistoryRepository {
  listByCallRecord(callRecordId: string): Promise<CallHistory[]>
  get(id: string): Promise<CallHistory | null>
  create(input: CreateCallHistoryInput): Promise<CallHistory>
  startCall(callRecordId: string, orgId: string, callerName: string, callerId?: string): Promise<CallHistory>
  endCall(id: string, result: CallResult, notes?: string): Promise<CallHistory>
}
