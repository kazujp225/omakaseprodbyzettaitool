import { RouteStatus, IntegrationStatus } from '../status'

export interface RouteIntegration {
  id: string
  orgId: string
  contractId: string
  accountId: string
  // ルート連携の外部ID
  routeCustomerId: string | null
  routeStoreId: string | null
  // ロケーション情報
  locationId: string | null
  locationName: string | null
  // ルート稼働状態
  status: RouteStatus
  runningStartedAt: Date | null
  stoppedAt: Date | null
  lastError: string | null
  // 各プラットフォームの連携状態
  facebookStatus: IntegrationStatus
  instagramStatus: IntegrationStatus
  gbpStatus: IntegrationStatus
  lineStatus: IntegrationStatus
  // 各プラットフォームの最終エラー
  facebookError: string | null
  instagramError: string | null
  gbpError: string | null
  lineError: string | null
  // GBPグループID
  gbpGroupId: string | null
  // タイムスタンプ
  createdAt: Date
  updatedAt: Date
}

export type CreateRouteIntegrationInput = Omit<RouteIntegration, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateRouteIntegrationInput = Partial<Omit<CreateRouteIntegrationInput, 'orgId' | 'contractId' | 'accountId'>>

// 連携エラーがあるかどうかを判定するユーティリティ
export function hasIntegrationErrors(integration: RouteIntegration): boolean {
  return (
    integration.facebookStatus === 'error' ||
    integration.instagramStatus === 'error' ||
    integration.gbpStatus === 'error' ||
    integration.lineStatus === 'error'
  )
}

// 全てのプラットフォームが連携済みかどうかを判定
export function isFullyConnected(integration: RouteIntegration): boolean {
  return (
    integration.facebookStatus === 'connected' &&
    integration.instagramStatus === 'connected' &&
    integration.gbpStatus === 'connected' &&
    integration.lineStatus === 'connected'
  )
}
