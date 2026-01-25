import {
  TimeField as AriaTimeField,
  Label,
  DateInput,
  DateSegment,
} from 'react-aria-components'
import type { TimeValue } from 'react-aria-components'
import { parseTime, Time } from '@internationalized/date'

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
  /** Placeholder time */
  placeholderValue?: TimeValue
}

/**
 * TimePicker - ARIA-compliant time picker for Portal pages
 * 
 * Features:
 * - Full keyboard navigation
 * - Screen reader support
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
  placeholderValue = new Time(9, 0),
}: TimePickerProps) {
  // Convert string value to TimeValue
  let timeValue: TimeValue | null = null
  if (value) {
    try {
      timeValue = parseTime(value)
    } catch (_e) {
      console.error('Invalid time format:', value)
    }
  }

  // Handle time change
  const handleChange = (time: TimeValue | null) => {
    if (onChange) {
      if (time) {
        // Convert to HH:MM format
        const hours = time.hour.toString().padStart(2, '0')
        const minutes = time.minute.toString().padStart(2, '0')
        onChange(`${hours}:${minutes}`)
      } else {
        onChange('')
      }
    }
  }

  return (
    <div className={className}>
      <AriaTimeField
        value={timeValue}
        onChange={handleChange}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={required}
        name={name}
        hourCycle={12}
        placeholderValue={placeholderValue}
      >
        {label && (
          <Label className={`block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
            {label}
          </Label>
        )}
        
        <DateInput className="flex items-center gap-2 w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-1 py-0.5 rounded outline-none focus:bg-blue-500 focus:text-white data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500 data-[type=literal]:px-0 text-sm text-slate-900 dark:text-white"
            />
          )}
        </DateInput>
      </AriaTimeField>
    </div>
  )
}

export default PortalTimePicker
