export type LicenseStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
export type LicensePlan = 'starter' | 'standard' | 'pro'

export interface LicenseSummary {
  status: LicenseStatus | null
  plan: LicensePlan | null
  currentPeriodEnd?: string | null
  currentPeriodStart?: string | null
  trialEndsAt?: string | null
  graceEndsAt?: string | null
  cancelAtPeriodEnd?: boolean | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
}

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isWithinGracePeriod(summary: LicenseSummary): boolean {
  if (summary.status !== 'past_due') return false
  const grace = parseDate(summary.graceEndsAt)
  return !!grace && grace.getTime() > Date.now()
}

export function isWithinActivePeriod(summary: LicenseSummary): boolean {
  const end = parseDate(summary.currentPeriodEnd)
  return !!end && end.getTime() > Date.now()
}

export function isOnTrial(summary: LicenseSummary): boolean {
  if (summary.status !== 'trial') return false
  const trialEnd = parseDate(summary.trialEndsAt)
  return !!trialEnd && trialEnd.getTime() > Date.now()
}

export function isLicenseActive(summary: LicenseSummary, options?: { allowGrace?: boolean }): boolean {
  const allowGrace = options?.allowGrace ?? true

  if (isOnTrial(summary)) return true
  if (summary.status === 'active' && isWithinActivePeriod(summary)) return true
  if (allowGrace && isWithinGracePeriod(summary)) return true
  return false
}

export function isLicenseReadOnlyAllowed(summary: LicenseSummary): boolean {
  if (isLicenseActive(summary, { allowGrace: true })) return true

  const canceledOrExpired = summary.status === 'canceled' || summary.status === 'expired'
  if (canceledOrExpired && isWithinActivePeriod(summary)) return true

  return isWithinGracePeriod(summary)
}

export function isPastGrace(summary: LicenseSummary): boolean {
  if (summary.status === 'past_due') {
    const grace = parseDate(summary.graceEndsAt)
    if (!grace) return true
    return grace.getTime() <= Date.now()
  }

  if (summary.status === 'canceled' || summary.status === 'expired') {
    const end = parseDate(summary.currentPeriodEnd)
    if (!end) return true
    return end.getTime() <= Date.now()
  }

  return false
}

export function getDaysUntil(dateValue?: string | null): number | null {
  const date = parseDate(dateValue)
  if (!date) return null
  const diffMs = date.getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / MILLISECONDS_IN_DAY))
}

export function mapPlanToPriceEnvKey(plan: LicensePlan): string {
  switch (plan) {
    case 'starter':
      return 'STRIPE_PRICE_STARTER_YEAR'
    case 'standard':
      return 'STRIPE_PRICE_STANDARD_YEAR'
    case 'pro':
      return 'STRIPE_PRICE_PRO_YEAR'
    default:
      return ''
  }
}

export function formatDate(value?: string | null): string {
  const date = parseDate(value)
  if (!date) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
