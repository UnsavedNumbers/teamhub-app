import { useState, useRef, useEffect } from 'react'

interface TimePickerProps {
  /** Input label */
  label?: string
  /** Value in HH:MM format (24-hour) */
  value?: string
  /** Callback when time changes */
  onChange?: (value: string) => void
  /** Disabled state */
  isDisabled?: boolean
  /** Read-only mode */
  isReadOnly?: boolean
  /** Required field */
  required?: boolean
  /** Additional class name */
  className?: string
  /** Name attribute for forms */
  name?: string
}

/**
 * TimePicker - Custom time picker for Portal pages
 * 
 * Features:
 * - Dropdown with hour/minute/period selectors
 * - 12-hour format with AM/PM
 * - Portal-specific styling
 */
export function PortalTimePicker({
  label,
  value,
  onChange,
  isDisabled = false,
  isReadOnly = false,
  required = false,
  className = '',
  name,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse value to hour, minute, period
  const parseValue = (val: string) => {
    if (!val) return { hour: 9, minute: 0, period: 'AM' }
    const [hours, minutes] = val.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return { hour, minute: minutes || 0, period }
  }

  const { hour, minute, period } = parseValue(value || '')

  const formatDisplayValue = () => {
    if (!value) return ''
    const { hour, minute, period } = parseValue(value)
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`
  }

  const handleTimeChange = (newHour: number, newMinute: number, newPeriod: string) => {
    if (onChange) {
      let hour24 = newHour
      if (newPeriod === 'PM' && newHour !== 12) hour24 = newHour + 12
      if (newPeriod === 'AM' && newHour === 12) hour24 = 0
      onChange(`${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className={`block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !isDisabled && !isReadOnly && setIsOpen(!isOpen)}
          disabled={isDisabled}
          className="flex items-center justify-between w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>{formatDisplayValue() || 'Select time'}</span>
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400" style={{ fontSize: '20px' }}>
            schedule
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 flex">
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                Hour
              </div>
              <div className="max-h-60 overflow-y-auto">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`block w-full px-3 py-2 text-sm text-center transition-colors ${
                      h === hour
                        ? 'bg-blue-500 text-white font-semibold'
                        : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleTimeChange(h, minute, period)}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col border-l border-slate-200 dark:border-slate-700">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                Minute
              </div>
              <div className="max-h-60 overflow-y-auto">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`block w-full px-3 py-2 text-sm text-center transition-colors ${
                      m === minute
                        ? 'bg-blue-500 text-white font-semibold'
                        : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleTimeChange(hour, m, period)}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-[0.6] flex flex-col border-l border-slate-200 dark:border-slate-700">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                Period
              </div>
              <div className="max-h-60 overflow-y-auto">
                {['AM', 'PM'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`block w-full px-3 py-2 text-sm text-center transition-colors ${
                      p === period
                        ? 'bg-blue-500 text-white font-semibold'
                        : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleTimeChange(hour, minute, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <input type="hidden" name={name} value={value || ''} />
    </div>
  )
}

export default PortalTimePicker
