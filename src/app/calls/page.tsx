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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">コール管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            架電対象レコード一覧（{totalCount}件）
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <Input
            placeholder="店舗名、顧客名、電話番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="w-full sm:w-auto">検索</Button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden lg:table-cell">顧客ID</TableHead>
                <TableHead>店舗名</TableHead>
                <TableHead className="hidden sm:table-cell">顧客名</TableHead>
                <TableHead className="hidden md:table-cell">電話番号</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="hidden lg:table-cell">再コール予定</TableHead>
                <TableHead className="hidden md:table-cell">更新日</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm hidden lg:table-cell">{record.customerId}</TableCell>
                  <TableCell className="font-medium">
                    <span className="truncate block max-w-[120px] sm:max-w-none">{record.storeName}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{record.customerName}</TableCell>
                  <TableCell className="font-mono text-sm hidden md:table-cell">{record.phone1}</TableCell>
                  <TableCell>
                    <Badge variant={CALL_RECORD_STATUS_VARIANT[record.status]}>
                      {CALL_RECORD_STATUS_LABELS[record.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {record.reCallDate ? (
                      <span className="text-sm">
                        {formatDate(record.reCallDate)} {record.reCallTime}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
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
