export const CONTRACT_STATUS = {
  LEAD: 'lead',
  CLOSED_WON: 'closed_won',
  ACTIVE: 'active',
  CANCEL_PENDING: 'cancel_pending',
  CANCELLED: 'cancelled',
} as const

export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS]

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  lead: '見込み',
  closed_won: '契約成立',
  active: '稼働中',
  cancel_pending: '解約予定',
  cancelled: '解約完了',
}

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
} as const

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: '下書き',
  sent: '送付済',
  paid: '入金済',
  overdue: '期限超過',
  void: '無効',
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CHARGEBACK: 'chargeback',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '処理中',
  succeeded: '成功',
  failed: '失敗',
  refunded: '返金済',
  chargeback: 'チャージバック',
}

export const ROUTE_STATUS = {
  PREPARING: 'preparing',
  RUNNING: 'running',
  PAUSED: 'paused',
  DELETING: 'deleting',
  DELETED: 'deleted',
  ERROR: 'error',
} as const

export type RouteStatus = (typeof ROUTE_STATUS)[keyof typeof ROUTE_STATUS]

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  preparing: '準備中',
  running: '稼働中',
  paused: '停止中',
  deleting: '削除中',
  deleted: '削除済',
  error: 'エラー',
}

export const NOTIFICATION_TYPE = {
  INVOICE_SEND: 'invoice_send',
  PAYMENT_FAILED: 'payment_failed',
  REMINDER_1: 'reminder_1',
  REMINDER_2: 'reminder_2',
  FINAL_NOTICE: 'final_notice',
  CANCEL_CONFIRM: 'cancel_confirm',
  CANCEL_FINAL_PAYMENT: 'cancel_final_payment',
  ROUTE_ERROR: 'route_error',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  invoice_send: '請求書送付',
  payment_failed: '決済失敗',
  reminder_1: '督促1回目',
  reminder_2: '督促2回目',
  final_notice: '最終通知',
  cancel_confirm: '解約確認',
  cancel_final_payment: '解約最終請求',
  route_error: 'ルートエラー',
}

export const NOTIFICATION_STATUS = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
} as const

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS]

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  draft: '下書き',
  queued: '送信待ち',
  sent: '送信済',
  failed: '失敗',
}

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

export const CONTRACT_STATUS_VARIANT: Record<ContractStatus, BadgeVariant> = {
  lead: 'neutral',
  closed_won: 'warning',
  active: 'success',
  cancel_pending: 'warning',
  cancelled: 'danger',
}

export const INVOICE_STATUS_VARIANT: Record<InvoiceStatus, BadgeVariant> = {
  draft: 'neutral',
  sent: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
}

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pending: 'neutral',
  succeeded: 'success',
  failed: 'danger',
  refunded: 'warning',
  chargeback: 'danger',
}

export const ROUTE_STATUS_VARIANT: Record<RouteStatus, BadgeVariant> = {
  preparing: 'neutral',
  running: 'success',
  paused: 'warning',
  deleting: 'warning',
  deleted: 'neutral',
  error: 'danger',
}

// Agent Contract Status
export const AGENT_CONTRACT_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXCLUDED: 'excluded',
} as const

export type AgentContractStatus = (typeof AGENT_CONTRACT_STATUS)[keyof typeof AGENT_CONTRACT_STATUS]

export const AGENT_CONTRACT_STATUS_LABELS: Record<AgentContractStatus, string> = {
  active: '有効',
  cancelled: '解約',
  excluded: '除外',
}

export const AGENT_CONTRACT_STATUS_VARIANT: Record<AgentContractStatus, BadgeVariant> = {
  active: 'success',
  cancelled: 'danger',
  excluded: 'neutral',
}

// Agent Settlement Status
export const AGENT_SETTLEMENT_STATUS = {
  DRAFT: 'draft',
  INVOICED: 'invoiced',
  PAID: 'paid',
} as const

export type AgentSettlementStatus = (typeof AGENT_SETTLEMENT_STATUS)[keyof typeof AGENT_SETTLEMENT_STATUS]

export const AGENT_SETTLEMENT_STATUS_LABELS: Record<AgentSettlementStatus, string> = {
  draft: '下書き',
  invoiced: '請求済',
  paid: '入金済',
}

export const AGENT_SETTLEMENT_STATUS_VARIANT: Record<AgentSettlementStatus, BadgeVariant> = {
  draft: 'neutral',
  invoiced: 'warning',
  paid: 'success',
}

// Payout Status (for GMO integration)
export const PAYOUT_STATUS = {
  UNPAID: 'unpaid',
  REQUESTED: 'requested',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const

export type PayoutStatus = (typeof PAYOUT_STATUS)[keyof typeof PAYOUT_STATUS]

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  unpaid: '未振込',
  requested: '依頼済',
  processing: '処理中',
  paid: '振込済',
  failed: '失敗',
  cancelled: '取消',
}

export const PAYOUT_STATUS_VARIANT: Record<PayoutStatus, BadgeVariant> = {
  unpaid: 'neutral',
  requested: 'warning',
  processing: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
}

// Payout Method
export const PAYOUT_METHOD = {
  GMO_BANK_TRANSFER: 'gmo_bank_transfer',
  GMO_PG_REMITTANCE: 'gmo_pg_remittance',
  MANUAL: 'manual',
} as const

export type PayoutMethod = (typeof PAYOUT_METHOD)[keyof typeof PAYOUT_METHOD]

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  gmo_bank_transfer: 'GMO銀行振込',
  gmo_pg_remittance: 'GMO-PG送金',
  manual: '手動振込',
}

// Integration Status (for platform linkage)
export const INTEGRATION_STATUS = {
  NOT_CONNECTED: 'not_connected',
  CONNECTED: 'connected',
  ERROR: 'error',
  PENDING: 'pending',
} as const

export type IntegrationStatus = (typeof INTEGRATION_STATUS)[keyof typeof INTEGRATION_STATUS]

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  not_connected: '未連携',
  connected: '連携中',
  error: 'エラー',
  pending: '処理中',
}

export const INTEGRATION_STATUS_VARIANT: Record<IntegrationStatus, BadgeVariant> = {
  not_connected: 'neutral',
  connected: 'success',
  error: 'danger',
  pending: 'warning',
}

// Influencer DB Plan
export const INFLUENCER_DB_PLAN = {
  FREE: 'free',
  UNLIMITED: 'unlimited',
} as const

export type InfluencerDbPlan = (typeof INFLUENCER_DB_PLAN)[keyof typeof INFLUENCER_DB_PLAN]

export const INFLUENCER_DB_PLAN_LABELS: Record<InfluencerDbPlan, string> = {
  free: '無料版',
  unlimited: '無制限プラン',
}

// Platform Type (for error management)
export const PLATFORM_TYPE = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  GBP: 'gbp',
  LINE: 'line',
} as const

export type PlatformType = (typeof PLATFORM_TYPE)[keyof typeof PLATFORM_TYPE]

export const PLATFORM_TYPE_LABELS: Record<PlatformType, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  gbp: 'Google Business Profile',
  line: 'LINE',
}

// Call Record Status
export const CALL_RECORD_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  CONTACTED: 'contacted',
  CALLBACK_SCHEDULED: 'callback_scheduled',
  COMPLETED: 'completed',
  NOT_INTERESTED: 'not_interested',
  INVALID: 'invalid',
} as const

export type CallRecordStatus = (typeof CALL_RECORD_STATUS)[keyof typeof CALL_RECORD_STATUS]

export const CALL_RECORD_STATUS_LABELS: Record<CallRecordStatus, string> = {
  new: '新規',
  in_progress: '進行中',
  contacted: '接触済',
  callback_scheduled: '再コール予定',
  completed: '完了',
  not_interested: '関心なし',
  invalid: '無効',
}

export const CALL_RECORD_STATUS_VARIANT: Record<CallRecordStatus, BadgeVariant> = {
  new: 'neutral',
  in_progress: 'warning',
  contacted: 'success',
  callback_scheduled: 'warning',
  completed: 'success',
  not_interested: 'neutral',
  invalid: 'danger',
}

// Call Result
export const CALL_RESULT = {
  CONNECTED: 'connected',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  VOICEMAIL: 'voicemail',
  WRONG_NUMBER: 'wrong_number',
  CALLBACK_REQUESTED: 'callback_requested',
  CONTRACT_CONFIRMED: 'contract_confirmed',
  PAYMENT_PENDING: 'payment_pending',
  DELIVERY_OK: 'delivery_ok',
  TIMING_NG: 'timing_ng',
  CANCELLED: 'cancelled',
  NOT_INTERESTED: 'not_interested',
  COMPLETED: 'completed',
} as const

export type CallResult = (typeof CALL_RESULT)[keyof typeof CALL_RESULT]

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  connected: '接続',
  no_answer: '不在',
  busy: '話中',
  voicemail: '留守電',
  wrong_number: '番号違い',
  callback_requested: '折返し依頼',
  contract_confirmed: '契約確認コール',
  payment_pending: '決済登録待ち',
  delivery_ok: '納品コールOK',
  timing_ng: 'タイミングNG',
  cancelled: 'キャンセル',
  not_interested: '興味なし',
  completed: '完了',
}

export const CALL_RESULT_VARIANT: Record<CallResult, BadgeVariant> = {
  connected: 'success',
  no_answer: 'neutral',
  busy: 'warning',
  voicemail: 'neutral',
  wrong_number: 'danger',
  callback_requested: 'warning',
  contract_confirmed: 'success',
  payment_pending: 'warning',
  delivery_ok: 'success',
  timing_ng: 'danger',
  cancelled: 'danger',
  not_interested: 'neutral',
  completed: 'success',
}

// Payment Method Type (for call records)
export const PAYMENT_METHOD_TYPE = {
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
  DIRECT_DEBIT: 'direct_debit',
  CONVENIENCE_STORE: 'convenience_store',
} as const

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPE)[keyof typeof PAYMENT_METHOD_TYPE]

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  credit_card: 'クレジットカード',
  bank_transfer: '銀行振込',
  direct_debit: '口座振替',
  convenience_store: 'コンビニ払い',
}
