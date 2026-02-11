import { describe, test, expect } from 'vitest'
import { STAFF_PERMISSION_LABEL_KEYS, STAFF_PERMISSION_KEYS } from '@/utils/staffPermissions'

describe('STAFF_PERMISSION_KEYS', () => {
  test('contains expected permission keys', () => {
    expect(STAFF_PERMISSION_KEYS).toContain('can_scan_tickets')
    expect(STAFF_PERMISSION_KEYS).toContain('can_manage_events')
    expect(STAFF_PERMISSION_KEYS.length).toBeGreaterThan(0)
  })
})

describe('STAFF_PERMISSION_LABEL_KEYS', () => {
  test('has label key for each permission', () => {
    STAFF_PERMISSION_KEYS.forEach(key => {
      expect(STAFF_PERMISSION_LABEL_KEYS[key]).toBeDefined()
      expect(typeof STAFF_PERMISSION_LABEL_KEYS[key]).toBe('string')
    })
  })
})
