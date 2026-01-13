'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingState, Input } from '@/components/ui'
import { mockCallRecordRepository } from '@/repositories/mock'
import type { CallRecord } from '@/domain/types'
import { CALL_RECORD_STATUS_LABELS, CALL_RECORD_STATUS_VARIANT } from '@/domain/status'
import { formatDate } from '@/lib/utils'
import { DEFAULT_ORG_ID } from '@/seed/data'

export default function CallsPage() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<CallRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, count] = await Promise.all([
        searchQuery
          ? mockCallRecordRepository.search(DEFAULT_ORG_ID, searchQuery)
          : mockCallRecordRepository.list(DEFAULT_ORG_ID),
        mockCallRecordRepository.count(DEFAULT_ORG_ID),
      ])
      setRecords(data)
      setTotalCount(count)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">コール管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            架電対象レコード一覧（{totalCount}件）
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <Input
            placeholder="店舗名、顧客名、電話番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">検索</Button>
        </form>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客ID</TableHead>
                <TableHead>店舗名</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>再コール予定</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{record.customerId}</TableCell>
                  <TableCell className="font-medium">{record.storeName}</TableCell>
                  <TableCell>{record.customerName}</TableCell>
                  <TableCell className="font-mono text-sm">{record.phone1}</TableCell>
                  <TableCell>
                    <Badge variant={CALL_RECORD_STATUS_VARIANT[record.status]}>
                      {CALL_RECORD_STATUS_LABELS[record.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.reCallDate ? (
                      <span className="text-sm">
                        {formatDate(record.reCallDate)} {record.reCallTime}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(record.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/calls/${record.id}`}>
                      <Button variant="ghost" size="sm">
                        詳細
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
