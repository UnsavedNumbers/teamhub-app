import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  getStatusVariant,
  formatOrgType,
  formatDate,
  formatCount,
  isInTrial,
  isInGracePeriod,
  getDaysUntilTrialExpires,
} from '@/utils/organizationUtils'
import { freezeDate, unfreezeDate } from '@/test/helpers/dateHelpers'

describe('getStatusVariant', () => {
  test('returns success for active', () => {
    expect(getStatusVariant('active')).toBe('success')
  })

  test('returns info for trial', () => {
    expect(getStatusVariant('trial')).toBe('info')
  })

  test('returns danger for suspended', () => {
    expect(getStatusVariant('suspended')).toBe('danger')
  })

  test('returns warning for expired', () => {
    expect(getStatusVariant('expired')).toBe('warning')
  })

  test('returns neutral for unknown status', () => {
    expect(getStatusVariant('unknown' as never)).toBe('neutral')
  })
})

describe('formatOrgType', () => {
  test('returns type for valid string', () => {
    expect(formatOrgType('youth_club')).toBe('youth_club')
  })

  test('returns em dash for null', () => {
    expect(formatOrgType(null)).toBe('—')
  })

  test('returns em dash for undefined', () => {
    expect(formatOrgType(undefined)).toBe('—')
  })
})

describe('formatDate', () => {
  test('returns formatted date for valid ISO string', () => {
    const result = formatDate('2026-02-10T12:00:00Z')
    expect(result).toMatch(/\d/)
  })

  test('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })
})

describe('formatCount', () => {
  test('returns string for number', () => {
    expect(formatCount(5)).toBe('5')
  })

  test('returns 0 for null', () => {
    expect(formatCount(null)).toBe('0')
  })

  test('returns 0 for undefined', () => {
    expect(formatCount(undefined)).toBe('0')
  })
})

describe('isInTrial', () => {
  beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
  afterEach(unfreezeDate)

  test('returns true when trial ends in future', () => {
    expect(isInTrial('2026-03-01')).toBe(true)
  })

  test('returns false when trial ended', () => {
    expect(isInTrial('2026-01-01')).toBe(false)
  })

  test('returns false for null', () => {
    expect(isInTrial(null)).toBe(false)
  })
})

describe('isInGracePeriod', () => {
  beforeEach(() => freezeDate('2026-02-12T12:00:00Z'))
  afterEach(unfreezeDate)

  test('returns true when within grace period', () => {
    expect(isInGracePeriod('2026-02-10', 7)).toBe(true)
  })

  test('returns false when before trial end', () => {
    expect(isInGracePeriod('2026-02-15', 7)).toBe(false)
  })

  test('returns false when grace period passed', () => {
    expect(isInGracePeriod('2026-02-01', 7)).toBe(false)
  })

  test('returns false for null', () => {
    expect(isInGracePeriod(null)).toBe(false)
  })
})

describe('getDaysUntilTrialExpires', () => {
  beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
  afterEach(unfreezeDate)

  test('returns positive days when in future', () => {
    expect(getDaysUntilTrialExpires('2026-02-15')).toBe(5)
  })

  test('returns negative when expired', () => {
    expect(getDaysUntilTrialExpires('2026-02-05')).toBe(-5)
  })

  test('returns null for null', () => {
    expect(getDaysUntilTrialExpires(null)).toBe(null)
  })
})
