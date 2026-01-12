'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Select } from './Select'

interface SearchSuggestion {
  id: string
  label: string
  type: 'recent' | 'suggestion' | 'quick'
  icon?: React.ReactNode
  href?: string
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
  onClearRecentSearches?: () => void
  loading?: boolean
  autoFocus?: boolean
  showShortcut?: boolean
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = '検索...',
  suggestions = [],
  recentSearches = [],
  onClearRecentSearches,
  loading = false,
  autoFocus = false,
  showShortcut = true,
  className,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Combine suggestions
  const allSuggestions: SearchSuggestion[] = [
    ...recentSearches.slice(0, 3).map((s, i) => ({
      id: `recent-${i}`,
      label: s,
      type: 'recent' as const,
      icon: (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    })),
    ...suggestions,
  ]

  const filteredSuggestions = value
    ? allSuggestions.filter(s =>
      s.label.toLowerCase().includes(value.toLowerCase())
    )
    : allSuggestions

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    if (!showShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showShortcut])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        const selected = filteredSuggestions[selectedIndex]
        onChange(selected.label)
        onSearch?.(selected.label)
        setShowDropdown(false)
      } else {
        onSearch?.(value)
        setShowDropdown(false)
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    onChange(suggestion.label)
    onSearch?.(suggestion.label)
    setShowDropdown(false)
  }, [onChange, onSearch])

  const handleFocus = () => {
    setIsFocused(true)
    setShowDropdown(true)
    setSelectedIndex(-1)
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Delay to allow click on dropdown items
    setTimeout(() => setShowDropdown(false), 150)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div
        className={cn(
          'relative flex items-center transition-all duration-200',
          isFocused ? 'ring-2 ring-navy-600 ring-offset-1' : '',
          'bg-white border border-gray-200 rounded-xl overflow-hidden',
          'hover:border-gray-300 focus-within:border-navy-600'
        )}
      >
        {/* Search Icon */}
        <div className="absolute left-4 flex items-center pointer-events-none">
          {loading ? (
            <svg className="w-5 h-5 text-navy-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setShowDropdown(true)
            setSelectedIndex(-1)
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full py-3 pl-12 pr-20 text-sm bg-transparent',
            'text-navy-800 placeholder-gray-400',
            'focus:outline-none'
          )}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="absolute right-12 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {showShortcut && !isFocused && !value && (
          <div className="absolute right-4 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
              ⌘
            </kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
              K
            </kbd>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg',
            'overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          {/* Recent searches header */}
          {recentSearches.length > 0 && !value && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">最近の検索</span>
              {onClearRecentSearches && (
                <button
                  onClick={onClearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          )}

          {/* Suggestions list */}
          <div className="max-h-64 overflow-y-auto py-2">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  selectedIndex === index
                    ? 'bg-navy-50 text-accent-600'
                    : 'text-navy-600 hover:bg-gray-50'
                )}
              >
                {suggestion.icon || (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <span className="flex-1 text-sm truncate">{suggestion.label}</span>
                {suggestion.type === 'recent' && (
                  <span className="text-xs text-gray-400">履歴</span>
                )}
                {suggestion.type === 'quick' && (
                  <span className="text-xs text-navy-500">クイック</span>
                )}
              </button>
            ))}
          </div>

          {/* Search hint */}
          {value && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-navy-400">
                <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-gray-600 mr-1">Enter</kbd>
                で「{value}」を検索
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Active Filters Component
interface FilterTag {
  id: string
  label: string
  value: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

interface ActiveFiltersProps {
  filters: FilterTag[]
  onRemove: (filterId: string) => void
  onClearAll?: () => void
  className?: string
}

export function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  if (filters.length === 0) return null

  const colorClasses: Record<string, string> = {
    primary: 'bg-navy-50 text-accent-600 border-primary-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-50 text-navy-600 border-gray-200',
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-navy-400 mr-1">絞り込み:</span>
      {filters.map((filter) => (
        <span
          key={filter.id}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium',
            'border rounded-lg transition-all duration-150',
            'hover:shadow-sm',
            colorClasses[filter.color || 'neutral']
          )}
        >
          <span className="text-xs text-gray-400">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors ml-2"
        >
          すべてクリア
        </button>
      )}
    </div>
  )
}

// Filter Chip Component
interface FilterChipProps {
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

export function FilterChip({
  label,
  count,
  active = false,
  onClick,
  color = 'primary',
}: FilterChipProps) {
  const activeColors: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-800 border-primary-300 ring-2 ring-primary-200',
    success: 'bg-green-100 text-green-800 border-green-300 ring-2 ring-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-200',
    neutral: 'bg-gray-200 text-gray-800 border-gray-300 ring-2 ring-gray-200',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium',
        'border rounded-full transition-all duration-150',
        'hover:scale-105 active:scale-95',
        active
          ? activeColors[color]
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center',
            'text-xs font-semibold rounded-full',
            active ? 'bg-white/50' : 'bg-gray-100 text-navy-400'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Advanced Filter Panel
interface FilterGroup {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'date'
  options?: { value: string; label: string }[]
}

interface AdvancedFilterPanelProps {
  groups: FilterGroup[]
  values: Record<string, string | string[]>
  onChange: (groupId: string, value: string | string[]) => void
  onClear?: () => void
  isOpen?: boolean
  onToggle?: () => void
}

export function AdvancedFilterPanel({
  groups,
  values,
  onChange,
  onClear,
  isOpen = true,
  onToggle,
}: AdvancedFilterPanelProps) {
  const activeCount = Object.values(values).filter(v =>
    Array.isArray(v) ? v.length > 0 : v
  ).length

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium text-navy-600">詳細フィルター</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-navy-100 text-accent-600 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Groups */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              <label className="block text-sm font-medium text-navy-600 mb-2">
                {group.label}
              </label>
              {group.type === 'select' && group.options && (
                <Select
                  options={[{ value: '', label: 'すべて' }, ...group.options]}
                  value={values[group.id] as string || ''}
                  onChange={(val) => onChange(group.id, val)}
                  className="bg-white"
                />
              )}
              {group.type === 'multiselect' && group.options && (
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => {
                    const selected = (values[group.id] as string[] || []).includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const current = values[group.id] as string[] || []
                          onChange(
                            group.id,
                            selected
                              ? current.filter(v => v !== opt.value)
                              : [...current, opt.value]
                          )
                        }}
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors',
                          selected
                            ? 'bg-navy-50 text-accent-600 border-primary-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}
              {group.type === 'date' && (
                <input
                  type="date"
                  value={values[group.id] as string || ''}
                  onChange={(e) => onChange(group.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-primary-500"
                />
              )}
            </div>
          ))}

          {/* Clear button */}
          {onClear && activeCount > 0 && (
            <button
              onClick={onClear}
              className="w-full py-2 text-sm text-navy-400 hover:text-navy-600 transition-colors"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}
