/**
 * Platform Admin PII Masking
 * 
 * Utilities for masking sensitive data in the platform admin panel.
 * Follows the compliance rules from the platform admin spec:
 * - Parent email: full only for finance_admin/super_admin in Payments context; masked elsewhere
 * - Stripe IDs: always truncated in UI; "copy full" only for finance_admin/super_admin
 */

import type { PlatformAdminRole } from '../types/platformAdmin.types'
import { canPerformAction } from './platformAdminPermissions'

// ============================================================================
// Email Masking
// ============================================================================

/**
 * Mask an email address for display
 * Shows first 2 characters, then ***@domain.***
 * 
 * @param email - Full email address
 * @returns Masked email (e.g., "jo***@gm***.com")
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return '—'

    const [localPart, domain] = email.split('@')
    if (!domain) return '***@***'

    const maskedLocal = localPart.length > 2
        ? localPart.slice(0, 2) + '***'
        : localPart + '***'

    const domainParts = domain.split('.')
    const maskedDomain = domainParts.length > 1
        ? domainParts[0].slice(0, 2) + '***.' + domainParts.slice(1).join('.')
        : domain.slice(0, 2) + '***'

    return `${maskedLocal}@${maskedDomain}`
}

/**
 * Get email for display based on role and context
 * 
 * @param email - Full email address
 * @param role - Platform admin role
 * @param isPaymentsContext - Whether we're in the payments context
 * @returns Full email for authorized roles, masked otherwise
 */
export function getDisplayEmail(
    email: string | null | undefined,
    role: PlatformAdminRole | null | undefined,
    isPaymentsContext = false
): string {
    if (!email) return '—'

    // In payments context, finance_admin and super_admin can see full email
    if (isPaymentsContext && canPerformAction(role, 'view_full_email')) {
        return email
    }

    // Outside payments context, always mask
    return maskEmail(email)
}

/**
 * Check if role can view full email
 * 
 * @param role - Platform admin role
 * @returns true if role can view full email
 */
export function canViewFullEmail(role: PlatformAdminRole | null | undefined): boolean {
    return canPerformAction(role, 'view_full_email')
}

// ============================================================================
// Stripe ID Masking
// ============================================================================

/**
 * Truncate a Stripe ID for display
 * Always shows only the type prefix and last 4 characters
 * 
 * @param stripeId - Full Stripe ID (e.g., "pi_1234567890abcdef")
 * @returns Truncated ID (e.g., "pi_...cdef")
 */
export function truncateStripeId(stripeId: string | null | undefined): string {
    if (!stripeId) return '—'

    // Find the prefix (e.g., "pi_", "cus_", "sub_", "ch_")
    const prefixMatch = stripeId.match(/^[a-z]+_/)
    const prefix = prefixMatch ? prefixMatch[0] : ''

    const lastChars = stripeId.slice(-4)

    return `${prefix}...${lastChars}`
}

/**
 * Get Stripe ID for display - always truncated in UI
 * 
 * @param stripeId - Full Stripe ID
 * @returns Truncated display version
 */
export function getDisplayStripeId(stripeId: string | null | undefined): string {
    return truncateStripeId(stripeId)
}

/**
 * Check if role can copy full Stripe ID
 * 
 * @param role - Platform admin role
 * @returns true if role can copy full Stripe ID
 */
export function canCopyFullStripeId(role: PlatformAdminRole | null | undefined): boolean {
    return canPerformAction(role, 'copy_full_stripe_id')
}

/**
 * Copy Stripe ID to clipboard with role check
 * Only copies full ID for authorized roles; truncated for others
 * 
 * @param stripeId - Full Stripe ID
 * @param role - Platform admin role
 * @returns Promise that resolves when copy is complete
 */
export async function copyStripeIdToClipboard(
    stripeId: string | null | undefined,
    role: PlatformAdminRole | null | undefined
): Promise<{ copied: string; wasTruncated: boolean }> {
    if (!stripeId) {
        return { copied: '', wasTruncated: false }
    }

    const canCopyFull = canCopyFullStripeId(role)
    const valueToCopy = canCopyFull ? stripeId : truncateStripeId(stripeId)

    await navigator.clipboard.writeText(valueToCopy)

    return {
        copied: valueToCopy,
        wasTruncated: !canCopyFull
    }
}

// ============================================================================
// Phone Number Masking
// ============================================================================

/**
 * Mask a phone number for display
 * Shows only last 4 digits
 * 
 * @param phone - Full phone number
 * @returns Masked phone (e.g., "***-***-1234")
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '—'

    // Keep only digits
    const digits = phone.replace(/\D/g, '')

    if (digits.length < 4) return '***'

    const lastFour = digits.slice(-4)
    return `***-***-${lastFour}`
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format cents as currency string
 * 
 * @param cents - Amount in cents
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(
    cents: number | null | undefined,
    currency = 'USD'
): string {
    if (cents === null || cents === undefined) return '$0.00'

    const amount = cents / 100

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount)
}

// ============================================================================
// Audit Log Safe Metadata
// ============================================================================

/**
 * Sanitize metadata for audit logging
 * Removes or masks sensitive fields before storing
 * 
 * @param metadata - Raw metadata object
 * @returns Sanitized metadata safe for audit logging
 */
export function sanitizeMetadataForAudit(
    metadata: Record<string, unknown>
): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'stripe_id']
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase()

        // Check if key contains sensitive terms
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            // Mask sensitive values
            if (typeof value === 'string') {
                sanitized[key] = truncateStripeId(value)
            } else {
                sanitized[key] = '[REDACTED]'
            }
        } else {
            sanitized[key] = value
        }
    }

    return sanitized
}
