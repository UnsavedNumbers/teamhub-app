import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  isValidSummary,
  isValidBillingEvent,
  formatDateOrFallback,
  getDateKey,
  groupEventsByDate,
  shouldShowGracePeriod,
  shouldShowTrialEnd,
  shouldShowRetryButton,
  getStatusMessage,
} from '@/utils/billingHelpers'
import { createMockLicenseSummary } from '@/test/factories'
import { freezeDate, unfreezeDate } from '@/test/helpers/dateHelpers'

beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
afterEach(unfreezeDate)

describe('isValidSummary', () => {
  test('returns false for null', () => {
    expect(isValidSummary(null)).toBe(false)
  })

  test('returns true for valid summary', () => {
    expect(isValidSummary(createMockLicenseSummary())).toBe(true)
  })
})

describe('isValidBillingEvent', () => {
  test('returns false when created_at is null', () => {
    expect(isValidBillingEvent({ id: '1', created_at: null } as never)).toBe(false)
  })

  test('returns true when created_at is present', () => {
    expect(isValidBillingEvent({ id: '1', created_at: '2026-02-10T12:00:00Z' } as never)).toBe(true)
  })
})

describe('formatDateOrFallback', () => {
  test('returns fallback for null', () => {
    expect(formatDateOrFallback(null)).toBe('N/A')
  })

  test('returns custom fallback', () => {
    expect(formatDateOrFallback(null, '—')).toBe('—')
  })

  test('formats valid date', () => {
    const result = formatDateOrFallback('2026-02-10')
    expect(result).toMatch(/Feb|2/)
  })
})

describe('getDateKey', () => {
  test('throws for empty string', () => {
    expect(() => getDateKey('')).toThrow()
  })

  test('throws for invalid date', () => {
    expect(() => getDateKey('invalid')).toThrow()
  })

  test('returns YYYY-MM-DD for valid timestamp', () => {
    expect(getDateKey('2026-02-10T12:00:00Z')).toBe('2026-02-10')
  })
})

describe('groupEventsByDate', () => {
  test('returns empty map for empty array', () => {
    expect(groupEventsByDate([]).size).toBe(0)
  })

  test('groups events by date', () => {
    const events = [
      { id: '1', created_at: '2026-02-10T10:00:00Z' },
      { id: '2', created_at: '2026-02-10T14:00:00Z' },
      { id: '3', created_at: '2026-02-11T10:00:00Z' },
    ] as never[]
    const groups = groupEventsByDate(events)
    expect(groups.get('2026-02-10')).toHaveLength(2)
    expect(groups.get('2026-02-11')).toHaveLength(1)
  })
})

describe('shouldShowGracePeriod', () => {
  test('returns false for null summary', () => {
    expect(shouldShowGracePeriod(null)).toBe(false)
  })

  test('returns true when in grace period', () => {
    const summary = createMockLicenseSummary({
      status: 'past_due',
      graceEndsAt: '2026-02-15T00:00:00Z',
    })
    expect(shouldShowGracePeriod(summary)).toBe(true)
  })
})

describe('shouldShowTrialEnd', () => {
  test('returns false for null summary', () => {
    expect(shouldShowTrialEnd(null)).toBe(false)
  })

  test('returns false when no trialEndsAt', () => {
    expect(shouldShowTrialEnd(createMockLicenseSummary({ trialEndsAt: null }))).toBe(false)
  })
})

describe('shouldShowRetryButton', () => {
  test('returns false for empty history', () => {
    expect(shouldShowRetryButton([], createMockLicenseSummary())).toBe(false)
  })

  test('returns false when status not past_due', () => {
    const summary = createMockLicenseSummary({ status: 'active' })
    expect(shouldShowRetryButton([{ event_type: 'invoice.payment_failed' }] as never[], summary)).toBe(false)
  })
})

describe('getStatusMessage', () => {
  test('returns null for null summary', () => {
    expect(getStatusMessage(null)).toBeNull()
  })

  test('returns null for active status', () => {
    expect(getStatusMessage(createMockLicenseSummary({ status: 'active' }))).toBeNull()
  })

  test('returns message for past_due', () => {
    expect(getStatusMessage(createMockLicenseSummary({ status: 'past_due' }))).toBeTruthy()
  })

  test('returns message for expired', () => {
    expect(getStatusMessage(createMockLicenseSummary({ status: 'expired' }))).toBeTruthy()
  })
})
