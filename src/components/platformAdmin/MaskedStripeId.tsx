/**
 * MaskedStripeId Component
 * 
 * Displays Stripe IDs with role-based masking and copy functionality.
 * Automatically applies masking based on user's role.
 * 
 * Issue #7 Solution: Stripe ID Masking Consistency - Need to Mask Everywhere
 */

import { useState } from 'react'
import { Button } from './Button'
import { getDisplayStripeId, canCopyFullStripeId, copyStripeIdToClipboard as copyStripeId } from '../../utils/platformAdminMasking'
import { copyToClipboard } from '../../utils/clipboardUtils'
import type { PlatformAdminRole } from '../../types/platformAdmin.types'

interface MaskedStripeIdProps {
  /** Stripe ID to display (may be null/undefined) */
  stripeId: string | null | undefined
  /** Platform admin role for permission checking */
  role: PlatformAdminRole | null | undefined
  /** Show copy button (default: false) */
  showCopy?: boolean
  /** Custom className */
  className?: string
  /** Custom style */
  style?: React.CSSProperties
}

/**
 * Component that displays Stripe ID with automatic role-based masking
 * 
 * @example
 * ```tsx
 * <MaskedStripeId 
 *   stripeId={organization.stripe_customer_id} 
 *   role={adminRole}
 *   showCopy
 * />
 * ```
 */
export function MaskedStripeId({
  stripeId,
  role,
  showCopy = false,
  className = '',
  style,
}: MaskedStripeIdProps) {
  const [copied, setCopied] = useState(false)

  if (!stripeId) {
    return <span className={className} style={style}>—</span>
  }

  const displayId = getDisplayStripeId(stripeId)
  const canCopyFull = canCopyFullStripeId(role)

  const handleCopy = async () => {
    const success = await copyToClipboard(
      stripeId,
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    )
    
    if (!success) {
      // Fallback: try the platform admin masking utility
      await copyStripeId(stripeId, role)
    }
  }

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--pa-space-2)', ...style }}>
      <code
        style={{
          fontSize: '12px',
          background: 'var(--pa-n100)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'monospace',
        }}
      >
        {displayId}
      </code>
      {showCopy && (
        <Button
          variant="ghost"
          size="dense"
          onClick={handleCopy}
          icon={copied ? 'check' : 'content_copy'}
          style={{ minWidth: 'auto', padding: '4px 8px' }}
          title={copied ? 'Copied!' : canCopyFull ? 'Copy full ID' : 'Copy truncated ID'}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      )}
    </span>
  )
}
