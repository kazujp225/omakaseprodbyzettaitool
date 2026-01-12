import { IntegrationStatus, InfluencerDbPlan } from '../status'

export interface Account {
  id: string
  orgId: string
  // 基本情報
  accountName: string
  adminEmail: string
  password: string
  // 住所
  postalCode: string
  prefecture: string
  addressDetail: string
  // 電話番号（3分割）
  phoneArea: string
  phoneLocal: string
  phoneNumber: string
  // 担当
  accountManager: string | null
  // オプション
  lineOfficialNotification: boolean
  influencerDbPlan: InfluencerDbPlan
  memo: string | null
  // 連携状態
  instagramIntegration: IntegrationStatus
  gbpManagement: IntegrationStatus
  instagramGbpIntegration: IntegrationStatus
  // 集計（計算フィールド）
  totalContracts: number
  totalMonthlyFee: number
  // 代理店紐付け
  agencyId: string | null
  // タイムスタンプ
  createdAt: Date
  updatedAt: Date
}

export type CreateAccountInput = Omit<
  Account,
  'id' | 'createdAt' | 'updatedAt' | 'totalContracts' | 'totalMonthlyFee'
>
export type UpdateAccountInput = Partial<Omit<CreateAccountInput, 'orgId'>>

// 電話番号を結合するユーティリティ
export function formatPhoneNumber(account: Account): string {
  return `${account.phoneArea}-${account.phoneLocal}-${account.phoneNumber}`
}

// 住所を結合するユーティリティ
export function formatFullAddress(account: Account): string {
  return `〒${account.postalCode} ${account.prefecture}${account.addressDetail}`
}
