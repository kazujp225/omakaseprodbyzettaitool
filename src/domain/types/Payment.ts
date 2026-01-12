import { PaymentStatus } from '../status'

export interface Payment {
  id: string
  orgId: string
  contractId: string
  invoiceId: string | null
  provider: 'monthlypay' | 'bank_transfer' | 'manual'
  providerPaymentId: string | null
  amount: number
  currency: string
  status: PaymentStatus
  paidAt: Date | null
  failureReason: string | null
  createdAt: Date
}

export type CreatePaymentInput = Omit<Payment, 'id' | 'createdAt'>
