'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Card, CardTitle, Badge, Button, Modal, ModalFooter, Textarea, LoadingState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToastHelpers, useConfirm } from '@/components/ui'
import {
  mockContractRepository,
  mockAccountRepository,
  mockPlanRepository,
  mockInvoiceRepository,
  mockPaymentRepository,
  mockRouteIntegrationRepository,
  mockNotificationRepository,
  mockOpsLogRepository,
} from '@/repositories/mock'
import type { Contract, Account, Plan, Invoice, Payment, RouteIntegration, Notification, OpsLog } from '@/domain/types'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANT,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_VARIANT,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANT,
  ROUTE_STATUS_LABELS,
  ROUTE_STATUS_VARIANT,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  ContractStatus,
} from '@/domain/status'
import { formatCurrency, formatDate, formatMonth, getOverdueDays } from '@/lib/utils'
import { DEFAULT_USER_ID } from '@/seed/data'

interface ContractDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { id } = use(params)
  const toast = useToastHelpers()
  const { confirm, Dialog: ConfirmDialogElement } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<Contract | null>(null)
  const [store, setStore] = useState<Account | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [route, setRoute] = useState<RouteIntegration | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [opsLogs, setOpsLogs] = useState<OpsLog[]>([])

  const [statusChangeModal, setStatusChangeModal] = useState(false)
  const [targetStatus, setTargetStatus] = useState<ContractStatus | null>(null)
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const [notificationModal, setNotificationModal] = useState(false)
  const [draftNotification, setDraftNotification] = useState<Notification | null>(null)
  const [notificationBody, setNotificationBody] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const contractData = await mockContractRepository.get(id)
      if (!contractData) {
        setLoading(false)
        return
      }
      setContract(contractData)

      const [storeData, planData, invoicesData, paymentsData, routeData, notificationsData, logsData] =
        await Promise.all([
          mockAccountRepository.get(contractData.accountId),
          mockPlanRepository.get(contractData.planId),
          mockInvoiceRepository.listByContract(id),
          mockPaymentRepository.listByContract(id),
          mockRouteIntegrationRepository.getByContract(id),
          mockNotificationRepository.listByContract(id),
          mockOpsLogRepository.listByContract(id),
        ])

      setStore(storeData)
      setPlan(planData)
      setInvoices(invoicesData.sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime()))
      setPayments(paymentsData)
      setRoute(routeData)
      setNotifications(notificationsData)
      setOpsLogs(logsData)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = async () => {
    if (!targetStatus || !statusChangeReason.trim() || !contract) return

    // 解約完了への変更は追加の確認ダイアログを表示
    if (targetStatus === 'cancelled') {
      const confirmed = await confirm({
        title: '本当に解約を確定しますか？',
        message: 'この操作は取り消せません。契約を解約完了にすると、元のステータスに戻すことはできません。',
        confirmText: '解約を確定',
        cancelText: 'キャンセル',
        type: 'danger',
        confirmInput: '解約',
      })
      if (!confirmed) return
    }

    setProcessing(true)
    try {
      await mockContractRepository.changeStatus(contract.id, targetStatus)
      await mockOpsLogRepository.append({
        orgId: contract.orgId,
        contractId: contract.id,
        actorUserId: DEFAULT_USER_ID,
        action: 'status_changed',
        before: { status: contract.status },
        after: { status: targetStatus },
        reason: statusChangeReason,
      })
      setStatusChangeModal(false)
      setStatusChangeReason('')
      setTargetStatus(null)
      toast.success('ステータスを変更しました', `${CONTRACT_STATUS_LABELS[targetStatus]} に変更しました`)
      await loadData()
    } catch {
      toast.error('エラーが発生しました', 'ステータスの変更に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const generateNotificationDraft = async (type: string) => {
    if (!contract || !store) return
    const latestOverdueInvoice = invoices.find((i) => i.status === 'overdue')
    const subject = `【ご案内】${store.accountName}様｜お支払いのご確認`
    const body = `${store.accountName}様

いつもお世話になっております。

${
  latestOverdueInvoice
    ? `${formatMonth(latestOverdueInvoice.billingMonth)}分のお支払いについて、期限（${formatDate(latestOverdueInvoice.dueDate)}）を過ぎている可能性があるためご連絡いたしました。

■ご請求情報
・対象月：${formatMonth(latestOverdueInvoice.billingMonth)}
・金額：${formatCurrency(latestOverdueInvoice.amount)}
・お支払期限：${formatDate(latestOverdueInvoice.dueDate)}
・延滞日数：${getOverdueDays(latestOverdueInvoice.dueDate)}日`
    : 'お支払いについてご確認をお願いいたします。'
}

お手続きがお済みでない場合は、ご対応をお願いいたします。
行き違いでお支払い済みの場合は、本メールにご返信いただけますと確認いたします。

――――――――――
お任せAI運用チーム
メール：support@example.com
（受付時間：平日9:00〜18:00）
――――――――――`

    const draft = await mockNotificationRepository.createDraft({
      orgId: contract.orgId,
      contractId: contract.id,
      invoiceId: latestOverdueInvoice?.id || null,
      paymentId: null,
      type: type as Notification['type'],
      channel: 'email',
      toEmail: store.adminEmail || '',
      subject,
      body,
      status: 'draft',
      errorMessage: null,
      sentAt: null,
      createdBy: DEFAULT_USER_ID,
    })

    setDraftNotification(draft)
    setNotificationBody(body)
    setNotificationModal(true)
    await loadData()
  }

  const sendNotification = async () => {
    if (!draftNotification) return
    setProcessing(true)
    try {
      await mockNotificationRepository.updateDraft(draftNotification.id, draftNotification.subject, notificationBody)
      await mockNotificationRepository.markSent(draftNotification.id)
      await mockOpsLogRepository.append({
        orgId: contract!.orgId,
        contractId: contract!.id,
        actorUserId: DEFAULT_USER_ID,
        action: 'notification_sent',
        before: null,
        after: { notificationId: draftNotification.id, type: draftNotification.type },
        reason: '督促メール送信',
      })
      setNotificationModal(false)
      setDraftNotification(null)
      setNotificationBody('')
      toast.success('通知を送信しました', '督促メールを送信しました（デモ）')
      await loadData()
    } catch {
      toast.error('エラーが発生しました', '通知の送信に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const recordPayment = async (invoiceId: string) => {
    if (!contract) return
    setProcessing(true)
    try {
      const invoice = invoices.find((i) => i.id === invoiceId)
      if (!invoice) return

      await mockPaymentRepository.create({
        orgId: contract.orgId,
        contractId: contract.id,
        invoiceId,
        provider: 'manual',
        providerPaymentId: null,
        amount: invoice.amount,
        currency: 'JPY',
        status: 'succeeded',
        paidAt: new Date(),
        failureReason: null,
      })

      await mockInvoiceRepository.markPaid(invoiceId)

      await mockOpsLogRepository.append({
        orgId: contract.orgId,
        contractId: contract.id,
        actorUserId: DEFAULT_USER_ID,
        action: 'payment_manual_recorded',
        before: null,
        after: { invoiceId, amount: invoice.amount },
        reason: '手動入金記録',
      })

      toast.success('入金を記録しました', `${formatCurrency(invoice.amount)} の入金を記録しました`)
      await loadData()
    } catch {
      toast.error('エラーが発生しました', '入金の記録に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const sendInvoice = async (invoiceId: string) => {
    if (!contract) return
    setProcessing(true)
    try {
      const invoice = invoices.find((i) => i.id === invoiceId)
      if (!invoice) return

      await mockInvoiceRepository.markSent(invoiceId)

      await mockOpsLogRepository.append({
        orgId: contract.orgId,
        contractId: contract.id,
        actorUserId: DEFAULT_USER_ID,
        action: 'invoice_sent',
        before: { status: 'draft' },
        after: { status: 'sent', invoiceId },
        reason: '請求書送付',
      })

      toast.success('請求書を送付しました', '請求書の送付が完了しました')
      await loadData()
    } catch {
      toast.error('エラーが発生しました', '請求書の送付に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const handleRouteAction = async (action: 'pause' | 'resume' | 'delete') => {
    if (!contract || !route) return

    let newStatus: 'paused' | 'running' | 'deleting' | 'deleted'
    let actionLabel: string
    let successMessage: string

    switch (action) {
      case 'pause':
        newStatus = 'paused'
        actionLabel = 'ルート停止'
        successMessage = 'ルートを停止しました'
        break
      case 'resume':
        newStatus = 'running'
        actionLabel = 'ルート再開'
        successMessage = 'ルートを再開しました'
        break
      case 'delete':
        newStatus = 'deleted'
        actionLabel = 'ルート削除'
        successMessage = 'ルートを削除しました'
        break
    }

    // 削除操作は確認ダイアログを表示
    if (action === 'delete') {
      const confirmed = await confirm({
        title: 'ルートを削除しますか？',
        message: 'この操作は取り消せません。ルートを削除すると、MEO稼働データが完全に削除されます。',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger',
      })
      if (!confirmed) return
    }

    setProcessing(true)
    try {
      await mockRouteIntegrationRepository.update(route.id, {
        status: newStatus,
        stoppedAt: action === 'pause' || action === 'delete' ? new Date() : undefined,
        runningStartedAt: action === 'resume' ? new Date() : undefined,
        lastError: action === 'resume' ? null : undefined,
      })

      await mockOpsLogRepository.append({
        orgId: contract.orgId,
        contractId: contract.id,
        actorUserId: DEFAULT_USER_ID,
        action: `route_${action}`,
        before: { status: route.status },
        after: { status: newStatus },
        reason: actionLabel,
      })

      toast.success(successMessage, `${actionLabel}が完了しました`)
      await loadData()
    } catch {
      toast.error('エラーが発生しました', `${actionLabel}に失敗しました`)
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateRoute = async () => {
    if (!contract) return
    setProcessing(true)
    try {
      await mockRouteIntegrationRepository.create({
        orgId: contract.orgId,
        contractId: contract.id,
        accountId: contract.accountId,
        routeCustomerId: `customer_${Date.now()}`,
        routeStoreId: `store_${Date.now()}`,
        locationId: null,
        locationName: null,
        status: 'preparing',
        runningStartedAt: null,
        stoppedAt: null,
        lastError: null,
        facebookStatus: 'pending',
        instagramStatus: 'pending',
        gbpStatus: 'pending',
        lineStatus: 'pending',
        facebookError: null,
        instagramError: null,
        gbpError: null,
        lineError: null,
        gbpGroupId: null,
      })

      await mockOpsLogRepository.append({
        orgId: contract.orgId,
        contractId: contract.id,
        actorUserId: DEFAULT_USER_ID,
        action: 'route_created',
        before: null,
        after: { status: 'preparing' },
        reason: 'ルート連携を設定',
      })

      toast.success('ルート連携を設定しました', 'ルート準備中です。稼働開始ボタンで稼働を開始できます。')
      await loadData()
    } catch {
      toast.error('エラーが発生しました', 'ルート連携の設定に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!contract || !store || !plan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">契約が見つかりません</h2>
        <Link href="/contracts" className="mt-4 text-primary hover:text-primary/80">
          契約一覧に戻る
        </Link>
      </div>
    )
  }

  const statusSteps: ContractStatus[] = ['lead', 'closed_won', 'active', 'cancel_pending', 'cancelled']
  const currentStepIndex = statusSteps.indexOf(contract.status)

  // 初回入金があるかチェック
  const hasInitialPayment = payments.some((p) => p.status === 'succeeded')

  // 未払い請求があるかチェック
  const hasUnpaidInvoice = invoices.some((inv) => ['draft', 'sent', 'overdue'].includes(inv.status))

  // ルートが停止/削除済みかチェック
  const isRouteStopped = !route || ['paused', 'deleted'].includes(route.status)

  const getTransitionBlocker = (target: ContractStatus): string | null => {
    if (contract.status === 'closed_won' && target === 'active') {
      if (!hasInitialPayment) {
        return '初回入金が確認されていません'
      }
    }
    if (contract.status === 'cancel_pending' && target === 'cancelled') {
      const blockers: string[] = []
      if (hasUnpaidInvoice) {
        blockers.push('未払いの請求があります')
      }
      if (!isRouteStopped) {
        blockers.push('ルートが停止/削除されていません')
      }
      if (blockers.length > 0) {
        return blockers.join('、')
      }
    }
    return null
  }

  const canTransitionTo = (target: ContractStatus): boolean => {
    const allowed: Record<ContractStatus, ContractStatus[]> = {
      lead: ['closed_won'],
      closed_won: ['active'],
      active: ['cancel_pending'],
      cancel_pending: ['active', 'cancelled'],
      cancelled: [],
    }
    if (!allowed[contract.status]?.includes(target)) return false

    // 追加条件チェック
    const blocker = getTransitionBlocker(target)
    return blocker === null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/contracts" className="hover:text-foreground">
              契約一覧
            </Link>
            <span>/</span>
            <span>{store.accountName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{store.accountName}</h1>
          <p className="text-sm text-muted-foreground">
            {plan.name} - {formatCurrency(contract.contractMonthlyPriceSnapshot)}/月
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">編集</Button>
        </div>
      </div>

      <Card>
        <CardTitle>契約ステータス</CardTitle>
        <div className="mt-6">
          {/* ステータスバー - モダンなステップインジケーター */}
          <div className="relative">
            {/* 進捗ライン（背景） */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
            {/* 進捗ライン（完了分） */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
            />

            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const isPast = index < currentStepIndex
                const isCurrent = step === contract.status
                const isFuture = index > currentStepIndex
                const canTransition = canTransitionTo(step)
                const blocker = getTransitionBlocker(step)
                const isCancelled = step === 'cancelled'

                return (
                  <div key={step} className="flex flex-col items-center" style={{ width: '20%' }}>
                    {/* ステップサークル */}
                    <button
                      onClick={() => {
                        if (canTransition) {
                          setTargetStatus(step)
                          setStatusChangeModal(true)
                        }
                      }}
                      disabled={!canTransition}
                      className={`
                        relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200 border-2
                        ${isPast ? 'bg-primary border-primary' : ''}
                        ${isCurrent && !isCancelled ? 'bg-primary border-primary ring-4 ring-primary/20' : ''}
                        ${isCurrent && isCancelled ? 'bg-destructive border-destructive ring-4 ring-destructive/20' : ''}
                        ${isFuture && !isCancelled ? 'bg-card border-border' : ''}
                        ${isFuture && isCancelled ? 'bg-card border-destructive/30' : ''}
                        ${canTransition ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'}
                        ${canTransition && !isCancelled ? 'hover:bg-primary/90 hover:border-primary' : ''}
                        ${canTransition && isCancelled ? 'hover:bg-destructive/90 hover:border-destructive' : ''}
                      `}
                      title={blocker || undefined}
                    >
                      {isPast ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isCurrent ? (
                        <div className={`w-3 h-3 rounded-full ${isCancelled ? 'bg-white' : 'bg-white'}`} />
                      ) : (
                        <span className={`text-sm font-medium ${isCancelled ? 'text-destructive/60' : 'text-muted-foreground'}`}>
                          {index + 1}
                        </span>
                      )}
                    </button>

                    {/* ラベル */}
                    <div className="mt-3 text-center">
                      <span className={`
                        text-sm font-medium block
                        ${isPast ? 'text-foreground' : ''}
                        ${isCurrent && !isCancelled ? 'text-primary' : ''}
                        ${isCurrent && isCancelled ? 'text-destructive' : ''}
                        ${isFuture && !isCancelled ? 'text-muted-foreground' : ''}
                        ${isFuture && isCancelled ? 'text-destructive/50' : ''}
                      `}>
                        {CONTRACT_STATUS_LABELS[step]}
                      </span>
                      {canTransition && (
                        <span className="text-sm text-primary mt-0.5 block">
                          クリックで変更
                        </span>
                      )}
                      {blocker && !canTransition && index > currentStepIndex && (
                        <span className="text-sm text-amber-500 mt-0.5 block">
                          条件未達成
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {contract.status === 'cancelled' && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-destructive">この契約は解約済みです。このステータスは不可逆です（元に戻せません）</p>
            </div>
          )}
          {contract.status === 'closed_won' && !hasInitialPayment && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">「稼働中」への遷移条件</p>
                <p className="text-sm text-amber-700 mt-1">初回入金を記録してください。下の請求/入金タイムラインから入金を記録できます。</p>
              </div>
            </div>
          )}
          {contract.status === 'cancel_pending' && (hasUnpaidInvoice || !isRouteStopped) && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">「解約完了」への遷移条件</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    {hasUnpaidInvoice ? (
                      <>
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-amber-700">未払いの請求を入金済みにする</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700">全ての請求が入金済み</span>
                      </>
                    )}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    {!isRouteStopped ? (
                      <>
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-amber-700">ルートを停止または削除する</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700">ルートが停止/削除済み</span>
                      </>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardTitle>契約情報</CardTitle>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">プラン</dt>
              <dd className="text-sm font-medium text-foreground">{plan.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">月額</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatCurrency(contract.contractMonthlyPriceSnapshot)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">支払方法</dt>
              <dd className="text-sm font-medium text-foreground">
                {contract.billingMethod === 'monthlypay' ? '月額ペイ' : '請求書払い'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">課金日</dt>
              <dd className="text-sm font-medium text-foreground">毎月{contract.paymentDay}日</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">開始日</dt>
              <dd className="text-sm font-medium text-foreground">{formatDate(contract.startDate)}</dd>
            </div>
            {contract.cancellationRequestedAt && (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">解約申請日</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formatDate(contract.cancellationRequestedAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">解約予定日</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {contract.cancellationEffectiveDate
                      ? formatDate(contract.cancellationEffectiveDate)
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">解約理由</dt>
                  <dd className="mt-1 text-sm text-foreground">{contract.cancellationReason || '-'}</dd>
                </div>
              </>
            )}
            {contract.notes && (
              <div>
                <dt className="text-sm text-muted-foreground">備考</dt>
                <dd className="mt-1 text-sm text-foreground">{contract.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle>ルート稼働状態</CardTitle>
          {route ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ステータス</span>
                <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
                  {ROUTE_STATUS_LABELS[route.status]}
                </Badge>
              </div>
              {route.runningStartedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">稼働開始</span>
                  <span className="text-sm font-medium">{formatDate(route.runningStartedAt)}</span>
                </div>
              )}
              {route.stoppedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">停止日</span>
                  <span className="text-sm font-medium">{formatDate(route.stoppedAt)}</span>
                </div>
              )}
              {route.lastError && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{route.lastError}</p>
                </div>
              )}
              <div className="flex gap-2">
                {route.status === 'running' && (
                  <Button variant="secondary" size="sm" onClick={() => handleRouteAction('pause')} loading={processing}>
                    停止
                  </Button>
                )}
                {route.status === 'paused' && (
                  <>
                    <Button variant="primary" size="sm" onClick={() => handleRouteAction('resume')} loading={processing}>
                      再開
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRouteAction('delete')} loading={processing}>
                      削除
                    </Button>
                  </>
                )}
                {route.status === 'preparing' && (
                  <Button variant="primary" size="sm" onClick={() => handleRouteAction('resume')} loading={processing}>
                    稼働開始
                  </Button>
                )}
                {route.status === 'error' && (
                  <Button variant="danger" size="sm" onClick={() => handleRouteAction('resume')} loading={processing}>
                    再同期
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-center py-6 text-muted-foreground">
              <p>ルート連携情報がありません</p>
              <Button variant="primary" size="sm" className="mt-4" onClick={handleCreateRoute} loading={processing}>
                ルート連携を設定
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>通知・督促</CardTitle>
          <div className="mt-4 space-y-3">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => generateNotificationDraft('reminder_1')}
            >
              督促（1回目）下書き生成
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => generateNotificationDraft('reminder_2')}
            >
              督促（2回目）下書き生成
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => generateNotificationDraft('final_notice')}
            >
              最終通知 下書き生成
            </Button>
          </div>
          {notifications.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">送信履歴</p>
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{NOTIFICATION_TYPE_LABELS[n.type]}</span>
                    <Badge variant={n.status === 'sent' ? 'success' : 'neutral'}>
                      {NOTIFICATION_STATUS_LABELS[n.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-border">
          <CardTitle>請求/入金タイムライン</CardTitle>
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">請求データがありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>対象月</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>請求状態</TableHead>
                <TableHead>期限</TableHead>
                <TableHead>入金状態</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const invoicePayments = payments.filter((p) => p.invoiceId === invoice.id)
                const latestPayment = invoicePayments[0]
                const overdueDays =
                  invoice.status === 'overdue' ? getOverdueDays(invoice.dueDate) : 0
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{formatMonth(invoice.billingMonth)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                        {INVOICE_STATUS_LABELS[invoice.status]}
                        {overdueDays > 0 && ` (${overdueDays}日)`}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      {latestPayment ? (
                        <Badge variant={PAYMENT_STATUS_VARIANT[latestPayment.status]}>
                          {PAYMENT_STATUS_LABELS[latestPayment.status]}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">未入金</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                          <Button variant="primary" size="sm" onClick={() => sendInvoice(invoice.id)} loading={processing}>
                            送付
                          </Button>
                        )}
                        {['sent', 'overdue'].includes(invoice.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => recordPayment(invoice.id)}
                            loading={processing}
                          >
                            入金記録
                          </Button>
                        )}
                        {invoice.status === 'overdue' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => generateNotificationDraft('reminder_1')}
                          >
                            督促
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-border">
          <CardTitle>操作ログ</CardTitle>
        </div>
        {opsLogs.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">操作ログがありません</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>変更内容</TableHead>
                <TableHead>理由</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opsLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>
                    {log.before && log.after ? (
                      <span>
                        {JSON.stringify(log.before)} → {JSON.stringify(log.after)}
                      </span>
                    ) : log.after ? (
                      <span>{JSON.stringify(log.after)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{log.reason || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={statusChangeModal}
        onClose={() => {
          setStatusChangeModal(false)
          setTargetStatus(null)
          setStatusChangeReason('')
        }}
        title="ステータス変更"
      >
        {targetStatus && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={CONTRACT_STATUS_VARIANT[contract.status]}>
                {CONTRACT_STATUS_LABELS[contract.status]}
              </Badge>
              <span className="text-gray-400">→</span>
              <Badge variant={CONTRACT_STATUS_VARIANT[targetStatus]}>
                {CONTRACT_STATUS_LABELS[targetStatus]}
              </Badge>
            </div>
            {targetStatus === 'cancelled' && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">
                  警告：このステータスは不可逆です。解約完了後は元に戻せません。
                </p>
              </div>
            )}
            <Textarea
              label="変更理由（必須）"
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              placeholder="変更理由を入力してください"
            />
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusChangeModal(false)
                  setTargetStatus(null)
                  setStatusChangeReason('')
                }}
              >
                キャンセル
              </Button>
              <Button
                variant={targetStatus === 'cancelled' ? 'danger' : 'primary'}
                onClick={handleStatusChange}
                loading={processing}
                disabled={!statusChangeReason.trim()}
              >
                変更を確定
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={notificationModal}
        onClose={() => {
          setNotificationModal(false)
          setDraftNotification(null)
          setNotificationBody('')
        }}
        title="通知下書き"
        size="lg"
      >
        {draftNotification && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">宛先</p>
              <p className="text-sm font-medium">{draftNotification.toEmail || '（メールアドレス未設定）'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">件名</p>
              <p className="text-sm font-medium">{draftNotification.subject}</p>
            </div>
            <Textarea
              label="本文"
              value={notificationBody}
              onChange={(e) => setNotificationBody(e.target.value)}
              className="min-h-[300px]"
            />
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setNotificationModal(false)
                  setDraftNotification(null)
                  setNotificationBody('')
                }}
              >
                キャンセル
              </Button>
              <Button variant="primary" onClick={sendNotification} loading={processing}>
                送信（デモ）
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {ConfirmDialogElement}
    </div>
  )
}
