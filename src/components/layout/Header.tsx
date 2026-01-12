'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { mockAccountRepository, mockContractRepository, mockInvoiceRepository } from '@/repositories/mock'
import type { Account, Contract, Invoice } from '@/domain/types'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANT, INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT } from '@/domain/status'
import { DEFAULT_ORG_ID } from '@/seed/data'
import { cn, formatCurrency, formatMonth } from '@/lib/utils'

type SearchCategory = 'all' | 'stores' | 'contracts' | 'invoices' | 'commands'

interface StoreResult {
  type: 'store'
  store: Account
  activeContract: Contract | null
}

interface ContractResult {
  type: 'contract'
  contract: Contract
  store: Account | null
}

interface InvoiceResult {
  type: 'invoice'
  invoice: Invoice
  contract: Contract | null
  store: Account | null
}

interface CommandResult {
  type: 'command'
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  shortcut?: string
}

type SearchResult = StoreResult | ContractResult | InvoiceResult | CommandResult

interface FilterPreset {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  filters: {
    category: SearchCategory
    query?: string
    status?: string
  }
}

// Highlight matching text
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [category, setCategory] = useState<SearchCategory>('all')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showBackdrop, setShowBackdrop] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('globalRecentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('globalRecentSearches', JSON.stringify(updated))
  }

  // Commands for command palette
  const commands: CommandResult[] = useMemo(() => [
    {
      type: 'command',
      id: 'goto-dashboard',
      label: 'ダッシュボードに移動',
      description: 'メインダッシュボードを開く',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      action: () => router.push('/'),
      shortcut: '⌘D',
    },
    {
      type: 'command',
      id: 'goto-stores',
      label: '店舗一覧に移動',
      description: '登録済み店舗を検索・閲覧',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      action: () => router.push('/stores'),
      shortcut: 'S',
    },
    {
      type: 'command',
      id: 'goto-contracts',
      label: '契約一覧に移動',
      description: 'すべての契約を管理',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => router.push('/contracts'),
      shortcut: 'C',
    },
    {
      type: 'command',
      id: 'goto-invoices',
      label: '請求一覧に移動',
      description: '今月の請求を確認',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      action: () => router.push('/invoices'),
      shortcut: 'I',
    },
    {
      type: 'command',
      id: 'goto-overdue',
      label: '未入金・督促に移動',
      description: '支払い遅延案件を確認',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => router.push('/overdue'),
      shortcut: 'O',
    },
    {
      type: 'command',
      id: 'goto-cancellation',
      label: '解約管理に移動',
      description: '解約予定の契約を管理',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      action: () => router.push('/cancellation'),
    },
    {
      type: 'command',
      id: 'filter-active',
      label: '稼働中の契約を表示',
      description: '稼働中(active)ステータスでフィルタ',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      ),
      action: () => router.push('/contracts?status=active'),
    },
    {
      type: 'command',
      id: 'filter-overdue',
      label: '期限超過の請求を表示',
      description: '支払い期限を超過した請求',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      action: () => router.push('/overdue'),
    },
    {
      type: 'command',
      id: 'settings',
      label: '設定を開く',
      description: 'システム設定',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => router.push('/settings'),
      shortcut: '⌘,',
    },
  ], [router])

  // Filter presets
  const filterPresets: FilterPreset[] = [
    {
      id: 'urgent',
      label: '緊急対応',
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded bg-red-500 text-white text-sm font-bold">!</span>
      ),
      description: '未入金・解約待ちを確認',
      filters: { category: 'all', status: 'urgent' },
    },
    {
      id: 'this-month',
      label: '今月の請求',
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500 text-white text-sm font-bold">¥</span>
      ),
      description: '今月発行の請求書',
      filters: { category: 'invoices' },
    },
    {
      id: 'new-leads',
      label: '新規リード',
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded bg-green-500 text-white text-sm font-bold">+</span>
      ),
      description: 'まだ成約していないリード',
      filters: { category: 'contracts', status: 'lead' },
    },
  ]

  // ⌘K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowResults(true)
        setShowBackdrop(true)
      }
      // ESC to close
      if (e.key === 'Escape' && showResults) {
        setShowResults(false)
        setShowBackdrop(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showResults])

  const searchAll = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Show commands when no query
      if (category === 'commands' || category === 'all') {
        setResults(commands)
      } else {
        setResults([])
      }
      return
    }

    setIsSearching(true)
    try {
      const [stores, contracts, invoices] = await Promise.all([
        mockAccountRepository.search(DEFAULT_ORG_ID, query),
        mockContractRepository.list(DEFAULT_ORG_ID),
        mockInvoiceRepository.listByStatus(DEFAULT_ORG_ID, ['draft', 'sent', 'paid', 'overdue']),
      ])

      const allResults: SearchResult[] = []
      const queryLower = query.toLowerCase()

      // Command results (if query starts with > or category is commands)
      if (query.startsWith('>') || category === 'commands' || category === 'all') {
        const cmdQuery = query.startsWith('>') ? query.slice(1).trim() : query
        commands
          .filter(cmd =>
            cmd.label.toLowerCase().includes(cmdQuery.toLowerCase()) ||
            cmd.description.toLowerCase().includes(cmdQuery.toLowerCase())
          )
          .forEach(cmd => allResults.push(cmd))
      }

      // Store results
      if (category === 'all' || category === 'stores') {
        stores.slice(0, 5).forEach((store) => {
          const activeContract = contracts.find(
            (c) => c.accountId === store.id && ['active', 'cancel_pending'].includes(c.status)
          ) || null
          allResults.push({ type: 'store', store, activeContract })
        })
      }

      // Contract results
      if (category === 'all' || category === 'contracts') {
        contracts
          .filter((c) => {
            const store = stores.find((s) => s.id === c.accountId)
            return (
              store?.accountName.toLowerCase().includes(queryLower) ||
              c.notes?.toLowerCase().includes(queryLower)
            )
          })
          .slice(0, 5)
          .forEach((contract) => {
            const store = stores.find((s) => s.id === contract.accountId) || null
            allResults.push({ type: 'contract', contract, store })
          })
      }

      // Invoice results (search by amount or month)
      if (category === 'all' || category === 'invoices') {
        invoices
          .filter((inv) => {
            const contract = contracts.find((c) => c.id === inv.contractId)
            const store = contract ? stores.find((s) => s.id === contract.accountId) : null
            return (
              store?.accountName.toLowerCase().includes(queryLower) ||
              inv.amount.toString().includes(query) ||
              formatMonth(inv.billingMonth).includes(query)
            )
          })
          .slice(0, 5)
          .forEach((invoice) => {
            const contract = contracts.find((c) => c.id === invoice.contractId) || null
            const store = contract ? stores.find((s) => s.id === contract.accountId) || null : null
            allResults.push({ type: 'invoice', invoice, contract, store })
          })
      }

      setResults(allResults)
      setSelectedIndex(-1)
    } finally {
      setIsSearching(false)
    }
  }, [category, commands])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(searchQuery)
    }, 150)
    return () => clearTimeout(timer)
  }, [searchQuery, searchAll])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setShowBackdrop(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('[data-result-item]')
      const selectedItem = items[selectedIndex]
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        navigateToResult(results[selectedIndex])
      } else if (searchQuery.trim()) {
        saveRecentSearch(searchQuery)
        router.push(`/stores?q=${encodeURIComponent(searchQuery.trim())}`)
        closeSearch()
      }
    } else if (e.key === 'Escape') {
      closeSearch()
    } else if (e.key === 'Tab' && showResults) {
      e.preventDefault()
      const categories: SearchCategory[] = ['all', 'stores', 'contracts', 'invoices', 'commands']
      const currentIndex = categories.indexOf(category)
      setCategory(categories[(currentIndex + 1) % categories.length])
    }
  }

  const closeSearch = () => {
    setShowResults(false)
    setShowBackdrop(false)
    setSearchQuery('')
    inputRef.current?.blur()
  }

  const navigateToResult = (result: SearchResult) => {
    saveRecentSearch(searchQuery)
    if (result.type === 'store') {
      router.push(`/stores/${result.store.id}`)
    } else if (result.type === 'contract') {
      router.push(`/contracts/${result.contract.id}`)
    } else if (result.type === 'invoice') {
      router.push(`/contracts/${result.invoice.contractId}`)
    } else if (result.type === 'command') {
      result.action()
    }
    closeSearch()
  }

  const handlePresetClick = (preset: FilterPreset) => {
    setCategory(preset.filters.category)
    if (preset.filters.query) {
      setSearchQuery(preset.filters.query)
    }
    if (preset.id === 'urgent') {
      router.push('/overdue')
      closeSearch()
    } else if (preset.id === 'this-month') {
      router.push('/invoices')
      closeSearch()
    } else if (preset.id === 'new-leads') {
      router.push('/contracts?status=lead')
      closeSearch()
    }
  }

  const categoryConfig: Record<SearchCategory, { label: string; icon: React.ReactNode; color: string }> = {
    all: {
      label: 'すべて',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      color: 'bg-gray-100 text-gray-700',
    },
    stores: {
      label: '店舗',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-navy-100 text-navy-700',
    },
    contracts: {
      label: '契約',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-700',
    },
    invoices: {
      label: '請求',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-700',
    },
    commands: {
      label: 'コマンド',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-700',
    },
  }

  const getResultIcon = (result: SearchResult) => {
    if (result.type === 'store') {
      return (
        <div className="w-10 h-10 bg-navy-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-navy-500">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )
    } else if (result.type === 'contract') {
      return (
        <div className="w-10 h-10 bg-navy-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-navy-400">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )
    } else if (result.type === 'invoice') {
      return (
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-green-500">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      )
    } else {
      return (
        <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-accent-400">
          {result.icon}
        </div>
      )
    }
  }

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: { type: string; label: string; results: SearchResult[] }[] = []

    const commandResults = results.filter(r => r.type === 'command')
    const storeResults = results.filter(r => r.type === 'store')
    const contractResults = results.filter(r => r.type === 'contract')
    const invoiceResults = results.filter(r => r.type === 'invoice')

    if (commandResults.length > 0) {
      groups.push({ type: 'command', label: 'コマンド', results: commandResults })
    }
    if (storeResults.length > 0) {
      groups.push({ type: 'store', label: '店舗', results: storeResults })
    }
    if (contractResults.length > 0) {
      groups.push({ type: 'contract', label: '契約', results: contractResults })
    }
    if (invoiceResults.length > 0) {
      groups.push({ type: 'invoice', label: '請求', results: invoiceResults })
    }

    return groups
  }, [results])

  // Calculate flat index for keyboard navigation
  const flattenedResults = useMemo(() =>
    groupedResults.flatMap(g => g.results),
    [groupedResults]
  )

  return (
    <>
      {/* Backdrop - positioned below header but above main content */}
      {showBackdrop && (
        <div
          className="fixed inset-0 bg-black/30 z-40 animate-backdrop"
          style={{ top: '64px', left: '256px' }}
          onClick={() => {
            setShowResults(false)
            setShowBackdrop(false)
          }}
        />
      )}

      <header className="fixed top-0 right-0 left-64 z-50 h-16 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-full px-6">
          {/* Global Search Bar */}
          <div ref={searchRef} className={cn(
            "relative flex-1 max-w-2xl transition-all duration-300",
            showResults ? "z-[60]" : ""
          )}>
            <div
              className={cn(
                'relative flex items-center transition-all duration-200',
                showResults
                  ? 'ring-2 ring-navy-600 shadow-xl shadow-navy-500/10 rounded-t-2xl bg-white'
                  : 'rounded-xl bg-gray-50/80 hover:bg-gray-100/80'
              )}
            >
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                {isSearching ? (
                  <Spinner size="sm" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="検索、または > でコマンド..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setShowResults(true)
                  setShowBackdrop(true)
                }}
                onKeyDown={handleKeyDown}
                className={cn(
                  'w-full border-0 bg-transparent pl-12 pr-24 py-3 text-base text-gray-800 placeholder-gray-400',
                  'focus:outline-none transition-all'
                )}
              />
              {/* Keyboard shortcut hint */}
              {!showResults && !searchQuery && (
                <div className="absolute right-4 flex items-center gap-1.5">
                  <kbd className="px-2 py-1 text-sm font-medium text-gray-400 bg-white border border-gray-200 rounded-md shadow-sm">
                    ⌘K
                  </kbd>
                </div>
              )}
              {/* Clear button */}
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    inputRef.current?.focus()
                  }}
                  className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-2xl border border-t-0 border-gray-200 rounded-b-2xl max-h-[75vh] overflow-hidden animate-search-dropdown">
                {/* Category Tabs */}
                <div className="flex items-center gap-1 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                  {(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
                        category === cat
                          ? cn(categoryConfig[cat].color, 'shadow-sm')
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                      )}
                    >
                      {categoryConfig[cat].icon}
                      {categoryConfig[cat].label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">Tab</kbd>
                    で切替
                  </span>
                </div>

                <div ref={resultsRef} className="overflow-y-auto max-h-[55vh]">
                  {/* Quick Presets (when no query) */}
                  {!searchQuery && (
                    <>
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">クイックアクセス</p>
                      </div>
                      <div className="p-2 grid grid-cols-3 gap-2">
                        {filterPresets.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handlePresetClick(preset)}
                            className="flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 rounded-xl transition-all group"
                          >
                            {preset.icon}
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-medium text-gray-800 group-hover:text-navy-600 transition-colors">{preset.label}</p>
                              <p className="text-sm text-gray-400 truncate">{preset.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <>
                          <div className="px-4 py-2.5 bg-gray-50/50 border-y border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">最近の検索</p>
                            <button
                              onClick={() => {
                                setRecentSearches([])
                                localStorage.removeItem('globalRecentSearches')
                              }}
                              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                            >
                              クリア
                            </button>
                          </div>
                          <div className="p-2">
                            {recentSearches.map((query, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSearchQuery(query)
                                  searchAll(query)
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-all group"
                              >
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-base text-gray-600 group-hover:text-gray-900 transition-colors">{query}</span>
                                <svg className="w-4 h-4 text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Hint */}
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-navy-600">ヒント:</span>
                          「{'>'}」から始めるとコマンドを検索できます
                        </p>
                      </div>
                    </>
                  )}

                  {/* Search Results */}
                  {searchQuery && flattenedResults.length === 0 && !isSearching && (
                    <div className="px-4 py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-base font-medium text-gray-600 mb-1">「{searchQuery}」に一致する結果がありません</p>
                      <p className="text-sm text-gray-400">別のキーワードで検索してみてください</p>
                    </div>
                  )}

                  {searchQuery && groupedResults.length > 0 && (
                    <div className="py-2">
                      {groupedResults.map((group) => (
                        <div key={group.type}>
                          <div className="px-4 py-2 sticky top-0 bg-white/95 backdrop-blur-sm">
                            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
                          </div>
                          {group.results.map((result, index) => {
                            const flatIndex = flattenedResults.indexOf(result)
                            return (
                              <button
                                key={`${result.type}-${index}`}
                                data-result-item
                                onClick={() => navigateToResult(result)}
                                className={cn(
                                  'w-full flex items-center gap-4 px-4 py-3 text-left transition-all duration-150',
                                  flatIndex === selectedIndex
                                    ? 'bg-navy-50 border-l-2 border-accent-500'
                                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                                )}
                              >
                                {getResultIcon(result)}
                                <div className="flex-1 min-w-0">
                                  {result.type === 'store' && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-base text-gray-900 truncate">
                                          <HighlightText text={result.store.accountName} query={searchQuery} />
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-sm text-gray-500">{result.store.prefecture}</span>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-sm text-gray-500">{`${result.store.phoneArea}-${result.store.phoneLocal}-${result.store.phoneNumber}`}</span>
                                        {result.activeContract && (
                                          <>
                                            <span className="text-gray-300">·</span>
                                            <span className="text-sm text-green-600 font-medium">契約中</span>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {result.type === 'contract' && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-base text-gray-900 truncate">
                                          <HighlightText text={result.store?.accountName || '不明'} query={searchQuery} />
                                        </p>
                                      </div>
                                      <p className="text-sm text-gray-500 mt-0.5">
                                        {formatCurrency(result.contract.contractMonthlyPriceSnapshot)}/月
                                      </p>
                                    </>
                                  )}
                                  {result.type === 'invoice' && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-base text-gray-900 truncate">
                                          <HighlightText text={result.store?.accountName || '不明'} query={searchQuery} />
                                        </p>
                                      </div>
                                      <p className="text-sm text-gray-500 mt-0.5">
                                        {formatMonth(result.invoice.billingMonth)} · {formatCurrency(result.invoice.amount)}
                                      </p>
                                    </>
                                  )}
                                  {result.type === 'command' && (
                                    <>
                                      <p className="font-medium text-sm text-gray-900 truncate">
                                        <HighlightText text={result.label} query={searchQuery.replace(/^>/, '')} />
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">{result.description}</p>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {result.type === 'store' && result.activeContract && (
                                    <Badge variant={CONTRACT_STATUS_VARIANT[result.activeContract.status]} size="sm">
                                      {CONTRACT_STATUS_LABELS[result.activeContract.status]}
                                    </Badge>
                                  )}
                                  {result.type === 'contract' && (
                                    <Badge variant={CONTRACT_STATUS_VARIANT[result.contract.status]} size="sm">
                                      {CONTRACT_STATUS_LABELS[result.contract.status]}
                                    </Badge>
                                  )}
                                  {result.type === 'invoice' && (
                                    <Badge variant={INVOICE_STATUS_VARIANT[result.invoice.status]} size="sm">
                                      {INVOICE_STATUS_LABELS[result.invoice.status]}
                                    </Badge>
                                  )}
                                  {result.type === 'command' && result.shortcut && (
                                    <kbd className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-md">
                                      {result.shortcut}
                                    </kbd>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                  {searchQuery && flattenedResults.length > 0 ? (
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{flattenedResults.length}</span> 件の結果
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">検索してみましょう</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">↑↓</kbd>
                      移動
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">Enter</kbd>
                      開く
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium">Esc</kbd>
                      閉じる
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-6">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              <span className="text-sm font-medium text-green-700">稼働中</span>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <Link href="/settings" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}
