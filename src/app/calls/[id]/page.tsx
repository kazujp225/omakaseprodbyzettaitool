'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, Card, Input, Textarea, LoadingState, Modal, ModalFooter, SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { mockCallRecordRepository, mockCallHistoryRepository } from '@/repositories/mock'
import type { CallRecord, CallHistory, UpdateCallRecordInput } from '@/domain/types'
import {
  CALL_RECORD_STATUS_LABELS,
  CALL_RECORD_STATUS_VARIANT,
  CALL_RESULT_LABELS,
  CALL_RESULT_VARIANT,
  CALL_RESULT,
  PAYMENT_METHOD_TYPE_LABELS,
  type CallResult,
} from '@/domain/status'
import { formatDate, formatDateTime } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'
import { useToastHelpers } from '@/components/ui/Toast'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Phone,
  PhoneOff,
  User,
  Building2,
  CreditCard,
  Calendar,
  Clock,
  Copy,
  Check,
  FileText,
  Instagram,
  MessageCircle,
  Edit3,
  Save,
  X,
  MapPin,
  Mail,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Timer,
  History,
  Zap,
} from 'lucide-react'

// ============================================
// Reusable Components
// ============================================

// Quick Info Pill - For showing key info at a glance
function InfoPill({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs">{label}:</span>
      <span className="text-xs font-medium text-slate-800">{value || '—'}</span>
    </div>
  )
}

// Section Card with clean visual hierarchy
function Section({
  icon: Icon,
  title,
  badge,
  children,
  action,
}: {
  icon: React.ElementType
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge}
        </div>
        {action}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

// Data Field - Clean display with optional edit
function DataField({
  label,
  value,
  icon: Icon,
  editable = false,
  onEdit,
  size = 'default',
}: {
  label: string
  value: string | number | null | undefined
  icon?: React.ElementType
  editable?: boolean
  onEdit?: () => void
  size?: 'default' | 'large'
}) {
  const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '—'
  const isEmpty = displayValue === '—'

  return (
    <div
      className={`group relative ${editable ? 'cursor-pointer' : ''}`}
      onClick={editable ? onEdit : undefined}
    >
      <div className={`rounded-lg transition-all ${editable ? 'hover:bg-slate-50 p-2 -m-2' : ''}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {Icon && <Icon className="h-3 w-3 text-slate-400" />}
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
          {editable && (
            <Edit3 className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          )}
        </div>
        <p className={`${size === 'large' ? 'text-base font-bold' : 'text-sm'} ${isEmpty ? 'text-slate-300 italic' : 'text-slate-700'}`}>
          {displayValue}
        </p>
      </div>
    </div>
  )
}

// Editable Field with inline editing
function EditableField({
  label,
  value,
  fieldName,
  onChange,
  type = 'text',
  icon: Icon,
  size = 'default',
}: {
  label: string
  value: string | number | null | undefined
  fieldName: string
  onChange: (field: string, value: string) => void
  type?: 'text' | 'date' | 'number' | 'textarea'
  icon?: React.ElementType
  size?: 'default' | 'large'
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value ?? ''))

  const handleSave = () => {
    onChange(fieldName, editValue)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 ring-2 ring-slate-200">
        <div className="flex items-center gap-1.5 mb-2">
          {Icon && <Icon className="h-3 w-3 text-slate-500" />}
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        {type === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="text-sm min-h-[80px] mb-2 bg-white"
          />
        ) : (
          <Input
            type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
            className="h-9 text-sm mb-2 bg-white"
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">
            <Check className="h-3 w-3 mr-1" /> 保存
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">
            キャンセル
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DataField
      label={label}
      value={value}
      icon={Icon}
      editable
      onEdit={() => {
        setEditValue(String(value ?? ''))
        setEditing(true)
      }}
      size={size}
    />
  )
}

// Service Toggle - Clean toggles
function ServiceToggle({
  label,
  checked,
  fieldName,
  onChange,
}: {
  label: string
  checked: boolean
  fieldName: string
  onChange: (field: string, value: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(fieldName, String(!checked))}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all w-full border ${
        checked
          ? 'bg-slate-800 text-white border-slate-800'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className={`h-5 w-5 rounded flex items-center justify-center ${
        checked ? 'bg-white/20' : 'bg-slate-100 border border-slate-300'
      }`}>
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

// Copy Button with feedback
function CopyButton({ label, template }: { label: string; template: string }) {
  const [copied, setCopied] = useState(false)
  const toast = useToastHelpers()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template)
      setCopied(true)
      toast.success('コピーしました')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('コピーに失敗しました')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all border ${
        copied
          ? 'bg-slate-800 text-white border-slate-800'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
        copied ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'
      }`}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </div>
      <span className="text-xs font-medium truncate">{label}</span>
    </button>
  )
}

// Call History Item - Clean card style
function CallHistoryItem({ history, isLast }: { history: CallHistory; isLast?: boolean }) {
  const isSuccess = history.result === 'connected' || history.result === 'completed'
  const isWarning = history.result === 'no_answer' || history.result === 'busy'

  return (
    <div className="flex gap-3">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 ${
          isSuccess ? 'border-slate-800 bg-slate-800' :
          isWarning ? 'border-slate-400 bg-slate-400' :
          'border-slate-300 bg-white'
        }`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
        <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                isSuccess ? 'bg-slate-800 text-white' :
                isWarning ? 'bg-slate-200 text-slate-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {history.resultNote || CALL_RESULT_LABELS[history.result]}
              </span>
              <span className="text-xs text-slate-400">{history.callerEmployeeName}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {formatDate(history.callDate)} {history.callTime}
            </span>
          </div>
          {history.notes && (
            <p className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-100">
              {history.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Shortcut buttons configuration
const SHORTCUT_BUTTONS = [
  { label: 'キャッチ依頼', template: 'キャッチ依頼テンプレート...', icon: Zap },
  { label: '営業部メール', template: '営業部へメールテンプレート...', icon: Mail },
  { label: '通常時', template: '通常時テンプレート...', icon: FileText },
  { label: '3ヶ月無料', template: '3ヶ月無料テンプレート...', icon: Calendar },
  { label: 'Tappy連携', template: 'Tappy連携スプレッドシートURL...', icon: ExternalLink },
  { label: 'MEO連携', template: 'MEO連携スプレッドシートURL...', icon: ExternalLink },
]

// ============================================
// Main Page Component
// ============================================

export default function CallRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const toast = useToastHelpers()

  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<CallRecord | null>(null)
  const [histories, setHistories] = useState<CallHistory[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [activeCall, setActiveCall] = useState<CallHistory | null>(null)
  const [showEndCallModal, setShowEndCallModal] = useState(false)
  const [callResult, setCallResult] = useState<CallResult>('connected')
  const [callNotes, setCallNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (activeCall?.startedAt) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeCall.startedAt!).getTime()) / 1000)
        setCallDuration(elapsed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [activeCall])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [recordData, historyData, count, position] = await Promise.all([
        mockCallRecordRepository.get(resolvedParams.id),
        mockCallHistoryRepository.listByCallRecord(resolvedParams.id),
        mockCallRecordRepository.count(DEFAULT_ORG_ID),
        mockCallRecordRepository.getPosition(DEFAULT_ORG_ID, resolvedParams.id),
      ])
      setRecord(recordData)
      setHistories(historyData)
      setTotalCount(count)
      setCurrentPosition(position)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFieldChange = async (field: string, value: string) => {
    if (!record) return
    try {
      let parsedValue: unknown = value
      if (field.includes('Date') && value) {
        parsedValue = new Date(value)
      } else if (field === 'penaltyBilling' || field === 'hasExistingAccount' || field.startsWith('has')) {
        parsedValue = value === 'true'
      } else if (['planPrice', 'billingCycles', 'freeTrialMonths', 'remainingMonths', 'initialFee', 'initialFollowerCount', 'lineOfficialFriendsCount', 'chargebackAmount'].includes(field)) {
        parsedValue = value ? Number(value) : null
      }
      const input: UpdateCallRecordInput = { [field]: parsedValue }
      const updated = await mockCallRecordRepository.update(record.id, input)
      setRecord(updated)
      toast.success('保存しました')
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  const handleNavigate = async (direction: 'first' | 'prev' | 'next' | 'last') => {
    let newRecord: CallRecord | null = null
    switch (direction) {
      case 'first':
        newRecord = await mockCallRecordRepository.getFirst(DEFAULT_ORG_ID)
        break
      case 'prev':
        newRecord = await mockCallRecordRepository.getPrevious(DEFAULT_ORG_ID, resolvedParams.id)
        break
      case 'next':
        newRecord = await mockCallRecordRepository.getNext(DEFAULT_ORG_ID, resolvedParams.id)
        break
      case 'last':
        newRecord = await mockCallRecordRepository.getLast(DEFAULT_ORG_ID)
        break
    }
    if (newRecord) {
      router.push(`/calls/${newRecord.id}`)
    }
  }

  const handleStartCall = async () => {
    if (!record) return
    setProcessing(true)
    try {
      const call = await mockCallHistoryRepository.startCall(
        record.id,
        DEFAULT_ORG_ID,
        '現在のユーザー'
      )
      setActiveCall(call)
      setCallDuration(0)
      toast.success('コール開始しました')
      loadData()
    } catch {
      toast.error('コール開始に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const handleEndCall = async () => {
    if (!activeCall) return
    setProcessing(true)
    try {
      await mockCallHistoryRepository.endCall(activeCall.id, callResult, callNotes)
      setActiveCall(null)
      setShowEndCallModal(false)
      setCallResult('connected')
      setCallNotes('')
      setCallDuration(0)
      toast.success('コール終了しました')
      loadData()
    } catch {
      toast.error('コール終了に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">レコードが見つかりません</h2>
        <p className="text-slate-500 mb-6">このレコードは存在しないか、削除された可能性があります</p>
        <Button onClick={() => router.push('/calls')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
      </div>
    )
  }

  const hasReCallScheduled = record.reCallDate || record.reCallAssignee

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* ========== HEADER ========== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('first')}
                disabled={currentPosition <= 1}
                className="h-10 w-10 p-0"
              >
                <ChevronsLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('prev')}
                disabled={currentPosition <= 1}
                className="h-10 w-10 p-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="px-5 py-2 bg-white rounded-xl border border-slate-200 mx-2 min-w-[100px] text-center">
                <span className="font-bold text-primary text-xl">{currentPosition}</span>
                <span className="text-slate-400 mx-2">/</span>
                <span className="text-slate-500 text-lg">{totalCount}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('next')}
                disabled={currentPosition >= totalCount}
                className="h-10 w-10 p-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('last')}
                disabled={currentPosition >= totalCount}
                className="h-10 w-10 p-0"
              >
                <ChevronsRight className="h-5 w-5" />
              </Button>
            </div>
            <Badge variant={CALL_RECORD_STATUS_VARIANT[record.status]} className="text-sm px-4 py-1.5">
              {CALL_RECORD_STATUS_LABELS[record.status]}
            </Badge>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full mb-3">
                <span className="text-xs text-slate-500 font-medium">ID</span>
                <span className="text-sm font-bold text-slate-700 font-mono">{record.customerId}</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{record.storeName}</h1>
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-5 w-5 text-slate-400" />
                <span className="text-xl">{record.customerName}</span>
                {record.customerNameKana && (
                  <span className="text-sm text-slate-400">（{record.customerNameKana}）</span>
                )}
              </div>
            </div>

            {/* Phone Cards */}
            <div className="flex flex-col gap-2">
              <a
                href={`tel:${record.phone1}`}
                className="flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-5 py-4 rounded-xl transition-all group shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-medium mb-1">メイン</p>
                  <p className="text-xl font-bold font-mono text-slate-800 tracking-wide">{record.phone1}</p>
                </div>
                <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                  <ExternalLink className="h-5 w-5" />
                </div>
              </a>
              {record.phone2 && (
                <a
                  href={`tel:${record.phone2}`}
                  className="flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-5 py-3 rounded-xl transition-all group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">サブ</p>
                    <p className="text-lg font-mono text-slate-600">{record.phone2}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== CALL ACTION ========== */}
      <div className={`rounded-xl p-5 transition-all border ${
        activeCall
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${activeCall ? 'bg-red-100' : 'bg-slate-200'}`}>
              {activeCall ? (
                <PhoneOff className="h-6 w-6 text-red-600" />
              ) : (
                <Phone className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${activeCall ? 'text-red-700' : 'text-slate-700'}`}>
                {activeCall ? '通話中' : 'コールを開始'}
              </h2>
              {activeCall ? (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    <Timer className="h-3.5 w-3.5" />
                    <span className="font-mono font-bold">{formatDuration(callDuration)}</span>
                  </div>
                  <span className="text-slate-500">{record.phone1}</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">準備ができたらボタンを押してください</p>
              )}
            </div>
          </div>

          {activeCall ? (
            <Button
              size="lg"
              variant="danger"
              onClick={() => setShowEndCallModal(true)}
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              コール終了
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleStartCall}
              disabled={processing}
            >
              <Phone className="h-5 w-5 mr-2" />
              コール開始
            </Button>
          )}
        </div>
      </div>

      {/* Re-call Alert */}
      {hasReCallScheduled && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-700">再コール予定</h4>
            <p className="text-sm text-slate-500">
              {record.reCallDate && formatDate(record.reCallDate)} {record.reCallTime}
              {record.reCallAssignee && ` - 担当: ${record.reCallAssignee}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleFieldChange('reCallDate', '')}>
            クリア
          </Button>
        </div>
      )}

      {/* ========== MAIN CONTENT ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-2">
            <InfoPill icon={Building2} label="業種" value={record.industry} />
            <InfoPill icon={CreditCard} label="プラン" value={record.planName} />
            <InfoPill icon={Calendar} label="契約開始" value={record.contractStartDate ? formatDate(record.contractStartDate) : null} />
            {record.paymentMethod && (
              <InfoPill icon={CreditCard} label="支払" value={PAYMENT_METHOD_TYPE_LABELS[record.paymentMethod]} />
            )}
          </div>

          {/* Customer Details */}
          <Section icon={User} title="お客様情報" >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <EditableField label="店舗名" value={record.storeName} fieldName="storeName" onChange={handleFieldChange} icon={Building2} />
              <EditableField label="お客様名" value={record.customerName} fieldName="customerName" onChange={handleFieldChange} icon={User} />
              <EditableField label="フリガナ" value={record.customerNameKana} fieldName="customerNameKana" onChange={handleFieldChange} />
              <EditableField label="電話番号1" value={record.phone1} fieldName="phone1" onChange={handleFieldChange} icon={Phone} />
              <EditableField label="電話番号2" value={record.phone2} fieldName="phone2" onChange={handleFieldChange} icon={Phone} />
              <EditableField label="業種" value={record.industry} fieldName="industry" onChange={handleFieldChange} />
              <div className="col-span-2 md:col-span-3">
                <EditableField label="住所" value={record.address} fieldName="address" onChange={handleFieldChange} icon={MapPin} />
              </div>
            </div>
          </Section>

          {/* Contract Info */}
          <Section icon={FileText} title="契約情報" >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <ServiceToggle label="Tappy" checked={record.hasTappy} fieldName="hasTappy" onChange={handleFieldChange} />
              <ServiceToggle label="Tip U" checked={record.hasTipU} fieldName="hasTipU" onChange={handleFieldChange} />
              <ServiceToggle label="Omakaseダッシュ" checked={record.hasOmakaseDash} fieldName="hasOmakaseDash" onChange={handleFieldChange} />
              <ServiceToggle label="Omakaseプラス" checked={record.hasOmakasePlus} fieldName="hasOmakasePlus" onChange={handleFieldChange} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <EditableField label="プラン名" value={record.planName} fieldName="planName" onChange={handleFieldChange} />
              <EditableField label="月額料金" value={record.planPrice ? `¥${record.planPrice.toLocaleString()}` : ''} fieldName="planPrice" onChange={handleFieldChange} type="number" icon={CreditCard} />
              <DataField label="GMOステータス" value={record.gmoStatus} />
              <EditableField label="受注日" value={record.orderDate ? formatDate(record.orderDate) : ''} fieldName="orderDate" onChange={handleFieldChange} type="date" icon={Calendar} />
              <EditableField label="契約開始日" value={record.contractStartDate ? formatDate(record.contractStartDate) : ''} fieldName="contractStartDate" onChange={handleFieldChange} type="date" icon={Calendar} />
              <EditableField label="納品担当" value={record.deliveryManager} fieldName="deliveryManager" onChange={handleFieldChange} />
            </div>
          </Section>

          {/* Payment Info */}
          <Section icon={CreditCard} title="支払い情報" >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <DataField label="支払方法" value={record.paymentMethod ? PAYMENT_METHOD_TYPE_LABELS[record.paymentMethod] : null} icon={CreditCard} size="large" />
              </div>
              <EditableField label="請求回数" value={record.billingCycles} fieldName="billingCycles" onChange={handleFieldChange} type="number" />
              <EditableField label="無料期間" value={record.freeTrialMonths ? `${record.freeTrialMonths}ヶ月` : ''} fieldName="freeTrialMonths" onChange={handleFieldChange} type="number" />
              <EditableField label="初期費用" value={record.initialFee ? `¥${record.initialFee.toLocaleString()}` : ''} fieldName="initialFee" onChange={handleFieldChange} type="number" />
            </div>
          </Section>

          {/* Call History */}
          <Section
            icon={History}
            title="コール履歴"
                        badge={<Badge variant="secondary" className="ml-2">{histories.length}件</Badge>}
          >
            {/* Re-call Settings */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
              <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                再コール設定
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <EditableField label="担当者" value={record.reCallAssignee} fieldName="reCallAssignee" onChange={handleFieldChange} />
                <EditableField label="日付" value={record.reCallDate ? formatDate(record.reCallDate) : ''} fieldName="reCallDate" onChange={handleFieldChange} type="date" />
                <EditableField label="時間" value={record.reCallTime} fieldName="reCallTime" onChange={handleFieldChange} />
              </div>
            </div>

            {/* Timeline */}
            {histories.length > 0 ? (
              <div className="space-y-0">
                {histories.map((h, idx) => (
                  <CallHistoryItem key={h.id} history={h} isLast={idx === histories.length - 1} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Phone className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">コール履歴がありません</p>
                <p className="text-xs text-slate-400 mt-1">コールを開始すると記録されます</p>
              </div>
            )}
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Account Info - Branded Cards */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">アカウント情報</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* LINE Card */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#06C755]/5 border border-[#06C755]/20 group hover:bg-[#06C755]/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#06C755] flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">LINE公式アカウント</p>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {record.lineOfficialAccountName || <span className="text-slate-300">未設定</span>}
                  </p>
                </div>
                {record.lineOfficialAccountId && (
                  <span className="text-xs text-slate-400 font-mono">{record.lineOfficialAccountId}</span>
                )}
              </div>

              {/* Instagram Card */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-[#833AB4]/5 via-[#FD1D1D]/5 to-[#F77737]/5 border border-[#E1306C]/20 group hover:from-[#833AB4]/10 hover:via-[#FD1D1D]/10 hover:to-[#F77737]/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center flex-shrink-0">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">Instagram</p>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {record.instagramAccountName ? (
                      <span>@{record.instagramAccountName}</span>
                    ) : (
                      <span className="text-slate-300">未設定</span>
                    )}
                  </p>
                </div>
                {record.instagramUrl && (
                  <a
                    href={record.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                    title="Instagramを開く"
                  >
                    <ExternalLink className="h-4 w-4 text-[#E1306C]" />
                  </a>
                )}
              </div>

              {/* Email Card */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 group hover:bg-blue-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">メールアドレス</p>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {record.emailAddress || <span className="text-slate-300">未設定</span>}
                  </p>
                </div>
                {record.emailAddress && (
                  <a
                    href={`mailto:${record.emailAddress}`}
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                    title="メールを送信"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Notes - Better styling */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">メモ・備考</h3>
              </div>
            </div>
            <div className="p-4">
              <div
                className="min-h-[100px] p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => {/* TODO: Open edit modal */}}
              >
                {record.notes || <span className="text-slate-400 italic">メモを追加...</span>}
              </div>
            </div>
          </div>

          {/* Quick Templates - Better grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">クイックテンプレート</h3>
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {SHORTCUT_BUTTONS.map((btn) => (
                  <CopyButton key={btn.label} label={btn.label} template={btn.template} />
                ))}
              </div>
            </div>
          </div>

          {/* Record Meta - Cleaner */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>作成: {record.createdBy}</span>
              <span>更新: {record.modifiedBy}</span>
            </div>
            <span>{formatDateTime(record.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* ========== END CALL MODAL ========== */}
      <Modal
        isOpen={showEndCallModal}
        onClose={() => setShowEndCallModal(false)}
        title="コール終了"
      >
        <div className="space-y-5">
          {/* Call Duration */}
          <div className="bg-slate-100 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 mb-1">通話時間</p>
            <p className="text-3xl font-bold font-mono text-slate-800">{formatDuration(callDuration)}</p>
          </div>

          {/* Result Selection */}
          <div>
            <label className="text-sm font-bold mb-3 block">結果を選択</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CALL_RESULT).map(([, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCallResult(value)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    callResult === value
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {CALL_RESULT_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-bold mb-2 block">メモ（任意）</label>
            <Textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="通話内容をメモしてください..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEndCallModal(false)}>
            キャンセル
          </Button>
          <Button onClick={handleEndCall} disabled={processing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            終了する
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
