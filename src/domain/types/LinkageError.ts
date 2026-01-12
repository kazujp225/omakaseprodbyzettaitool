export interface LinkageError {
  id: string
  orgId: string
  // アカウント紐付け
  accountId: string
  accountName: string
  adminEmail: string
  // ロケーション情報
  locationId: string
  locationName: string
  // 各プラットフォームのエラー内容
  facebookError: string | null
  instagramError: string | null
  gbpError: string | null
  lineError: string | null
  // タイムスタンプ
  detectedAt: Date
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateLinkageErrorInput = Omit<LinkageError, 'id' | 'createdAt' | 'updatedAt' | 'resolvedAt'>
export type UpdateLinkageErrorInput = Partial<Omit<CreateLinkageErrorInput, 'orgId' | 'accountId'>>

// エラーが存在するプラットフォームを取得するユーティリティ
export function getPlatformsWithErrors(error: LinkageError): string[] {
  const platforms: string[] = []
  if (error.facebookError) platforms.push('Facebook')
  if (error.instagramError) platforms.push('Instagram')
  if (error.gbpError) platforms.push('GBP')
  if (error.lineError) platforms.push('LINE')
  return platforms
}

// エラーが解決済みかどうかを判定
export function isErrorResolved(error: LinkageError): boolean {
  return error.resolvedAt !== null
}

// 有効なエラーが存在するかどうかを判定
export function hasActiveErrors(error: LinkageError): boolean {
  return (
    !isErrorResolved(error) &&
    (!!error.facebookError || !!error.instagramError || !!error.gbpError || !!error.lineError)
  )
}
