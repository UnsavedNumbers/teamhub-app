import { useState, useCallback, useEffect, useRef } from 'react'
import { DatePicker } from './DatePicker'
import { cn } from '../../utils/cn'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  
  // Status filter (optional)
  statusOptions?: FilterOption[]
  statusValue?: string
  onStatusChange?: (value: string) => void
  statusLabel?: string
  
  // Additional filters as chips
  activeFilters?: { key: string; label: string }[]
  onRemoveFilter?: (key: string) => void
  
  // Date range (optional, simplified)
  showDateRange?: boolean
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (value: string) => void
  onDateToChange?: (value: string) => void
  
  // Clear all
  onClearAll?: () => void
  
  // Debounce delay for search
  debounceMs?: number
}

/**
 * FilterBar - Nike + Google Design System
 * 
 * Reusable filter bar for platform admin list pages with:
 * - Debounced search input
 * - Status dropdown
 * - Date range filters
 * - Active filter chips
 * - Clear all button
 */
export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusOptions,
  statusValue = '',
  onStatusChange,
  statusLabel = 'Status',
  activeFilters = [],
  onRemoveFilter,
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateFromChange,
  onDateToChange,
  onClearAll,
  debounceMs = 300,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const normalizedStatusValue = statusValue ?? ''
  
  // Sync local search with prop
  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])
  
  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, debounceMs)
  }, [onSearchChange, debounceMs])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])
  
  const hasActiveFilters = 
    searchValue !== '' || 
    normalizedStatusValue !== '' || 
    activeFilters.length > 0 ||
    dateFrom !== '' ||
    dateTo !== ''

  return (
    <div className="pa-mb-4">
      <div 
        className={cn(
          'pa-flex',
          'pa-flex-col',
          'sm:pa-flex-row',
          'sm:pa-items-end',
          'pa-items-stretch',
          'pa-gap-3',
          'pa-filter-bar'
        )}
      >
        {/* Search Input */}
        <div className="pa-filter-search" style={{ minWidth: '250px', flex: 1, maxWidth: '400px' }}>
          <div className="pa-form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--pa-n500)',
                  pointerEvents: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  search
                </span>
              </span>
              
              <input
                type="text"
                className="pa-input"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  paddingLeft: '40px',
                  paddingRight: localSearch ? '40px' : undefined,
                  width: '100%',
                  height: '44px',
                }}
              />
              
              {localSearch && (
                <button
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--pa-n500)',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--pa-radius-xs)',
                    transition: 'background var(--pa-motion-fast) var(--pa-ease-out)',
                    minWidth: '44px',
                    minHeight: '44px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--pa-n100)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Status Filter */}
        {statusOptions && statusOptions.length > 0 && onStatusChange && (
          <div className="pa-filter-status" style={{ minWidth: '150px' }}>
            <div className="pa-form-group" style={{ marginBottom: 0 }}>
              <select
                className="pa-input pa-select"
                value={normalizedStatusValue}
                onChange={(e) => onStatusChange(e.target.value)}
                aria-label={statusLabel}
                style={{ width: '100%', height: '44px' }}
              >
                <option value="">All {statusLabel}</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* Date Range */}
        {showDateRange && onDateFromChange && onDateToChange && (
          <>
            <div className="pa-filter-date" style={{ width: '150px' }}>
              <div className="pa-form-group" style={{ marginBottom: 0 }}>
                <DatePicker
                  value={dateFrom}
                  onChange={onDateFromChange}
                />
              </div>
            </div>
            <div className="pa-filter-date" style={{ width: '150px' }}>
              <div className="pa-form-group" style={{ marginBottom: 0 }}>
                <DatePicker
                  value={dateTo}
                  onChange={onDateToChange}
                  minValue={dateFrom}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Clear All Button */}
        {hasActiveFilters && onClearAll && (
          <button 
            className="pa-btn pa-btn--ghost pa-btn--compact pa-filter-clear" 
            onClick={onClearAll}
            style={{ minHeight: '44px' }}
          >
            Clear All
          </button>
        )}
      </div>
      
      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className={cn('pa-flex', 'pa-gap-2', 'pa-mt-3', 'pa-flex-wrap')}>
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="pa-badge pa-badge--info"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                paddingRight: onRemoveFilter ? '4px' : undefined,
              }}
            >
              {filter.label}
              {onRemoveFilter && (
                <button
                  onClick={() => onRemoveFilter(filter.key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'inherit',
                    borderRadius: '50%',
                    transition: 'background var(--pa-motion-fast) var(--pa-ease-out)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    close
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
