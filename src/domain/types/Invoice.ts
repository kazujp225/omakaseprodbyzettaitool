import { InvoiceStatus } from '../status'

export interface Invoice {
  id: string
  orgId: string
  contractId: string
  billingMonth: Date
  amount: number
  status: InvoiceStatus
  dueDate: Date
  pdfUrl: string | null
  sentAt: Date | null
  issueDate: Date
  adjustmentNote: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateInvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInvoiceInput = Partial<Omit<CreateInvoiceInput, 'orgId' | 'contractId'>>
