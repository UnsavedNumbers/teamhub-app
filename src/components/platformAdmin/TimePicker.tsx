import { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils/cn'

interface TimePickerProps {
  /** Input label */
  label?: string
  /** Helper text below input */
  helper?: string
  /** Error message */
  error?: string
  /** Show required asterisk */
  required?: boolean
  /** Value in HH:MM format (24-hour) */
  value?: string
  /** Callback when time changes */
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
}

/**
 * TimePicker - Custom time picker with dropdown
 * 
 * Features:
 * - Dropdown with hour/minute/period selectors
 * - 12-hour format with AM/PM
 * - Disabled and read-only states
 * - Consistent styling with design system
 */
export function TimePicker({
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
}: TimePickerProps) {
  const hasError = !!error
  const isRequired = required === true
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
        if (onBlur) onBlur()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onBlur])

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div 
      className="pa-form-group oa-form-group" 
      ref={containerRef}
      onBlur={(e) => {
        // Trigger onBlur when focus leaves the component
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
            {formatDisplayValue() || 'Select time'}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            schedule
          </span>
        </button>

        {isOpen && (
          <div className="pa-timepicker-dropdown oa-timepicker-dropdown">
            <div className="pa-timepicker-column">
              <div className="pa-timepicker-column-header">Hour</div>
              <div className="pa-timepicker-column-scroll">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={cn(
                      'pa-timepicker-option',
                      'oa-timepicker-option',
                      h === hour && 'pa-timepicker-option--selected',
                      h === hour && 'oa-timepicker-option--selected',
                    )}
                    onClick={() => handleTimeChange(h, minute, period)}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pa-timepicker-column oa-timepicker-column">
              <div className="pa-timepicker-column-header">Minute</div>
              <div className="pa-timepicker-column-scroll">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      'pa-timepicker-option',
                      'oa-timepicker-option',
                      m === minute && 'pa-timepicker-option--selected',
                      m === minute && 'oa-timepicker-option--selected',
                    )}
                    onClick={() => handleTimeChange(hour, m, period)}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pa-timepicker-column pa-timepicker-column--period oa-timepicker-column oa-timepicker-column--period">
              <div className="pa-timepicker-column-header">Period</div>
              <div className="pa-timepicker-column-scroll">
                {['AM', 'PM'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      'pa-timepicker-option',
                      'oa-timepicker-option',
                      p === period && 'pa-timepicker-option--selected',
                      p === period && 'oa-timepicker-option--selected',
                    )}
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

      {(helper || error) && (
        <div
          className={cn(
            'pa-helper',
            'oa-helper',
            hasError && 'pa-helper--error',
            hasError && 'oa-helper--error',
          )}
        >
          {error || helper}
        </div>
      )}
      
      <input type="hidden" name={name} value={value || ''} />
    </div>
  )
}

export default TimePicker
