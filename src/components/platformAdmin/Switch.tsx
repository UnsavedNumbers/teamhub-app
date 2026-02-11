/**
 * Switch Component
 *
 * Platform Admin switch built on existing .pa-toggle styles.
 */

import type React from 'react'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className = '',
  style,
}: SwitchProps) {
  return (
    <div 
      className={className} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 'var(--pa-space-3)',
        ...style 
      }}
    >
      <label className="pa-toggle" style={{ opacity: disabled ? 0.5 : 1 }}>
        <input
          type="checkbox"
          className="pa-toggle-input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <div className="pa-toggle-track" />
        <div className="pa-toggle-thumb" />
      </label>

      {label && (
        <span
          className="pa-body-m"
          style={{
            color: disabled ? 'var(--pa-text-muted)' : undefined,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export default Switch
