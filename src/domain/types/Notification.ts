import { NotificationStatus, NotificationType } from '../status'

export interface Notification {
  id: string
  orgId: string
  contractId: string
  invoiceId: string | null
  paymentId: string | null
  type: NotificationType
  channel: 'email'
  toEmail: string
  subject: string
  body: string
  status: NotificationStatus
  errorMessage: string | null
  sentAt: Date | null
  createdBy: string
  createdAt: Date
}

export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt'>
