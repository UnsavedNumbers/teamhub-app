/**
 * Toast Message Utilities
 * 
 * Provides user-friendly, specific toast messages using the translation system.
 * All toast messages should be specific and customer-friendly.
 */

import type { TranslationKey } from '../i18n/index'

/**
 * Get a toast message translation key
 * This is a type-safe way to reference toast message keys
 */
export function getToastKey(category: 'success' | 'error' | 'info', key: string): TranslationKey {
  return `toast.${category}.${key}` as TranslationKey
}

/**
 * Helper to format plural forms in toast messages
 */
export function formatPlural(count: number): string {
  return count === 1 ? '' : 's'
}

/**
 * Helper to format tier plural forms
 */
export function formatTierPlural(count: number): string {
  return count === 1 ? '' : 's'
}

/**
 * Common toast message parameters
 */
export interface ToastParams {
  count?: number
  plural?: string
  action?: string
  status?: string
  roleName?: string
  names?: string
  reason?: string
  type?: string
  tierPlural?: string
  n?: string // For Spanish plural agreement
}

/**
 * Format toast message with parameters
 * This ensures consistent parameter formatting across all toast messages
 */
export function formatToastMessage(
  message: string,
  params?: ToastParams
): string {
  if (!params) return message

  let formatted = message

  // Handle plural forms
  if (params.count !== undefined) {
    const plural = params.plural ?? formatPlural(params.count)
    formatted = formatted.replace(/\{\{plural\}\}/g, plural)
  }

  // Handle tier plural
  if (params.tierPlural !== undefined) {
    formatted = formatted.replace(/\{\{tierPlural\}\}/g, params.tierPlural)
  } else if (params.count !== undefined) {
    formatted = formatted.replace(/\{\{tierPlural\}\}/g, formatTierPlural(params.count))
  }

  // Handle Spanish plural agreement
  if (params.n !== undefined) {
    formatted = formatted.replace(/\{\{n\}\}/g, params.n)
  } else if (params.count !== undefined && params.count === 1) {
    formatted = formatted.replace(/\{\{n\}\}/g, '')
  } else if (params.count !== undefined && params.count !== 1) {
    formatted = formatted.replace(/\{\{n\}\}/g, 'n')
  }

  // Replace other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && typeof value === 'string') {
      formatted = formatted.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    } else if (value !== undefined && typeof value === 'number') {
      formatted = formatted.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    }
  })

  return formatted
}
