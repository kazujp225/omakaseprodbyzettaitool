export interface Agency {
  id: string
  orgId: string
  // 基本情報
  agencyName: string
  email: string
  password: string
  // 住所
  postalCode: string
  prefecture: string
  addressDetail: string
  // 電話番号（3分割）
  phoneArea: string
  phoneLocal: string
  phoneNumber: string
  // 仕切価格（卸価格）
  instagramWholesalePrice: number
  googleManagementWholesalePrice: number
  instagramGoogleSetWholesalePrice: number
  // 担当
  manager: string | null
  // アラート通知メールアドレス（カンマ区切りで複数設定可能）
  instagramAlertEmails: string | null
  influencerAlertEmails: string | null
  recruitAlertEmails: string | null
  // メモ
  memo: string | null
  // 実績
  acquiredLocationCount: number
  // タイムスタンプ
  createdAt: Date
  updatedAt: Date
}

export type CreateAgencyInput = Omit<Agency, 'id' | 'createdAt' | 'updatedAt' | 'acquiredLocationCount'>
export type UpdateAgencyInput = Partial<Omit<CreateAgencyInput, 'orgId'>>

// 電話番号を結合するユーティリティ
export function formatAgencyPhoneNumber(agency: Agency): string {
  return `${agency.phoneArea}-${agency.phoneLocal}-${agency.phoneNumber}`
}

// アラートメールをリストに変換するユーティリティ
export function parseAlertEmails(emailsString: string | null): string[] {
  if (!emailsString) return []
  return emailsString.split(',').map(email => email.trim()).filter(email => email.length > 0)
}
