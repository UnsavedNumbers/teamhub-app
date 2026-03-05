/**
 * Data Redaction Utilities
 * 
 * Utilities for redacting sensitive information based on user permissions.
 * Used to hide payment amounts, medical info, and PII from unauthorized users.
 */

import { canViewPaymentAmounts, canViewMedicalInfo, canViewPII, type PermissionContext } from './permissions'

/**
 * Redact payment amount - returns "—" or masked value for unauthorized users
 */
export function redactPaymentAmount(
  context: PermissionContext,
  amount: number | string | null | undefined,
  currencySymbol: string = '$'
): string {
  if (!canViewPaymentAmounts(context)) {
    return '—'
  }

  if (amount === null || amount === undefined) {
    return '—'
  }

  // If already formatted as string, return as-is
  if (typeof amount === 'string') {
    return amount
  }

  // Format number as currency
  return `${currencySymbol}${(amount / 100).toFixed(2)}`
}

/**
 * Redact medical information - returns null or empty string for unauthorized users
 */
export function redactMedicalInfo(
  context: PermissionContext,
  athleteId: string,
  medicalData: string | null | undefined
): string | null {
  if (!canViewMedicalInfo(context, athleteId)) {
    return null
  }

  return medicalData || null
}

/**
 * Redact PII (personally identifiable information) - returns masked value for unauthorized users
 */
export function redactPII(
  context: PermissionContext,
  piiData: string | null | undefined,
  targetUserId?: string
): string {
  if (!canViewPII(context, targetUserId)) {
    if (!piiData) return '—'
    // Mask email addresses
    if (piiData.includes('@')) {
      const [local, domain] = piiData.split('@')
      if (local && domain) {
        const maskedLocal = local.length > 2 
          ? `${local.substring(0, 2)}***` 
          : '***'
        return `${maskedLocal}@${domain}`
      }
    }
    // Mask phone numbers
    if (/^\d+$/.test(piiData.replace(/[^\d]/g, ''))) {
      const digits = piiData.replace(/[^\d]/g, '')
      if (digits.length >= 10) {
        return `***-***-${digits.slice(-4)}`
      }
      return '***-***-****'
    }
    // Mask other PII (addresses, names, etc.)
    if (piiData.length > 4) {
      return `${piiData.substring(0, 2)}***`
    }
    return '***'
  }

  return piiData || '—'
}

/**
 * Redact full address - returns masked value for unauthorized users
 */
export function redactAddress(
  context: PermissionContext,
  address: string | null | undefined
): string {
  if (!canViewPII(context)) {
    return 'Address hidden'
  }

  return address || '—'
}

/**
 * Redact phone number - returns masked value for unauthorized users
 */
export function redactPhone(
  context: PermissionContext,
  phone: string | null | undefined,
  targetUserId?: string
): string {
  if (!canViewPII(context, targetUserId)) {
    if (!phone) return '—'
    const digits = phone.replace(/[^\d]/g, '')
    if (digits.length >= 10) {
      return `***-***-${digits.slice(-4)}`
    }
    return '***-***-****'
  }

  return phone || '—'
}

/**
 * Redact email address - returns masked value for unauthorized users
 */
export function redactEmail(
  context: PermissionContext,
  email: string | null | undefined,
  targetUserId?: string
): string {
  if (!canViewPII(context, targetUserId)) {
    if (!email) return '—'
    const [local, domain] = email.split('@')
    if (local && domain) {
      const maskedLocal = local.length > 2 
        ? `${local.substring(0, 2)}***` 
        : '***'
      return `${maskedLocal}@${domain}`
    }
    return '***@***.***'
  }

  return email || '—'
}
