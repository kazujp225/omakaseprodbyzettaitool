import { CallRecordStatus, PaymentMethodType } from '../status'

export interface CallRecord {
  id: string
  orgId: string

  // 顧客情報 (Customer Info)
  customerId: string
  invoiceNumber: string | null
  storeName: string
  customerName: string
  customerNameKana: string | null
  phone1: string
  phone2: string | null
  postalCode: string | null
  industry: string | null
  address: string | null
  websiteUrl: string | null

  // 申込情報 (Application Info)
  hasTappy: boolean
  hasTipU: boolean
  hasOmakaseDash: boolean
  hasOmakasePlus: boolean
  planName: string | null
  planPrice: number | null
  planFlags: string | null
  gmoStatus: string | null
  creditCardStatus: string | null
  deliveryManager: string | null
  meoProvider: string | null
  orderDate: Date | null
  collectionCallCompletedDate: Date | null
  documentShippingDate: Date | null
  deliveryDate: Date | null
  contractStartDate: Date | null
  cancelDate: Date | null
  terminationDate: Date | null
  terminationReason: string | null

  // その他情報 - 支払情報 (Payment Info)
  paymentMethod: PaymentMethodType | null
  billingCycles: number | null
  smartBillingId: string | null
  cifId: string | null
  freeTrialMonths: number | null
  normalRule: string | null
  firstBillingMonth: string | null
  penaltyBilling: boolean
  remainingMonths: number | null
  initialFee: number | null

  // その他情報 - 金融機関情報 (Bank Info)
  bankName: string | null
  bankBranch: string | null
  bankAccountType: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null

  // その他情報 - CB情報 (Chargeback Info)
  chargebackDate: Date | null
  chargebackAmount: number | null
  chargebackReason: string | null

  // アカウント情報 (Account Info)
  hasExistingAccount: boolean
  tdmNumber: string | null
  lineOfficialAccountName: string | null
  lineOfficialAccountId: string | null
  instagramAccountName: string | null
  instagramAccountId: string | null
  instagramPassword: string | null
  emailAddress: string | null
  initialFollowerCount: number | null
  lineOfficialFriendsCount: number | null

  // 獲得者情報 (Acquirer Info)
  acquisitionCompany: string | null
  acquisitionList: string | null
  tossEmployeeId: string | null
  tossEmployeeName: string | null
  acquirerEmployeeId: string | null
  acquirerEmployeeName: string | null
  acquirerBranch: string | null
  acquirerDepartment: string | null
  stowIncentiveTargetId: string | null
  stowIncentiveTargetName: string | null

  // 備考 (Notes)
  notes: string | null
  instagramUrl: string | null
  otherLinks: string | null

  // 再コール設定
  reCallAssignee: string | null
  reCallDate: Date | null
  reCallTime: string | null

  // システムフィールド
  status: CallRecordStatus
  createdBy: string
  modifiedBy: string
  createdAt: Date
  updatedAt: Date
}

export type CreateCallRecordInput = Omit<CallRecord, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateCallRecordInput = Partial<Omit<CreateCallRecordInput, 'orgId' | 'customerId'>>
