export type CsvExportType =
  | 'basic_info'
  | 'instagram_info'
  | 'yplace_info'
  | 'meo_ranking'
  | 'sms_count'

export type CsvExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface CsvExport {
  id: string
  orgId: string
  exportType: CsvExportType
  status: CsvExportStatus
  startDate: Date
  endDate: Date
  fileUrl: string | null
  errorMessage: string | null
  createdAt: Date
  completedAt: Date | null
}

export type CreateCsvExportInput = Omit<CsvExport, 'id' | 'createdAt' | 'completedAt' | 'fileUrl' | 'errorMessage'>

export const CSV_EXPORT_TYPE_LABELS: Record<CsvExportType, string> = {
  basic_info: '基本情報CSV',
  instagram_info: 'IG情報CSV',
  yplace_info: 'YPlace情報CSV',
  meo_ranking: 'MEO順位計測CSV',
  sms_count: '送信数CSV',
}

export const CSV_EXPORT_STATUS_LABELS: Record<CsvExportStatus, string> = {
  pending: '待機中',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
}
