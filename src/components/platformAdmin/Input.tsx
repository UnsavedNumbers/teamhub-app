import type { InputHTMLAttributes } from 'react'

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
export function Input({
  label,
  helper,
  error,
  required = false,
  icon,
  iconRight,
  className = '',
  ...props
}: InputProps) {
  const hasError = !!error

  return (
    <div className="pa-form-group">
      {label && (
        <label className={`pa-label ${required ? 'pa-label--required' : ''}`}>
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pa-n500)',
              pointerEvents: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {icon}
            </span>
          </span>
        )}
        
        <input
          className={`pa-input ${hasError ? 'pa-input--error' : ''} ${className}`.trim()}
          style={{
            paddingLeft: icon ? '40px' : undefined,
            paddingRight: iconRight ? '40px' : undefined,
          }}
          {...props}
        />
        
        {iconRight && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pa-n500)',
              pointerEvents: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {iconRight}
            </span>
          </span>
        )}
      </div>
      
      {(helper || error) && (
        <div className={`pa-helper ${hasError ? 'pa-helper--error' : ''}`}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default Input
