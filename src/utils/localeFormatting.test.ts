import { describe, test, expect } from 'vitest'
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
  getDefaultMeasurementSystem,
} from '@/utils/localeFormatting'

describe('cmToFeetInches', () => {
  test('converts 170cm to feet and inches', () => {
    const result = cmToFeetInches(170)
    expect(result.feet).toBe(5)
    expect(result.inches).toBe(7)
  })

  test('handles 0', () => {
    expect(cmToFeetInches(0)).toEqual({ feet: 0, inches: 0 })
  })
})

describe('feetInchesToCm', () => {
  test('converts 5 feet 7 inches', () => {
    expect(feetInchesToCm(5, 7)).toBe(170)
  })
})

describe('kgToLbs', () => {
  test('converts kg to lbs', () => {
    expect(kgToLbs(70)).toBe(154)
  })
})

describe('lbsToKg', () => {
  test('converts lbs to kg', () => {
    expect(lbsToKg(154)).toBe(70)
  })
})

describe('getDefaultMeasurementSystem', () => {
  test('returns imperial for en', () => {
    expect(getDefaultMeasurementSystem('en')).toBe('imperial')
  })

  test('returns metric for es', () => {
    expect(getDefaultMeasurementSystem('es')).toBe('metric')
  })
})
