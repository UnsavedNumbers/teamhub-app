import type { LicenseSummary } from './licenseUtils'
import { isWithinGracePeriod, isTrialExpired, formatDate } from './licenseUtils'
import type { BillingEvent } from '../api/billing'
import { t } from '../i18n'

/**
 * Type guard to check if summary is valid (not null).
 */
export function isValidSummary(summary: LicenseSummary | null): summary is LicenseSummary {
  return summary !== null && summary !== undefined
}

/**
 * Type guard to check if billing event has valid created_at timestamp.
 */
export function isValidBillingEvent(
  event: BillingEvent
): event is BillingEvent & { created_at: string } {
  return event.created_at !== null && event.created_at !== undefined && event.created_at !== ''
}

/**
 * Formats a date with a fallback value if date is null/undefined.
 */
export function formatDateOrFallback(
  date: string | null | undefined,
  fallback: string = 'N/A'
): string {
  if (!date) return fallback
  const formatted = formatDate(date)
  return formatted || fallback
}

/**
 * Gets a date key (YYYY-MM-DD) from a timestamp string for grouping.
 * Throws error if timestamp is invalid.
 */
export function getDateKey(timestamp: string): string {
  if (!timestamp) {
    throw new Error('Invalid timestamp: timestamp is required')
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Groups billing events by date (YYYY-MM-DD).
 * Filters out events with invalid dates before grouping.
 */
export function groupEventsByDate(
  events: BillingEvent[]
): Map<string, BillingEvent[]> {
  const groups = new Map<string, BillingEvent[]>()
  const validEvents = events.filter(isValidBillingEvent)

  for (const event of validEvents) {
    try {
      const dateKey = getDateKey(event.created_at)
      const group = groups.get(dateKey) || []
      group.push(event)
      groups.set(dateKey, group)
    } catch (error) {
      // Skip events with invalid dates
      console.warn('Skipping event with invalid date:', event.id, error)
    }
  }

  return groups
}

/**
 * Checks if grace period should be displayed.
 */
export function shouldShowGracePeriod(summary: LicenseSummary | null): boolean {
  if (!isValidSummary(summary)) return false
  return isWithinGracePeriod(summary)
}

/**
 * Checks if trial end date should be displayed.
 */
export function shouldShowTrialEnd(summary: LicenseSummary | null): boolean {
  if (!isValidSummary(summary)) return false
  if (!summary.trialEndsAt) return false
  
  // Show if trial hasn't expired yet
  return !isTrialExpired(summary)
}

/**
 * Determines if retry button should be shown.
 * Only shows when latest event is a payment failure AND status is past_due.
 */
export function shouldShowRetryButton(
  history: BillingEvent[],
  summary: LicenseSummary | null
): boolean {
  // Guard clause: check array length before accessing
  if (!history || history.length === 0) return false
  if (!isValidSummary(summary)) return false

  // Check if status is past_due
  if (summary.status !== 'past_due') return false

  // Check if latest event is a payment failure
  const latestEvent = history[0]
  if (!latestEvent?.event_type) return false

  const failurePatterns = ['invoice.payment_failed', 'payment_intent.payment_failed']
  return failurePatterns.includes(latestEvent.event_type)
}

/**
 * Gets status message based on license summary.
 * Returns null if no message should be shown.
 */
export function getStatusMessage(summary: LicenseSummary | null): string | null {
  if (!isValidSummary(summary)) return null

  const status = summary.status

  // Active: optional positive message (can be hidden for cleaner UI)
  if (status === 'active') {
    // Return null to hide message for active licenses (cleaner UI)
    // Uncomment below if you want to show positive message:
    // return t('billing.statusMessage.active')
    return null
  }

  // Past due: always show
  if (status === 'past_due') {
    return t('billing.statusMessage.pastDue')
  }

  // Expired: always show
  if (status === 'expired') {
    return t('billing.statusMessage.expired')
  }

  // Trial: show if daysRemaining <= 7 OR trial expired
  if (status === 'trial') {
    const daysRemaining = summary.daysRemaining ?? 0
    const expired = isTrialExpired(summary)

    if (expired) {
      return t('billing.statusMessage.expired')
    }

    if (daysRemaining <= 7) {
      const trialEndDate = formatDateOrFallback(summary.trialEndsAt, 'soon')
      return t('billing.statusMessage.trial', { date: trialEndDate })
    }
  }

  // Canceled: show message
  if (status === 'canceled') {
    const renewalDate = formatDateOrFallback(summary.currentPeriodEnd, 'soon')
    return t('billing.statusMessage.canceled', { date: renewalDate })
  }

  return null
}
