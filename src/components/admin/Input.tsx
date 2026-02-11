import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
  required?: boolean
}

/**
 * Input - Org Admin styled component
 * Uses oa-input class with org theme styling
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
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

Input.displayName = 'Input'

export default Input
