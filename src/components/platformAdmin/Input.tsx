import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string
  /** Helper text below input */
  helper?: string
  /** Error message */
  error?: string
  /** Show required asterisk */
  required?: boolean
  /** Left icon (Material Symbols name) */
  icon?: string
  /** Right icon */
  iconRight?: string
}

/**
 * Input - Nike + Google Design System
 * 
 * Features:
 * - 44px height for comfortable touch targets
 * - 10px radius (Google softness)
 * - Google Blue focus ring
 * - Error states with red border
 * - Optional icons
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helper,
  error,
  required = false,
  icon,
  iconRight,
  className = '',
  ...props
}, ref) => {
  const hasError = !!error
  const isRequired = required === true

  return (
    <div className="pa-form-group">
      {label && (
        <label className={cn('pa-label', isRequired && 'pa-label--required')}>
          {label}
        </label>
      )}
      
      <div className="pa-input-wrapper">
        {icon && (
          <span className="pa-input-icon-left">
            <span className={cn('material-symbols-outlined', 'pa-icon-md')}>
              {icon}
            </span>
          </span>
        )}
        
        <input
          ref={ref}
          className={cn(
            'pa-input',
            hasError && 'pa-input--error',
            icon && 'pa-input--has-icon-left',
            iconRight && 'pa-input--has-icon-right',
            className
          )}
          {...props}
        />
        
        {iconRight && (
          <span className="pa-input-icon-right">
            <span className={cn('material-symbols-outlined', 'pa-icon-md')}>
              {iconRight}
            </span>
          </span>
        )}
      </div>
      
      {(helper || error) && (
        <div className={cn('pa-helper', hasError && 'pa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
