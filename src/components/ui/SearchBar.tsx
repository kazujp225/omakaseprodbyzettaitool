'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Clock, Loader2 } from 'lucide-react'
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

  const allSuggestions: SearchSuggestion[] = [
    ...recentSearches.slice(0, 3).map((s, i) => ({
      id: `recent-${i}`,
      label: s,
      type: 'recent' as const,
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    })),
    ...suggestions,
  ]

  const filteredSuggestions = value
    ? allSuggestions.filter(s =>
      s.label.toLowerCase().includes(value.toLowerCase())
    )
    : allSuggestions

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
    setTimeout(() => setShowDropdown(false), 150)
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative flex items-center transition-all duration-200',
          'bg-background border border-input rounded-lg overflow-hidden',
          'hover:border-muted-foreground/50',
          isFocused && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        <div className="absolute left-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

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
            'w-full py-2.5 pl-10 pr-20 text-sm bg-transparent',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none'
          )}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="absolute right-12 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showShortcut && !isFocused && !value && (
          <div className="absolute right-3 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded">
              ⌘
            </kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded">
              K
            </kbd>
          </div>
        )}
      </div>

      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg',
            'overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          {recentSearches.length > 0 && !value && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">最近の検索</span>
              {onClearRecentSearches && (
                <button
                  onClick={onClearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  クリア
                </button>
              )}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  selectedIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {suggestion.icon || <Search className="h-4 w-4 text-muted-foreground" />}
                <span className="flex-1 text-sm truncate">{suggestion.label}</span>
                {suggestion.type === 'recent' && (
                  <span className="text-xs text-muted-foreground">履歴</span>
                )}
                {suggestion.type === 'quick' && (
                  <span className="text-xs text-primary">クイック</span>
                )}
              </button>
            ))}
          </div>

          {value && (
            <div className="px-4 py-2 bg-muted border-t border-border">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-foreground mr-1">Enter</kbd>
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
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground mr-1">絞り込み:</span>
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
          <span className="text-xs opacity-70">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-2"
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
  size?: 'sm' | 'md'
}

export function FilterChip({
  label,
  count,
  active = false,
  onClick,
  color = 'primary',
  size = 'md',
}: FilterChipProps) {
  const activeColors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/20',
    success: 'bg-green-100 text-green-800 border-green-300 ring-2 ring-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200',
    danger: 'bg-destructive/10 text-destructive border-destructive/30 ring-2 ring-destructive/20',
    neutral: 'bg-muted text-foreground border-border ring-2 ring-border',
  }

  const sizeClasses = {
    sm: 'gap-1 px-2 py-1 text-xs',
    md: 'gap-1.5 px-3 py-1.5 text-sm',
  }

  const countSizeClasses = {
    sm: 'min-w-[1rem] h-4 px-1 text-[10px]',
    md: 'min-w-[1.25rem] h-5 px-1.5 text-xs',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center font-medium',
        sizeClasses[size],
        'border rounded-full transition-all duration-150',
        'hover:scale-105 active:scale-95',
        active
          ? activeColors[color]
          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted'
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'flex items-center justify-center font-semibold rounded-full',
            countSizeClasses[size],
            active ? 'bg-background/50' : 'bg-muted text-muted-foreground'
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
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted border-b border-border"
      >
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">詳細フィルター</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              <label className="block text-sm font-medium text-foreground mb-2">
                {group.label}
              </label>
              {group.type === 'select' && group.options && (
                <Select
                  options={[{ value: '', label: 'すべて' }, ...group.options]}
                  value={values[group.id] as string || ''}
                  onChange={(val) => onChange(group.id, val)}
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
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
            </div>
          ))}

          {onClear && activeCount > 0 && (
            <button
              onClick={onClear}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}
