import type { SelectHTMLAttributes } from 'react'

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
        <label className={`pa-label ${required ? 'pa-label--required' : ''}`}>
          {label}
        </label>
      )}
      
      <select
        className={`pa-input pa-select ${hasError ? 'pa-input--error' : ''} ${className}`.trim()}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {(helper || error) && (
        <div className={`pa-helper ${hasError ? 'pa-helper--error' : ''}`}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default Select
