/**
 * VideoSortDropdown Component
 * 
 * Advanced sorting dropdown with multiple sort options and direction toggle.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

export type SortField = 
  | 'created_at' 
  | 'title' 
  | 'duration' 
  | 'size' 
  | 'views' 
  | 'comments' 
  | 'bookmarks'

export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  direction: SortDirection
}

interface SortConfig {
  value: SortField
  label: string
  icon: string
  defaultDirection: SortDirection
}

const SORT_OPTIONS: SortConfig[] = [
  { value: 'created_at', label: 'Date Added', icon: 'calendar_today', defaultDirection: 'desc' },
  { value: 'title', label: 'Title', icon: 'sort_by_alpha', defaultDirection: 'asc' },
  { value: 'duration', label: 'Duration', icon: 'timer', defaultDirection: 'desc' },
  { value: 'size', label: 'File Size', icon: 'storage', defaultDirection: 'desc' },
  { value: 'views', label: 'Views', icon: 'visibility', defaultDirection: 'desc' },
  { value: 'comments', label: 'Comments', icon: 'chat_bubble', defaultDirection: 'desc' },
  { value: 'bookmarks', label: 'Favorites', icon: 'bookmark', defaultDirection: 'desc' }
]

interface VideoSortDropdownProps {
  value: SortOption
  onChange: (sort: SortOption) => void
  className?: string
}

export default function VideoSortDropdown({
  value,
  onChange,
  className
}: VideoSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get current sort config
  const currentSort = SORT_OPTIONS.find(opt => opt.value === value.field) || SORT_OPTIONS[0]

  const handleSortSelect = useCallback((option: SortConfig) => {
    // If same field, toggle direction
    if (option.value === value.field) {
      onChange({
        field: option.value,
        direction: value.direction === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // New field, use its default direction
      onChange({
        field: option.value,
        direction: option.defaultDirection
      })
    }
    setIsOpen(false)
  }, [value, onChange])

  const toggleDirection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({
      field: value.field,
      direction: value.direction === 'asc' ? 'desc' : 'asc'
    })
  }, [value, onChange])

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
          isOpen
            ? "border-[var(--org-btn-primary-bg)] ring-2 ring-[var(--org-btn-primary-bg)]/20"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
        )}
      >
        <Icon name={currentSort.icon} size="text-lg" className="text-gray-500" />
        <span className="text-sm font-medium">{currentSort.label}</span>
        <div
          onClick={toggleDirection}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
          title={value.direction === 'asc' ? 'Ascending' : 'Descending'}
        >
          <Icon 
            name={value.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'} 
            size="text-base" 
            className="text-gray-500"
          />
        </div>
        <Icon 
          name={isOpen ? 'expand_less' : 'expand_more'} 
          size="text-lg" 
          className="text-gray-400" 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 overflow-hidden">
          <div className="py-2">
            {SORT_OPTIONS.map(option => {
              const isSelected = value.field === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => handleSortSelect(option)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-[var(--org-btn-primary-bg)]/5 text-[var(--org-btn-primary-bg)]"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={option.icon} size="text-lg" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Icon 
                        name={value.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'} 
                        size="text-sm" 
                      />
                      {value.direction === 'asc' ? 'A-Z' : 'Z-A'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Direction Toggle Footer */}
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Sort Direction</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange({ ...value, direction: 'asc' })
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                    value.direction === 'asc'
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon name="arrow_upward" size="text-sm" className="inline mr-0.5" />
                  Asc
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange({ ...value, direction: 'desc' })
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                    value.direction === 'desc'
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon name="arrow_downward" size="text-sm" className="inline mr-0.5" />
                  Desc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
