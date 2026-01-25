import {
  DatePicker as AriaDatePicker,
  Label,
  Group,
  DateInput,
  DateSegment,
  Button,
  Popover,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
} from 'react-aria-components'
import type { DateValue } from 'react-aria-components'
import { parseDate } from '@internationalized/date'

interface DatePickerProps {
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
  /** Minimum date in YYYY-MM-DD format */
  minValue?: string
  /** Maximum date in YYYY-MM-DD format */
  maxValue?: string
  /** Disabled dates */
  isDisabled?: boolean
  /** Read-only mode */
  isReadOnly?: boolean
  /** Additional class name */
  className?: string
  /** Name attribute for forms */
  name?: string
}

/**
 * DatePicker - ARIA-compliant date picker using React Aria Components
 * 
 * Features:
 * - Full keyboard navigation (arrows, enter, escape, tab)
 * - Screen reader support with ARIA labels
 * - Min/max date constraints
 * - Disabled and read-only states
 * - Consistent styling with design system
 */
export function DatePicker({
  label,
  helper,
  error,
  required = false,
  value,
  onChange,
  minValue,
  maxValue,
  isDisabled = false,
  isReadOnly = false,
  className = '',
  name,
}: DatePickerProps) {
  const hasError = !!error
  const isRequired = required === true

  // Convert string dates to DateValue
  const dateValue = value ? parseDate(value) : null
  const minDateValue = minValue ? parseDate(minValue) : undefined
  const maxDateValue = maxValue ? parseDate(maxValue) : undefined

  const handleChange = (date: DateValue | null) => {
    if (onChange) {
      onChange(date ? date.toString() : '')
    }
  }

  return (
    <div className="pa-form-group">
      <AriaDatePicker
        value={dateValue}
        onChange={handleChange}
        minValue={minDateValue}
        maxValue={maxDateValue}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        name={name}
        className={className}
      >
        {label && (
          <Label className={`pa-label ${isRequired ? 'pa-label--required' : ''}`}>
            {label}
          </Label>
        )}
        
        <Group className={`pa-datepicker-group ${hasError ? 'pa-datepicker-group--error' : ''}`}>
          <DateInput className="pa-datepicker-input">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="pa-datepicker-segment"
              />
            )}
          </DateInput>
          <Button className="pa-datepicker-button" aria-label="Open calendar">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              calendar_today
            </span>
          </Button>
        </Group>

        <Popover className="pa-datepicker-popover" placement="bottom start">
          <Dialog className="pa-datepicker-dialog">
            <Calendar className="pa-datepicker-calendar">
              <header className="pa-datepicker-header">
                <Button slot="previous" className="pa-datepicker-nav-button">
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <Heading className="pa-datepicker-heading" />
                <Button slot="next" className="pa-datepicker-nav-button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </header>
              <CalendarGrid className="pa-datepicker-grid">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="pa-datepicker-weekday">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="pa-datepicker-cell"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>

        {(helper || error) && (
          <div className={`pa-helper ${hasError ? 'pa-helper--error' : ''}`}>
            {error || helper}
          </div>
        )}
      </AriaDatePicker>
    </div>
  )
}

export default DatePicker
