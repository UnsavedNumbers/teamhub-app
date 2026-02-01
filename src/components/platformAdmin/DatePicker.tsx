import { forwardRef } from 'react'
import { cn } from '../../utils/cn'
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
  /** Accessible name when label is not visible (required if label is omitted) */
  'aria-label'?: string
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
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(({
  label,
  'aria-label': ariaLabel,
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
}, ref) => {
  const hasError = !!error
  const isRequired = required === true
  // Accessible name: visible label, explicit aria-label, or default for screen readers
  const accessibleName = label || ariaLabel || 'Date'

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
    <div ref={ref} className="pa-form-group oa-form-group">
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
        aria-label={!label ? accessibleName : undefined}
      >
        {label && (
          <Label
            className={cn(
              'pa-label',
              'oa-label',
              isRequired && 'pa-label--required',
              isRequired && 'oa-label--required',
            )}
          >
            {label}
          </Label>
        )}
        
        <Group
          className={cn(
            'pa-datepicker-group',
            'oa-datepicker-group',
            hasError && 'pa-datepicker-group--error',
            hasError && 'oa-datepicker-group--error',
          )}
        >
          <DateInput
            className="pa-datepicker-input oa-datepicker-input"
            aria-label={!label ? accessibleName : undefined}
          >
            {(segment) => (
              <DateSegment
                segment={segment}
                className="pa-datepicker-segment oa-datepicker-segment"
              />
            )}
          </DateInput>
          <Button className="pa-datepicker-button oa-datepicker-button" aria-label="Open calendar">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              calendar_today
            </span>
          </Button>
        </Group>

        <Popover className="pa-datepicker-popover oa-datepicker-popover" placement="bottom start">
          <Dialog className="pa-datepicker-dialog oa-datepicker-dialog">
            <Calendar className="pa-datepicker-calendar oa-datepicker-calendar">
              <header className="pa-datepicker-header oa-datepicker-header">
                <Button slot="previous" className="pa-datepicker-nav-button oa-datepicker-nav-button">
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <Heading className="pa-datepicker-heading oa-datepicker-heading" />
                <Button slot="next" className="pa-datepicker-nav-button oa-datepicker-nav-button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </header>
              <CalendarGrid className="pa-datepicker-grid oa-datepicker-grid">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="pa-datepicker-weekday oa-datepicker-weekday">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="pa-datepicker-cell oa-datepicker-cell"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>

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
      </AriaDatePicker>
    </div>
  )
})

DatePicker.displayName = 'DatePicker'

export default DatePicker
