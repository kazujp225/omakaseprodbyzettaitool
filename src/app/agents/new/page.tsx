'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, useToastHelpers } from '@/components/ui'
import { mockAgentRepository } from '@/repositories/mock'
import type { CreateAgentInput } from '@/domain/types'
import { DEFAULT_ORG_ID } from '@/seed/data'

export default function NewAgentPage() {
  const router = useRouter()
  const toast = useToastHelpers()

  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    stockUnitPrice: 3000,
    monthlyTarget: 10,
    bankName: '',
    bankBranch: '',
    bankAccountType: 'ordinary' as 'ordinary' | 'current',
    bankAccountNumber: '',
    bankAccountHolder: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.contactEmail.trim()) return

    setCreating(true)
    try {
      const input: CreateAgentInput = {
        orgId: DEFAULT_ORG_ID,
        name: formData.name,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        stockUnitPrice: formData.stockUnitPrice,
        monthlyTarget: formData.monthlyTarget,
        contractStartDate: new Date(),
        contractEndDate: null,
        settlementType: 'stock_only',
        isActive: true,
        bankName: formData.bankName || null,
        bankBranch: formData.bankBranch || null,
        bankAccountType: formData.bankAccountType || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        bankAccountHolder: formData.bankAccountHolder || null,
        notes: formData.notes || null,
      }
      const created = await mockAgentRepository.create(input)
      toast.success('代理店を登録しました', `${created.name} の登録が完了しました`)
      router.push(`/agents/${created.id}`)
    } catch {
      toast.error('エラーが発生しました', '代理店の登録に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isValid = formData.name.trim() && formData.contactEmail.trim()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">新規代理店登録</h1>
          <p className="mt-1 text-sm text-muted-foreground">OEM代理店の情報を登録します</p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/agents')} className="self-start sm:self-auto">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          戻る
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-8">
            {/* 基本情報 */}
            <div className="pb-8 border-b border-border">
              <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 rounded text-primary text-sm flex items-center justify-center font-bold">1</span>
                基本情報
              </h3>
              <div className="space-y-6">
                <Input
                  label="代理店名"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="株式会社サンプル"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="担当者メールアドレス"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    placeholder="contact@example.com"
                    required
                  />
                  <Input
                    label="電話番号"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    placeholder="03-1234-5678"
                  />
                </div>
              </div>
            </div>

            {/* 契約条件 */}
            <div className="pb-8 border-b border-border">
              <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 rounded text-primary text-sm flex items-center justify-center font-bold">2</span>
                契約条件
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="ストック単価（円）"
                    type="number"
                    value={formData.stockUnitPrice.toString()}
                    onChange={(e) => updateField('stockUnitPrice', parseInt(e.target.value) || 0)}
                    placeholder="3000"
                  />
                  <Input
                    label="月間目標（件）"
                    type="number"
                    value={formData.monthlyTarget.toString()}
                    onChange={(e) => updateField('monthlyTarget', parseInt(e.target.value) || 0)}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* 振込先情報 */}
            <div>
              <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 rounded text-primary text-sm flex items-center justify-center font-bold">3</span>
                振込先情報（任意）
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="銀行名"
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder="みずほ銀行"
                  />
                  <Input
                    label="支店名"
                    value={formData.bankBranch}
                    onChange={(e) => updateField('bankBranch', e.target.value)}
                    placeholder="渋谷支店"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="口座番号"
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                    placeholder="1234567"
                  />
                  <Input
                    label="口座名義"
                    value={formData.bankAccountHolder}
                    onChange={(e) => updateField('bankAccountHolder', e.target.value)}
                    placeholder="カ）サンプル"
                  />
                </div>
              </div>
            </div>

            {/* アクション */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-6 border-t border-border mt-8">
              <Button variant="secondary" type="button" onClick={() => router.push('/agents')} className="w-full sm:w-auto">
                キャンセル
              </Button>
              <Button type="submit" loading={creating} disabled={!isValid} className="w-full sm:w-auto">
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
