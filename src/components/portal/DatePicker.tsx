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
  /** Required field */
  required?: boolean
  /** Additional class name */
  className?: string
  /** Name attribute for forms */
  name?: string
}

/**
 * DatePicker - ARIA-compliant date picker for Portal pages
 * 
 * Features:
 * - Full keyboard navigation
 * - Screen reader support
 * - Min/max date constraints
 * - Portal-specific styling
 */
export function PortalDatePicker({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  isDisabled = false,
  isReadOnly = false,
  required = false,
  className = '',
  name,
}: DatePickerProps) {
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
    <div className={className}>
      <AriaDatePicker
        value={dateValue}
        onChange={handleChange}
        minValue={minDateValue}
        maxValue={maxDateValue}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={required}
        name={name}
      >
        {label && (
          <Label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            {label}{required && ' *'}
          </Label>
        )}
        
        <Group className="flex items-center w-full bg-white dark:bg-black border border-gray-200 dark:border-neutral-700 rounded px-4 py-2 focus-within:border-[var(--org-link-color)] focus-within:ring-2 focus-within:ring-[var(--org-link-color)]/20">
          <DateInput className="flex-1 flex text-sm text-gray-900 dark:text-white">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="px-0.5 rounded outline-none focus:bg-[var(--org-btn-primary-bg)] focus:text-white data-[placeholder]:text-gray-400"
              />
            )}
          </DateInput>
          <Button className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors" aria-label="Open calendar">
            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400" style={{ fontSize: '20px' }}>
              calendar_today
            </span>
          </Button>
        </Group>

        <Popover className="bg-white dark:bg-black border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl mt-2 overflow-hidden entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95" placement="bottom start">
          <Dialog className="p-4 outline-none">
            <Calendar>
              <header className="flex items-center justify-between mb-3">
                <Button slot="previous" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-900">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_left</span>
                </Button>
                <Heading className="text-sm font-semibold text-gray-900 dark:text-white" />
                <Button slot="next" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-900">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">chevron_right</span>
                </Button>
              </header>
              <CalendarGrid className="border-spacing-1">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center p-2">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="w-9 h-9 text-sm text-center rounded cursor-pointer outline-none border-2 border-transparent hover:bg-gray-100 dark:hover:bg-neutral-900 focus:border-[var(--org-btn-primary-bg)] selected:bg-[var(--org-btn-primary-bg)] selected:text-white disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed outside-month:text-gray-400 dark:outside-month:text-gray-600 unavailable:line-through"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </div>
  )
}

export default PortalDatePicker

