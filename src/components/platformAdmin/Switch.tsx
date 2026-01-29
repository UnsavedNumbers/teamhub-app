/**
 * Switch Component
 *
 * Platform Admin switch built on existing .pa-toggle styles.
 */

import type React from 'react'
import { cn } from '../../utils/cn'

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
    <div className={className} style={style}>
      <label
        className={cn(
          'pa-inline-flex',
          'pa-items-center',
          'pa-gap-2',
          disabled ? 'pa-cursor-not-allowed' : 'pa-cursor-pointer',
          'pa-select-none'
        )}
      >
        <span className={cn('pa-toggle', disabled && 'opacity-50')}>
          <input
            type="checkbox"
            className={cn('pa-toggle-input', disabled ? 'pa-cursor-not-allowed' : 'pa-cursor-pointer')}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
          <span className="pa-toggle-track" />
          <span className="pa-toggle-thumb" />
        </span>

        {label && (
          <span
            className={cn(
              'pa-label',
              'pa-font-xs',
              'pa-font-semibold',
              disabled ? 'pa-text-muted' : 'pa-text-primary'
            )}
          >
            {label}
          </span>
        )}
      </label>
    </div>
  )
}

export default Switch
