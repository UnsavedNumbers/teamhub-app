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
  /** Placeholder time */
  placeholderValue?: TimeValue
}

/**
 * TimePicker - ARIA-compliant time picker using React Aria Components
 * 
 * Features:
 * - Full keyboard navigation (arrows, tab)
 * - Screen reader support with ARIA labels
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
  isDisabled = false,
  isReadOnly = false,
  className = '',
  name,
  placeholderValue = new Time(9, 0),
}: TimePickerProps) {
  const hasError = !!error
  const isRequired = required === true

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
    <div className="pa-form-group">
      <AriaTimeField
        value={timeValue}
        onChange={handleChange}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        name={name}
        className={className}
        hourCycle={12}
        placeholderValue={placeholderValue}
      >
        {label && (
          <Label className={`pa-label ${isRequired ? 'pa-label--required' : ''}`}>
            {label}
          </Label>
        )}
        
        <DateInput className={`pa-timepicker-group ${hasError ? 'pa-timepicker-group--error' : ''}`}>
          {(segment) => (
            <DateSegment
              segment={segment}
              className="pa-timepicker-segment"
            />
          )}
        </DateInput>
      </AriaTimeField>

      {(helper || error) && (
        <div className={`pa-helper ${hasError ? 'pa-helper--error' : ''}`}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default TimePicker
