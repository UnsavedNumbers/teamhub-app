import { describe, test, expect } from 'vitest'
import {
  getReasonMessage,
  getReasonLabel,
  getTooltipText,
  shouldShowUpgradePrompt,
  isPermanentRestriction,
  getCtaText,
  getReasonIcon,
} from '@/lib/featureGate/reasonMessages'

describe('getReasonMessage', () => {
  test('returns message for known code', () => {
    expect(getReasonMessage('license_tier')).toBe('Upgrade your plan to access this feature')
  })

  test('returns Access denied for unknown', () => {
    expect(getReasonMessage('unknown' as never)).toBe('Access denied')
  })
})

describe('getReasonLabel', () => {
  test('returns short label', () => {
    expect(getReasonLabel('platform_admin')).toBe('Admin')
  })

  test('returns Unknown for unknown', () => {
    expect(getReasonLabel('unknown' as never)).toBe('Unknown')
  })
})

describe('getTooltipText', () => {
  test('returns base when no feature name', () => {
    expect(getTooltipText('role')).toContain('role')
  })

  test('prepends feature name when provided', () => {
    const result = getTooltipText('role', 'Calendar')
    expect(result).toContain('Calendar')
    expect(result).toContain('role')
  })
})

describe('shouldShowUpgradePrompt', () => {
  test('returns true for license_tier', () => {
    expect(shouldShowUpgradePrompt('license_tier')).toBe(true)
  })

  test('returns false for other codes', () => {
    expect(shouldShowUpgradePrompt('role')).toBe(false)
  })
})

describe('isPermanentRestriction', () => {
  test('returns true for platform_admin_only', () => {
    expect(isPermanentRestriction('platform_admin_only')).toBe(true)
  })

  test('returns false for license_tier', () => {
    expect(isPermanentRestriction('license_tier')).toBe(false)
  })
})

describe('getCtaText', () => {
  test('returns Upgrade Plan for license_tier', () => {
    expect(getCtaText('license_tier')).toBe('Upgrade Plan')
  })

  test('returns null for role', () => {
    expect(getCtaText('role')).toBe(null)
  })
})

describe('getReasonIcon', () => {
  test('returns icon for known code', () => {
    expect(getReasonIcon('license_tier')).toBe('workspace_premium')
    expect(getReasonIcon('role')).toBe('admin_panel_settings')
  })

  test('returns lock for unknown', () => {
    expect(getReasonIcon('unknown' as never)).toBe('lock')
  })
})
