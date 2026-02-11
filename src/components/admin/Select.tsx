import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helper?: string
  error?: string
  required?: boolean
  options: Array<{ value: string; label: string }>
}

/**
 * Select - Org Admin styled component
 * Uses oa-select class with org theme styling
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  helper,
  error,
  required = false,
  options,
  className = '',
  style,
  ...props
}, ref) => {
  const hasError = !!error

  return (
    <div className="oa-form-group" style={style}>
      {label && (
        <label className={cn('oa-label', required && 'oa-label--required')}>
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        className={cn('oa-select', hasError && 'oa-input--error', className)}
        {...props}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {(helper || error) && (
        <div className={cn('oa-helper', hasError && 'oa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
