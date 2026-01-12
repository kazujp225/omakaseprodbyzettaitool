'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, useToastHelpers } from '@/components/ui'
import { mockAccountRepository } from '@/repositories/mock'
import type { CreateAccountInput } from '@/domain/types'
import { DEFAULT_ORG_ID } from '@/seed/data'

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

export default function NewStorePage() {
  const router = useRouter()
  const toast = useToastHelpers()

  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    accountName: '',
    adminEmail: '',
    password: '',
    postalCode: '',
    prefecture: '東京都',
    addressDetail: '',
    phoneArea: '',
    phoneLocal: '',
    phoneNumber: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountName.trim() || !formData.adminEmail.trim()) return

    setCreating(true)
    try {
      const input: CreateAccountInput = {
        orgId: DEFAULT_ORG_ID,
        accountName: formData.accountName,
        adminEmail: formData.adminEmail,
        password: formData.password || 'temp123',
        postalCode: formData.postalCode,
        prefecture: formData.prefecture,
        addressDetail: formData.addressDetail,
        phoneArea: formData.phoneArea,
        phoneLocal: formData.phoneLocal,
        phoneNumber: formData.phoneNumber,
        accountManager: null,
        lineOfficialNotification: false,
        influencerDbPlan: 'free',
        memo: null,
        instagramIntegration: 'pending',
        gbpManagement: 'pending',
        instagramGbpIntegration: 'pending',
        agencyId: null,
      }
      const created = await mockAccountRepository.create(input)
      toast.success('アカウントを登録しました', `${created.accountName} の登録が完了しました`)
      router.push(`/stores/${created.id}`)
    } catch {
      toast.error('エラーが発生しました', '店舗の登録に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isValid = formData.accountName.trim() && formData.adminEmail.trim()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">新規店舗登録</h1>
          <p className="mt-1 text-sm text-navy-400">MEOツールで管理する店舗情報を登録します</p>
        </div>
        <Button variant="secondary" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          戻る
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-8">
            {/* 基本情報 */}
            <div>
              <h3 className="text-base font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-accent-100 rounded text-accent-600 text-sm flex items-center justify-center font-bold">1</span>
                基本情報
              </h3>
              <div className="space-y-4 pl-8">
                <Input
                  label="アカウント名"
                  value={formData.accountName}
                  onChange={(e) => updateField('accountName', e.target.value)}
                  placeholder="渋谷カフェ本店"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="管理者メールアドレス"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => updateField('adminEmail', e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                  <Input
                    label="パスワード"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* 連絡先 */}
            <div>
              <h3 className="text-base font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-accent-100 rounded text-accent-600 text-sm flex items-center justify-center font-bold">2</span>
                連絡先
              </h3>
              <div className="space-y-4 pl-8">
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="電話番号（市外局番）"
                    value={formData.phoneArea}
                    onChange={(e) => updateField('phoneArea', e.target.value)}
                    placeholder="03"
                  />
                  <Input
                    label="（市内局番）"
                    value={formData.phoneLocal}
                    onChange={(e) => updateField('phoneLocal', e.target.value)}
                    placeholder="1234"
                  />
                  <Input
                    label="（加入者番号）"
                    value={formData.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                    placeholder="5678"
                  />
                </div>
              </div>
            </div>

            {/* 所在地 */}
            <div>
              <h3 className="text-base font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-accent-100 rounded text-accent-600 text-sm flex items-center justify-center font-bold">3</span>
                所在地
              </h3>
              <div className="space-y-4 pl-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="郵便番号"
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="150-0043"
                  />
                  <Select
                    label="都道府県"
                    options={PREFECTURES.map((p) => ({ value: p, label: p }))}
                    value={formData.prefecture}
                    onChange={(e) => updateField('prefecture', e.target.value)}
                  />
                </div>
                <Input
                  label="住所詳細"
                  value={formData.addressDetail}
                  onChange={(e) => updateField('addressDetail', e.target.value)}
                  placeholder="渋谷区道玄坂1-2-3 〇〇ビル5F"
                />
              </div>
            </div>

            {/* アクション */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                キャンセル
              </Button>
              <Button type="submit" loading={creating} disabled={!isValid}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                登録する
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
