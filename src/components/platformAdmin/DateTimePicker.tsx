import { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils/cn'

interface DateTimePickerProps {
  /** Input label */
  label?: string
  /** Helper text below input */
  helper?: string
  /** Error message */
  error?: string
  /** Show required asterisk */
  required?: boolean
  /** Value in YYYY-MM-DD format */
  value?: string
  /** Callback when date changes */
  onChange?: (value: string) => void
  /** Disabled state */
  isDisabled?: boolean
  /** Read-only mode */
  isReadOnly?: boolean
  /** Additional class name */
  className?: string
  /** Name attribute for forms */
  name?: string
  /** Callback when input is blurred */
  onBlur?: () => void
  /** Minimum date in YYYY-MM-DD format */
  min?: string
  /** Maximum date in YYYY-MM-DD format */
  max?: string
}

/**
 * DateTimePicker - Custom date picker with dropdown calendar
 * 
 * Features:
 * - Dropdown calendar picker
 * - Consistent with TimePicker styling
 * - Disabled and read-only states
 * - Min/max date validation
 */
export function DateTimePicker({
  label,
  helper,
  error,
  required = false,
  value,
  onChange,
  onBlur,
  isDisabled = false,
  isReadOnly = false,
  name,
  min,
  max,
}: DateTimePickerProps) {
  const hasError = !!error
  const isRequired = required === true
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse value or use today
  const parseValue = (val: string | undefined) => {
    const today = new Date()
    const fallback = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    }

    if (!val || !val.includes('-')) return fallback

    const parts = val.split('-').map(Number)
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]

    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return fallback
    }

    return { year, month, day }
  }

  const [selectedDate, setSelectedDate] = useState(parseValue(value))

  // Update selected date when value changes
  useEffect(() => {
    if (value) {
      setSelectedDate(parseValue(value))
    }
  }, [value])

  const formatDisplayValue = () => {
    if (!value) return ''
    try {
      // Parse YYYY-MM-DD format
      const [year, month, day] = value.split('-').map(Number)
      if (!year || !month || !day) return ''
      
      const date = new Date(year, month - 1, day)
      if (isNaN(date.getTime())) return ''
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return ''
    }
  }

  const handleDateSelect = (year: number, month: number, day: number) => {
    if (onChange) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      
      // Check min/max constraints
      if (min && dateStr < min) return
      if (max && dateStr > max) return
      
      onChange(dateStr)
    }
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const newMonth = prev.month === 1 ? 12 : prev.month - 1
      const newYear = prev.month === 1 ? prev.year - 1 : prev.year
      return { ...prev, month: newMonth, year: newYear }
    })
  }

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const newMonth = prev.month === 12 ? 1 : prev.month + 1
      const newYear = prev.month === 12 ? prev.year + 1 : prev.year
      return { ...prev, month: newMonth, year: newYear }
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (onBlur) onBlur()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onBlur])

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(selectedDate.year, selectedDate.month - 1, 1)
    const lastDay = new Date(selectedDate.year, selectedDate.month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: Array<{ day: number; isCurrentMonth: boolean; date: string }> = []

    // Previous month days
    const prevMonthLastDay = new Date(selectedDate.year, selectedDate.month - 1, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevMonth = selectedDate.month === 1 ? 12 : selectedDate.month - 1
      const prevYear = selectedDate.month === 1 ? selectedDate.year - 1 : selectedDate.year
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${(prevMonthLastDay - i).toString().padStart(2, '0')}`
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: `${selectedDate.year}-${selectedDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      })
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length // 6 weeks
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = selectedDate.month === 12 ? 1 : selectedDate.month + 1
      const nextYear = selectedDate.month === 12 ? selectedDate.year + 1 : selectedDate.year
      days.push({
        day,
        isCurrentMonth: false,
        date: `${nextYear}-${nextMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      })
    }

    return days
  }

  const calendarDays = generateCalendarDays()
  const monthName = new Date(selectedDate.year, selectedDate.month - 1).toLocaleDateString('en-US', { month: 'long' })

  const isDateDisabled = (dateStr: string) => {
    if (min && dateStr < min) return true
    if (max && dateStr > max) return true
    return false
  }

  return (
    <div 
      className="pa-form-group oa-form-group" 
      ref={containerRef}
      onBlur={(e) => {
        if (onBlur && !containerRef.current?.contains(e.relatedTarget as Node)) {
          onBlur()
        }
      }}
    >
      {label && (
        <label
          className={cn(
            'pa-label',
            'oa-label',
            isRequired && 'pa-label--required',
            isRequired && 'oa-label--required',
          )}
        >
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => !isDisabled && !isReadOnly && setIsOpen(!isOpen)}
          disabled={isDisabled}
          className={cn(
            'pa-timepicker-button',
            'oa-timepicker-button',
            hasError && 'pa-timepicker-button--error',
            hasError && 'oa-timepicker-button--error',
          )}
        >
          <span className="pa-timepicker-button-text">
            {formatDisplayValue() || 'Select date'}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            calendar_today
          </span>
        </button>

        {isOpen && (
          <div className="pa-datepicker-dropdown oa-datepicker-dropdown">
            {/* Month/Year header */}
            <div className="pa-datepicker-header oa-datepicker-header">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="pa-datepicker-nav oa-datepicker-nav"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  chevron_left
                </span>
              </button>
              <div className="pa-datepicker-month oa-datepicker-month">
                {monthName} {selectedDate.year}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="pa-datepicker-nav oa-datepicker-nav"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  chevron_right
                </span>
              </button>
            </div>

            {/* Days of week */}
            <div className="pa-datepicker-weekdays oa-datepicker-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="pa-datepicker-weekday oa-datepicker-weekday">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="pa-datepicker-days oa-datepicker-days">
              {calendarDays.map((dayInfo, i) => {
                const isSelected = value === dayInfo.date
                const isDisabled = isDateDisabled(dayInfo.date)
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!isDisabled && dayInfo.isCurrentMonth) {
                        handleDateSelect(selectedDate.year, selectedDate.month, dayInfo.day)
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'pa-datepicker-day',
                      'oa-datepicker-day',
                      !dayInfo.isCurrentMonth && 'pa-datepicker-day--other-month',
                      !dayInfo.isCurrentMonth && 'oa-datepicker-day--other-month',
                      isSelected && 'pa-datepicker-day--selected',
                      isSelected && 'oa-datepicker-day--selected',
                      isDisabled && 'pa-datepicker-day--disabled',
                      isDisabled && 'oa-datepicker-day--disabled',
                    )}
                  >
                    {dayInfo.day}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {(helper || error) && (
        <div className={cn('pa-helper oa-helper', hasError && 'pa-helper--error oa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
}
