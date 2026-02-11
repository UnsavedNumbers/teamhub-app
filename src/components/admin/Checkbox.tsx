import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helper?: string
  error?: string
}

/**
 * Checkbox - Org Admin styled component
 * Uses oa-checkbox class with org theme styling
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  helper,
  error,
  className = '',
  style,
  ...props
}, ref) => {
  const hasError = !!error

  return (
    <div className="oa-checkbox-wrapper" style={style}>
      <label className={cn('oa-checkbox', className)}>
        <input
          ref={ref}
          type="checkbox"
          className="oa-checkbox-input"
          {...props}
        />
        {label && <span className="oa-checkbox-label">{label}</span>}
      </label>
      {(helper || error) && (
        <div className={cn('oa-helper', hasError && 'oa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox
