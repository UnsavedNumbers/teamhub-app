import { describe, test, expect } from 'vitest'
import {
  sanitizeVenueContent,
  validateContentLength,
  sanitizeVenueSummary,
  sanitizeVenueTips,
} from '@/utils/sanitizeVenueContent'

describe('sanitizeVenueContent', () => {
  test('returns empty for null', () => {
    expect(sanitizeVenueContent(null)).toBe('')
  })

  test('strips HTML tags', () => {
    expect(sanitizeVenueContent('<p>Hello</p>')).toBe('Hello')
  })

  test('decodes HTML entities', () => {
    expect(sanitizeVenueContent('&lt;script&gt;')).toBe('<script>')
  })

  test('converts markdown bullets', () => {
    expect(sanitizeVenueContent('- item')).toBe('• item')
  })

  test('removes bold markdown', () => {
    expect(sanitizeVenueContent('**bold**')).toBe('bold')
  })

  test('removes link markdown', () => {
    expect(sanitizeVenueContent('[text](http://url)')).toBe('text')
  })
})

describe('validateContentLength', () => {
  test('returns content when under limit', () => {
    expect(validateContentLength('short', 100)).toBe('short')
  })

  test('truncates and adds ellipsis when over limit', () => {
    const result = validateContentLength('hello world', 8)
    expect(result).toBe('hello...')
  })
})

describe('sanitizeVenueSummary', () => {
  test('returns empty for null', () => {
    expect(sanitizeVenueSummary(null)).toBe('')
  })

  test('sanitizes and truncates to 500 chars', () => {
    const long = 'x'.repeat(600)
    const result = sanitizeVenueSummary(long)
    expect(result.length).toBe(500)
    expect(result.endsWith('...')).toBe(true)
  })
})

describe('sanitizeVenueTips', () => {
  test('returns empty for null', () => {
    expect(sanitizeVenueTips(null)).toBe('')
  })

  test('sanitizes and truncates to 1000 chars', () => {
    const long = 'x'.repeat(1100)
    const result = sanitizeVenueTips(long)
    expect(result.length).toBe(1000)
  })
})
