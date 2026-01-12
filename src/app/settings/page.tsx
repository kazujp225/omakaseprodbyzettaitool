'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, EmptyState, NoDataIcon } from '@/components/ui'
import { mockPlanRepository } from '@/repositories/mock'
import type { Plan } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

type TabType = 'plans' | 'templates' | 'permissions'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('plans')
  const [plans, setPlans] = useState<Plan[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const plansData = await mockPlanRepository.list(DEFAULT_ORG_ID)
      setPlans(plansData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'plans',
      label: 'プラン管理',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'templates',
      label: 'テンプレート',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    },
    {
      id: 'permissions',
      label: '権限設定',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
  ]

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">設定</h1>
        <p className="mt-1 text-sm text-navy-400">システム設定を管理</p>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-navy-600 text-accent-600'
                      : 'border-transparent text-navy-400 hover:text-navy-600 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-800">プラン一覧</h2>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  新規プラン作成
                </Button>
              </div>

              {plans.length === 0 ? (
                <EmptyState
                  icon={<NoDataIcon />}
                  title="プランがありません"
                  description="最初のプランを作成してください"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-lg border ${plan.isActive ? 'border-primary-200' : 'border-gray-200'} p-5 hover:shadow-card-hover transition-all cursor-pointer`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-navy-800">{plan.name}</h3>
                        <Badge variant={plan.isActive ? 'success' : 'neutral'}>
                          {plan.isActive ? '有効' : '無効'}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-navy-400">月額料金</span>
                          <span className="font-semibold text-accent-600">{formatCurrency(plan.monthlyPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-navy-400">初期費用</span>
                          <span className="text-navy-800">{plan.setupFee ? formatCurrency(plan.setupFee) : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-navy-400">作成日</span>
                          <span className="text-navy-800">{formatDate(plan.createdAt)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        編集
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-800">通知テンプレート</h2>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  新規テンプレート
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { type: 'invoice_send', label: '請求書送付', description: '月次請求書を送付する際のメールテンプレート', bg: 'bg-navy-50', text: 'text-navy-600' },
                  { type: 'reminder_1', label: '督促1回目', description: '支払期限超過7日以内の督促メール', bg: 'bg-amber-50', text: 'text-amber-600' },
                  { type: 'reminder_2', label: '督促2回目', description: '支払期限超過14日以上の督促メール', bg: 'bg-amber-50', text: 'text-amber-600' },
                  { type: 'final_notice', label: '最終通知', description: 'サービス停止前の最終通知メール', bg: 'bg-red-50', text: 'text-red-600' },
                  { type: 'cancel_confirm', label: '解約確認', description: '解約申請受付時の確認メール', bg: 'bg-gray-50', text: 'text-navy-500' },
                  { type: 'payment_failed', label: '決済失敗', description: '決済失敗時の通知メール', bg: 'bg-red-50', text: 'text-red-600' },
                ].map((template) => (
                  <div
                    key={template.type}
                    className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-card-hover transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${template.bg} rounded-md flex items-center justify-center`}>
                          <svg className={`w-5 h-5 ${template.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-navy-800">{template.label}</h3>
                          <p className="text-sm text-navy-400 mt-1">{template.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        編集
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-800">ユーザーと権限</h2>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  ユーザーを招待
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ユーザー名</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>役割</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: '管理者', email: 'admin@example.com', role: '管理者', roleColor: 'danger', initial: 'A' },
                      { name: '運用担当者', email: 'user@example.com', role: '運用担当', roleColor: 'warning', initial: 'U' },
                      { name: '営業担当', email: 'sales@example.com', role: '営業', roleColor: 'neutral', initial: 'S' },
                    ].map((user) => (
                      <TableRow key={user.email}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-navy-50 flex items-center justify-center">
                              <span className="text-sm font-semibold text-accent-600">{user.initial}</span>
                            </div>
                            <span className="font-medium text-navy-800">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-navy-500">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.roleColor as 'danger' | 'warning' | 'neutral'}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">有効</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">編集</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-navy-800 mb-4">権限の説明</h3>
                <div className="space-y-3">
                  {[
                    { role: '管理者', color: 'danger', desc: 'すべての操作が可能。プラン/テンプレート/権限の設定変更、解約確定、データ削除などの重要操作を実行可能。' },
                    { role: '運用担当', color: 'warning', desc: '請求・入金管理、督促送信、ルート稼働管理が可能。解約確定は不可。' },
                    { role: '営業', color: 'neutral', desc: '店舗登録、契約作成（leadまで）、閲覧のみ。請求・入金操作は不可。' },
                  ].map((item) => (
                    <div key={item.role} className="flex items-start gap-4 p-4 bg-white rounded-md border border-gray-200">
                      <Badge variant={item.color as 'danger' | 'warning' | 'neutral'}>{item.role}</Badge>
                      <p className="text-sm text-navy-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
