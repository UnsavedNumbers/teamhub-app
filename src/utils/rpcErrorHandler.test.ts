import { describe, test, expect } from 'vitest'
import {
  handleRpcError,
  isRetryableError,
  getRpcErrorMessage,
} from '@/utils/rpcErrorHandler'

describe('handleRpcError', () => {
  test('handles RLS error', () => {
    const result = handleRpcError(
      { message: 'row-level security policy', code: '42501' },
      'test_rpc'
    )
    expect(result.message).toContain('Permission denied')
    expect(result.retryable).toBe(false)
    expect(result.code).toBe('PERMISSION_DENIED')
  })

  test('handles network error', () => {
    const result = handleRpcError({ message: 'network timeout' }, 'test_rpc')
    expect(result.message).toContain('Network error')
    expect(result.retryable).toBe(true)
  })

  test('handles constraint violation', () => {
    const result = handleRpcError({ message: 'violates foreign key' }, 'test_rpc')
    expect(result.message).toContain('Invalid data')
    expect(result.retryable).toBe(false)
  })

  test('handles duplicate key', () => {
    const result = handleRpcError({ message: 'duplicate key' }, 'test_rpc')
    expect(result.message).toContain('already exists')
  })

  test('handles Error instance', () => {
    const result = handleRpcError(new Error('custom error'), 'test_rpc')
    expect(result.message).toBe('custom error')
  })

  test('handles string error', () => {
    const result = handleRpcError('string error', 'test_rpc')
    expect(result.message).toBe('string error')
  })

  test('handles unknown type', () => {
    const result = handleRpcError(null, 'test_rpc')
    expect(result.message).toContain('unexpected')
  })
})

describe('isRetryableError', () => {
  test('returns retryable for network error', () => {
    expect(isRetryableError({ message: 'network error' }, 'rpc')).toBe(true)
  })

  test('returns false for RLS error', () => {
    expect(isRetryableError({ message: 'row-level security' }, 'rpc')).toBe(false)
  })
})

describe('getRpcErrorMessage', () => {
  test('returns message from handleRpcError', () => {
    expect(getRpcErrorMessage(new Error('test'), 'rpc')).toBe('test')
  })
})
