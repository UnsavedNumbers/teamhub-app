import { t } from '../i18n'

/**
 * Normalizes event type to ensure it's always a string.
 * Returns 'unknown' for null/undefined values.
 */
export function normalizeEventType(eventType: string | null): string {
  if (!eventType || typeof eventType !== 'string') {
    return 'unknown'
  }
  return eventType
}

/**
 * Formats an event type as a fallback when no specific mapping exists.
 * Converts snake_case and dot_case to Title Case.
 * Example: "invoice.payment_failed" → "Invoice Payment Failed"
 */
export function formatEventTypeFallback(eventType: string): string {
  const normalized = normalizeEventType(eventType)
  if (normalized === 'unknown') {
    return 'Unknown Event'
  }

  // Replace dots and underscores with spaces, then title case
  return normalized
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Gets a human-readable label for a Stripe event type.
 * Uses i18n translations with fallback to formatted event type.
 */
export function getEventLabel(eventType: string | null): string {
  const normalized = normalizeEventType(eventType)
  
  // Check if we have a specific mapping first
  if (EVENT_TYPE_MAP[normalized]) {
    // Try to get translation
    const translationKey = `billing.eventLabels.${normalized}` as any
    const translated = t(translationKey)
    
    // If translation exists and is not the key itself, use it
    if (translated && translated !== `billing.eventLabels.${normalized}`) {
      return translated
    }
    
    // Fall back to hardcoded mapping
    return EVENT_TYPE_MAP[normalized]
  }
  
  // For unmapped events, use fallback formatter
  return formatEventTypeFallback(normalized)
}

/**
 * Event type mappings for common Stripe events.
 * These are used as overrides for the fallback formatter.
 */
export const EVENT_TYPE_MAP: Record<string, string> = {
  'checkout.session.completed': 'Subscription Started',
  'invoice.paid': 'Payment Successful',
  'invoice.payment_failed': 'Payment Failed',
  'customer.subscription.updated': 'Subscription Updated',
  'customer.subscription.deleted': 'Subscription Canceled',
  'customer.subscription.created': 'Subscription Created',
  'payment_intent.succeeded': 'Payment Processed',
  'payment_intent.payment_failed': 'Payment Failed',
  'invoice.created': 'Invoice Created',
  'invoice.updated': 'Invoice Updated',
  'customer.updated': 'Customer Updated',
}
