
import { useState } from 'react'
import { CalendarFilters, EventType, EVENT_TYPE_LABELS } from '../../types/calendar'
import Card from '../portal/Card'
import Icon from '../portal/Icon'
import { useI18n } from '../../i18n/useI18n'

interface EventFiltersProps {
  filters: CalendarFilters
  onFiltersChange: (filters: CalendarFilters) => void
}

export default function EventFilters({ filters, onFiltersChange }: EventFiltersProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  // Safe translation helper with fallbacks
  const safeT = (key: string, fallback: string = key): string => {
    try {
      return t(key as any) || fallback
    } catch {
      return fallback
    }
  }

  const toggleEventType = (type: EventType) => {
    const current = filters.eventTypes
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    onFiltersChange({ ...filters, eventTypes: next })
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
            <Icon name="filter_list" className="text-slate-400" />
            <span className="font-bold uppercase tracking-wider text-sm text-slate-600 dark:text-slate-300">{safeT('calendar.filters.title', 'Filters')}</span>
            {(filters.eventTypes.length > 0 || filters.showCancelled) && (
                <span className="bg-[var(--org-btn-primary-bg)] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                    {filters.eventTypes.length + (filters.showCancelled ? 1 : 0)}
                </span>
            )}
        </div>
        <Icon name={isOpen ? "expand_less" : "expand_more"} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            
            {/* Event Types */}
            <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{safeT('calendar.filters.allTypes', 'All Event Types')}</div>
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => toggleEventType(type)}
                            className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                                filters.eventTypes.includes(type)
                                    ? 'bg-[var(--org-btn-primary-bg)] text-white border-[var(--org-btn-primary-bg, #137fec)]'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {safeT(`calendar.eventTypes.${type}`, type)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={filters.showCancelled} 
                        onChange={(e) => onFiltersChange({ ...filters, showCancelled: e.target.checked })}
                        className="rounded border-slate-300 text-[var(--org-link-color)] focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{safeT('calendar.filters.showCancelled', 'Show Cancelled Events')}</span>
                 </label>
            </div>

            <div className="pt-2">
                <button 
                    onClick={() => onFiltersChange({ ...filters, eventTypes: [], showCancelled: false })}
                    className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline"
                >
                    {safeT('calendar.filters.clearFilters', 'Clear Filters')}
                </button>
            </div>
        </div>
      )}
    </Card>
  )
}
