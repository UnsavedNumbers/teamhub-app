import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helper?: string
  error?: string
  required?: boolean
}

/**
 * DatePicker - Org Admin styled component
 * Uses oa-input class with org theme styling
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({
  label,
  helper,
  error,
  required = false,
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
      
      <input
        ref={ref}
        type="date"
        className={cn('oa-input', hasError && 'oa-input--error', className)}
        {...props}
      />
      
      {(helper || error) && (
        <div className={cn('oa-helper', hasError && 'oa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
})

DatePicker.displayName = 'DatePicker'

export default DatePicker
