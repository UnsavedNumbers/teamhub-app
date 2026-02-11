import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  isWithinGracePeriod,
  isWithinActivePeriod,
  isOnTrial,
  isLicenseActive,
  isTrialExpired,
  isPastGrace,
  getDaysUntil,
  mapPlanToPriceEnvKey,
  formatDate,
} from '@/utils/licenseUtils'
import { createMockLicenseSummary } from '@/test/factories'
import { freezeDate, unfreezeDate } from '@/test/helpers/dateHelpers'

beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
afterEach(unfreezeDate)

describe('isWithinGracePeriod', () => {
  test('returns false for non-past_due', () => {
    expect(isWithinGracePeriod(createMockLicenseSummary({ status: 'active' }))).toBe(false)
  })

  test('returns true when grace in future', () => {
    const s = createMockLicenseSummary({ status: 'past_due', graceEndsAt: '2026-02-15T00:00:00Z' })
    expect(isWithinGracePeriod(s)).toBe(true)
  })

  test('returns false when grace past', () => {
    const s = createMockLicenseSummary({ status: 'past_due', graceEndsAt: '2026-02-01T00:00:00Z' })
    expect(isWithinGracePeriod(s)).toBe(false)
  })
})

describe('isOnTrial', () => {
  test('returns false for non-trial', () => {
    expect(isOnTrial(createMockLicenseSummary({ status: 'active' }))).toBe(false)
  })

  test('returns true when trial end in future', () => {
    const s = createMockLicenseSummary({ status: 'trial', trialEndsAt: '2026-02-15T00:00:00Z' })
    expect(isOnTrial(s)).toBe(true)
  })
})

describe('isTrialExpired', () => {
  test('returns false for non-trial', () => {
    expect(isTrialExpired(createMockLicenseSummary({ status: 'active' }))).toBe(false)
  })

  test('returns true when trial end past', () => {
    const s = createMockLicenseSummary({ status: 'trial', trialEndsAt: '2026-02-01T00:00:00Z' })
    expect(isTrialExpired(s)).toBe(true)
  })
})

describe('isLicenseActive', () => {
  test('returns true for active within period', () => {
    const s = createMockLicenseSummary({ status: 'active', currentPeriodEnd: '2027-01-01T00:00:00Z' })
    expect(isLicenseActive(s)).toBe(true)
  })

  test('returns false for expired', () => {
    const s = createMockLicenseSummary({ status: 'expired', currentPeriodEnd: '2026-01-01T00:00:00Z' })
    expect(isLicenseActive(s)).toBe(false)
  })
})

describe('getDaysUntil', () => {
  test('returns null for null', () => {
    expect(getDaysUntil(null)).toBeNull()
  })

  test('returns positive for future date', () => {
    expect(getDaysUntil('2026-02-15T00:00:00Z')).toBeGreaterThan(0)
  })
})

describe('mapPlanToPriceEnvKey', () => {
  test('maps starter', () => {
    expect(mapPlanToPriceEnvKey('starter')).toBe('STRIPE_PRICE_STARTER_YEAR')
  })

  test('maps standard', () => {
    expect(mapPlanToPriceEnvKey('standard')).toBe('STRIPE_PRICE_STANDARD_YEAR')
  })

  test('maps pro', () => {
    expect(mapPlanToPriceEnvKey('pro')).toBe('STRIPE_PRICE_PRO_YEAR')
  })
})

describe('formatDate', () => {
  test('returns empty for null', () => {
    expect(formatDate(null)).toBe('')
  })

  test('formats valid date', () => {
    expect(formatDate('2026-02-10')).toMatch(/Feb|2/)
  })
})
