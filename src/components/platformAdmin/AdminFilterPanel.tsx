import { useState } from 'react'
import { cn } from '../../utils/cn'

export interface FilterItem {
  id: string
  label: string
  count?: number
  icon?: string
  color?: string
}

export interface FilterSectionConfig {
  id: string
  title: string
  items: FilterItem[]
  searchable?: boolean
  multiSelect?: boolean // default true
  layout?: 'list' | 'pills' | 'grid'
}

export interface AdminFilterPanelProps {
  sections: FilterSectionConfig[]
  selectedValues: Record<string, Set<string>>
  onSelectionChange: (sectionId: string, values: Set<string>) => void
  onClearAll: () => void
  resultCount?: number
  searchValue?: string
  onSearchChange?: (value: string) => void
  className?: string
}

export default function AdminFilterPanel({
  sections,
  selectedValues,
  onSelectionChange,
  onClearAll,
  resultCount,
  searchValue,
  onSearchChange,
  className = '',
}: AdminFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})

  const handleSearch = (sectionId: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [sectionId]: query }))
  }

  const handleToggleItem = (sectionId: string, itemId: string) => {
    const currentSet = selectedValues[sectionId] || new Set()
    const nextSet = new Set(currentSet)
    if (nextSet.has(itemId)) nextSet.delete(itemId)
    else nextSet.add(itemId)
    onSelectionChange(sectionId, nextSet)
  }

  const activeCount = Object.values(selectedValues).reduce(
    (acc, set) => acc + (set ? set.size : 0),
    0
  )

  const chipSelectedStyle = {
    background: 'var(--org-btn-primary-bg, #137fec)',
    color: 'var(--org-btn-primary-text, #fff)',
    borderColor: 'var(--org-btn-primary-bg, #137fec)',
  }
  const chipDefaultStyle = {
    background: 'var(--org-surface-primary, #fff)',
    color: 'var(--org-text-secondary, #374151)',
    borderColor: 'var(--org-border-default, #e5e7eb)',
  }

  return (
    <div className={cn('rounded-xl border bg-white shadow-sm dark:bg-slate-800/50 dark:border-slate-700', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
            filter_list
          </span>
          <span className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--org-text-primary, #111)' }}>
            Filters
          </span>
          {activeCount > 0 && (
            <span
              className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}
            >
              {activeCount}
            </span>
          )}
          {resultCount !== undefined && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              {resultCount} results
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search (optional) */}
            {onSearchChange && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>
                  Search
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                  </span>
                  <input
                    type="text"
                    className="w-full h-11 pl-10 pr-3 rounded-lg border bg-transparent text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                    style={{
                      borderColor: 'var(--org-border-default, #e5e7eb)',
                      color: 'var(--org-text-primary)',
                    }}
                    value={searchValue || ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search notifications..."
                  />
                </div>
              </div>
            )}

            {sections.map((section) => {
              const searchQuery = searchQueries[section.id] || ''
              const selection = selectedValues[section.id] || new Set()
              const visibleItems = section.items.filter((item) =>
                !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
              )

              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
                      {section.title}
                    </span>
                    {section.searchable && (
                      <span className="material-symbols-outlined text-slate-300 text-[16px]">search</span>
                    )}
                  </div>

                  {section.searchable && (
                    <div className="relative mb-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(section.id, e.target.value)}
                        placeholder={`Search ${section.title}...`}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border bg-transparent text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        style={{ color: 'var(--org-text-primary)' }}
                      />
                    </div>
                  )}

                  <div className={section.layout === 'list' ? 'flex flex-wrap gap-2 max-h-28 overflow-y-auto' : 'flex flex-wrap gap-2'}>
                    {visibleItems.map((item) => {
                      const isSelected = selection.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleToggleItem(section.id, item.id)}
                          className={cn('px-2.5 py-1.5 rounded text-xs font-bold border transition-colors flex items-center gap-1')}
                          style={isSelected ? chipSelectedStyle : chipDefaultStyle}
                        >
                          {item.label}
                          {item.count !== undefined && (
                            <span
                              className="text-[10px] font-black bg-black/5 rounded-full px-1.5 py-0.5"
                              style={isSelected ? { background: 'rgba(255,255,255,0.18)' } : {}}
                            >
                              {item.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {visibleItems.length === 0 && <span className="text-xs text-slate-400 italic">No items</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {activeCount > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={onClearAll}
                className="text-xs font-bold underline transition-colors hover:opacity-80"
                style={{ color: 'var(--org-status-error-bg, #dc2626)' }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
