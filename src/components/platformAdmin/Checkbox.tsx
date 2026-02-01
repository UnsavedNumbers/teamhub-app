/**
 * Checkbox Component
 * 
 * Platform Admin checkbox with Nike-inspired design system.
 */

import React from 'react'
import { cn } from '../../utils/cn'

export interface CheckboxProps {
  checked: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  disabled?: boolean
  helperText?: string
  className?: string
  indeterminate?: boolean
  style?: React.CSSProperties
}

export function Checkbox({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  helperText,
  className = '',
  indeterminate = false,
  style
}: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Set indeterminate state
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <div className={className} style={style}>
      <label 
        className={cn(
          'pa-checkbox',
          'oa-checkbox',
          disabled && 'pa-checkbox-disabled',
          'pa-inline-flex',
          'pa-items-center',
          'pa-gap-2',
          disabled ? 'pa-cursor-not-allowed' : 'pa-cursor-pointer',
          'pa-select-none'
        )}
      >
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'pa-checkbox-input',
            'oa-checkbox-input',
            disabled ? 'pa-cursor-not-allowed' : 'pa-cursor-pointer'
          )}
        />
        {label && (
          <span 
            className={cn(
              'pa-label',
              'oa-label',
              'pa-font-xs',
              'pa-font-semibold',
              disabled ? 'pa-text-muted' : 'pa-text-primary'
            )}
          >
            {label}
          </span>
        )}
      </label>
      {helperText && (
        <p className={cn('pa-helper-text', 'oa-helper-text', 'pa-mt-1', 'pa-checkbox-helper-offset')}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export default Checkbox
