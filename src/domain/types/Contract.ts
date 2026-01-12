import { ContractStatus } from '../status'

export interface Contract {
  id: string
  orgId: string
  accountId: string
  planId: string
  status: ContractStatus
  startDate: Date
  endDate: Date | null
  billingMethod: 'monthlypay' | 'invoice'
  contractMonthlyPriceSnapshot: number
  salesOwnerUserId: string | null
  opsOwnerUserId: string | null
  cancellationRequestedAt: Date | null
  cancellationEffectiveDate: Date | null
  cancellationReason: string | null
  paymentDay: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateContractInput = Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateContractInput = Partial<Omit<CreateContractInput, 'orgId' | 'accountId'>>
