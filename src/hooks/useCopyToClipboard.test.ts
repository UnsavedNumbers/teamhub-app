import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyToClipboard } from './useCopyToClipboard'

describe('useCopyToClipboard', () => {
  const mockWriteText = vi.fn()

  beforeEach(() => {
    mockWriteText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('copy returns false for empty string', async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    let success = false
    await act(async () => {
      success = await result.current.copy('')
    })
    expect(success).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  test('copy returns true when clipboard succeeds', async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    let success = false
    await act(async () => {
      success = await result.current.copy('hello')
    })
    expect(success).toBe(true)
    expect(result.current.copied).toBe(true)
  })
})
