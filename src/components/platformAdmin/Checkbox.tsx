/**
 * Checkbox Component
 * 
 * Platform Admin checkbox with Nike-inspired design system.
 */

import React from 'react'

export interface CheckboxProps {
  checked: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  disabled?: boolean
  helperText?: string
  className?: string
}

export function Checkbox({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  helperText,
  className = ''
}: CheckboxProps) {
  return (
    <div className={className}>
      <label 
        className={`pa-checkbox ${disabled ? 'pa-checkbox-disabled' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--pa-space-2)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none'
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '18px',
            height: '18px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            accentColor: 'var(--pa-n900)'
          }}
        />
        {label && (
          <span 
            className="pa-label"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: disabled ? 'var(--pa-text-muted)' : 'var(--pa-text-primary)'
            }}
          >
            {label}
          </span>
        )}
      </label>
      {helperText && (
        <p className="pa-helper-text" style={{ marginTop: 'var(--pa-space-1)', marginLeft: 'calc(18px + var(--pa-space-2))' }}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export default Checkbox
