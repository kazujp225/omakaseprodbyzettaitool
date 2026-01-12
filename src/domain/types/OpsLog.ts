export type OpsLogAction =
  | 'status_changed'
  | 'note_added'
  | 'route_manual_updated'
  | 'route_created'
  | 'route_pause'
  | 'route_resume'
  | 'route_delete'
  | 'payment_manual_recorded'
  | 'invoice_sent'
  | 'notification_sent'
  | 'cancellation_requested'
  | 'cancellation_confirmed'

export interface OpsLog {
  id: string
  orgId: string
  contractId: string
  actorUserId: string
  action: OpsLogAction
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  createdAt: Date
}

export type CreateOpsLogInput = Omit<OpsLog, 'id' | 'createdAt'>
