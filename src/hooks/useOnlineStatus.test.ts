import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  let originalNavigator: { onLine: boolean }

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator')!.value
    Object.defineProperty(window, 'navigator', {
      value: { ...navigator, onLine: true },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  test('returns navigator.onLine initially', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)
  })
})
