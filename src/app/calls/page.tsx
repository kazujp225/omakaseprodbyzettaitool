'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  const [allRecords, setAllRecords] = useState<CallRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, allData, count] = await Promise.all([
        searchQuery
          ? mockCallRecordRepository.search(DEFAULT_ORG_ID, searchQuery)
          : mockCallRecordRepository.list(DEFAULT_ORG_ID),
        mockCallRecordRepository.list(DEFAULT_ORG_ID),
        mockCallRecordRepository.count(DEFAULT_ORG_ID),
      ])
      setRecords(data)
      setAllRecords(allData)
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

  // ステータス別カウント
  const statusCounts = useMemo(() => {
    return {
      new: allRecords.filter(r => r.status === 'new').length,
      inProgress: allRecords.filter(r => r.status === 'in_progress').length,
      completed: allRecords.filter(r => r.status === 'completed').length,
      contacted: allRecords.filter(r => r.status === 'contacted').length,
      callback: allRecords.filter(r => r.status === 'callback_scheduled').length,
    }
  }, [allRecords])

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">コール管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            架電対象レコード一覧（{totalCount}件）
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">新規</p>
              <p className="text-xl font-bold text-amber-600">{statusCounts.new}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">進行中</p>
              <p className="text-xl font-bold text-blue-600">{statusCounts.inProgress}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完了</p>
              <p className="text-xl font-bold text-green-600">{statusCounts.completed}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">接触済</p>
              <p className="text-xl font-bold text-teal-600">{statusCounts.contacted}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">再コール</p>
              <p className="text-xl font-bold text-purple-600">{statusCounts.callback}</p>
            </div>
          </div>
        </Card>
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
