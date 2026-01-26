import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label */
  label?: string
  /** Helper text below select */
  helper?: string
  /** Error message */
  error?: string
  /** Show required asterisk */
  required?: boolean
  /** Options */
  options: Array<{ value: string; label: string }>
}

/**
 * Select - Nike + Google Design System
 * 
 * Dropdown select with custom styling
 */
export function Select({
  label,
  helper,
  error,
  required = false,
  options,
  className = '',
  style,
  ...props
}: SelectProps) {
  const hasError = !!error

  return (
    <div className="pa-form-group" style={style}>
      {label && (
        <label className={cn('pa-label', required && 'pa-label--required')}>
          {label}
        </label>
      )}
      
      <select
        className={cn('pa-input', 'pa-select', hasError && 'pa-input--error', className)}
        {...props}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {(helper || error) && (
        <div className={cn('pa-helper', hasError && 'pa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default Select
