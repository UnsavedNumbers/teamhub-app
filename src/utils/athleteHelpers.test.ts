import { describe, test, expect } from 'vitest'
import {
  getDisplayName,
  getGenderLabel,
  getAthleteInitials,
  calculateAge,
  formatSports,
} from '@/utils/athleteHelpers'

describe('getDisplayName', () => {
  test('returns preferred_name when set', () => {
    expect(getDisplayName({ preferred_name: 'Mike', first_name: 'Michael', last_name: 'Smith' } as never)).toBe('Mike')
  })

  test('returns first last when no preferred_name', () => {
    expect(getDisplayName({ preferred_name: null, first_name: 'Michael', last_name: 'Smith' } as never)).toBe('Michael Smith')
  })

  test('returns first last when preferred_name undefined', () => {
    expect(getDisplayName({ first_name: 'Jane', last_name: 'Doe' } as never)).toBe('Jane Doe')
  })
})

describe('getGenderLabel', () => {
  test('returns capitalized for male', () => {
    expect(getGenderLabel('male')).toBe('Male')
  })

  test('returns Not specified for null', () => {
    expect(getGenderLabel(null)).toBe('Not specified')
  })

  test('returns capitalized for female', () => {
    expect(getGenderLabel('female')).toBe('Female')
  })
})

describe('getAthleteInitials', () => {
  test('returns first and last initial', () => {
    expect(getAthleteInitials('John', 'Doe')).toBe('JD')
  })

  test('handles empty last name', () => {
    expect(getAthleteInitials('John', '')).toBe('J')
  })

  test('returns ? when both empty', () => {
    expect(getAthleteInitials('', '')).toBe('?')
  })
})

describe('calculateAge', () => {
  test('returns null for null birthdate', () => {
    expect(calculateAge(null)).toBe(null)
  })

  test('returns age for valid birthdate', () => {
    const today = new Date()
    const birthYear = today.getFullYear() - 10
    const birthStr = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(calculateAge(birthStr)).toBe(10)
  })
})

describe('formatSports', () => {
  test('returns empty when no sports', () => {
    expect(formatSports()).toEqual({ plays: [], interested: [] })
  })

  test('returns empty when empty array', () => {
    expect(formatSports([])).toEqual({ plays: [], interested: [] })
  })

  test('splits plays and interested', () => {
    const sports = [
      { sport_id: 's1', sport_name: 'Soccer', sport_type: 'plays' as const },
      { sport_id: 's2', sport_name: 'Basketball', sport_type: 'interested' as const },
    ]
    expect(formatSports(sports)).toEqual({ plays: ['Soccer'], interested: ['Basketball'] })
  })
})
