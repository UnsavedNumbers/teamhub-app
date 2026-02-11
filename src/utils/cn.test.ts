import { describe, test, expect } from 'vitest'
import { cn } from '@/utils/cn'

describe('cn', () => {
  test('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })

  test('returns single string as-is', () => {
    expect(cn('foo')).toBe('foo')
  })

  test('joins multiple strings with space', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  test('filters falsy values', () => {
    expect(cn('a', false, 'b', null, 'c', undefined, 'd')).toBe('a b c d')
  })

  test('filters empty string', () => {
    expect(cn('a', '', 'b')).toBe('a b')
  })

  test('filters 0', () => {
    expect(cn('a', 0, 'b')).toBe('a b')
  })

  test('accepts number values', () => {
    expect(cn('text', 42)).toBe('text 42')
  })

  test('object with boolean values returns keys where value is true', () => {
    expect(cn({ active: true, disabled: false })).toBe('active')
  })

  test('object with multiple true values', () => {
    expect(cn({ a: true, b: true, c: false })).toBe('a b')
  })

  test('mixed types', () => {
    expect(cn('base', { active: true, hidden: false }, 'suffix')).toBe('base active suffix')
  })
})
