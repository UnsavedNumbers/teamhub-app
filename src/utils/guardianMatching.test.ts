import { describe, test, expect } from 'vitest'
import {
  validateGuardianFormData,
  validateGuardians,
  findDuplicateEmails,
  createEmptyGuardian,
  createDefaultGuardians,
} from '@/utils/guardianMatching'

describe('validateGuardianFormData', () => {
  test('returns invalid for empty email', () => {
    const result = validateGuardianFormData({ email: '', relationship_type: 'parent' })
    expect(result.isValid).toBe(false)
  })

  test('returns invalid for invalid email', () => {
    const result = validateGuardianFormData({ email: 'bad', relationship_type: 'parent' })
    expect(result.isValid).toBe(false)
  })

  test('returns valid for correct input', () => {
    const result = validateGuardianFormData({
      email: 'guardian@test.com',
      relationship_type: 'parent',
    })
    expect(result.isValid).toBe(true)
  })
})

describe('validateGuardians', () => {
  test('returns valid for empty array', () => {
    const result = validateGuardians([])
    expect(result.isValid).toBe(true)
  })

  test('returns invalid when some invalid', () => {
    const result = validateGuardians([
      { email: 'ok@test.com', relationship_type: 'parent' },
      { email: '', relationship_type: 'parent' },
    ])
    expect(result.isValid).toBe(false)
  })
})

describe('findDuplicateEmails', () => {
  test('returns empty for no duplicates', () => {
    expect(findDuplicateEmails([{ email: 'a@x.com', relationship_type: 'parent' }, { email: 'b@x.com', relationship_type: 'parent' }])).toEqual([])
  })

  test('returns duplicate indices', () => {
    const result = findDuplicateEmails([
      { email: 'a@x.com', relationship_type: 'parent' },
      { email: 'a@x.com', relationship_type: 'parent' },
      { email: 'b@x.com', relationship_type: 'parent' },
    ])
    expect(result).toContain(0)
    expect(result).toContain(1)
  })
})

describe('createEmptyGuardian', () => {
  test('returns object with expected shape', () => {
    const g = createEmptyGuardian()
    expect(g).toHaveProperty('email')
    expect(g).toHaveProperty('relationship_type')
  })
})

describe('createDefaultGuardians', () => {
  test('returns array with one empty guardian', () => {
    const arr = createDefaultGuardians()
    expect(arr).toHaveLength(1)
    expect(arr[0]).toHaveProperty('email')
  })
})
