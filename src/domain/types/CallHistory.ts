import { CallResult } from '../status'

export interface CallHistory {
  id: string
  callRecordId: string
  orgId: string

  callDate: Date
  callTime: string
  callerEmployeeId: string | null
  callerEmployeeName: string
  result: CallResult
  resultNote: string | null

  startedAt: Date | null
  endedAt: Date | null
  duration: number | null

  notes: string | null

  createdAt: Date
}

export type CreateCallHistoryInput = Omit<CallHistory, 'id' | 'createdAt'>
