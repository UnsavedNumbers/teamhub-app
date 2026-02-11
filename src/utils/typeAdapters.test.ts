import { describe, test, expect } from 'vitest'
import {
  withId,
  withCompositeId,
  mapFeatureFlagOverride,
  mapAdminFeeStatus,
  isRpcSuccessResponse,
  isAdminRpcResponse,
  assertRpcSuccess,
} from '@/utils/typeAdapters'

describe('withId', () => {
  test('adds id from existing field', () => {
    const row = { user_id: 'u-123', name: 'Test' }
    expect(withId(row, 'user_id')).toEqual({ ...row, id: 'u-123' })
  })

  test('throws if idKey is not string', () => {
    expect(() => withId({ num: 123 }, 'num')).toThrow(/Expected num to be a string/)
  })
})

describe('withCompositeId', () => {
  test('joins multiple fields', () => {
    const row = { a: 'x', b: 'y', c: 'z' }
    expect(withCompositeId(row, 'a', 'b', 'c')).toEqual({ ...row, id: 'x:y:z' })
  })

  test('handles null values as empty string', () => {
    const row = { a: 'x', b: null, c: 'z' }
    expect(withCompositeId(row, 'a', 'b', 'c')).toEqual({ ...row, id: 'x::z' })
  })
})

describe('mapFeatureFlagOverride', () => {
  test('creates composite id from feature_flag_id, scope_id, environment', () => {
    const row = {
      feature_flag_id: 'f1',
      scope_id: 's1',
      environment: 'prod',
      enabled: true,
    }
    expect(mapFeatureFlagOverride(row)).toEqual({
      ...row,
      id: 'f1:s1:prod',
    })
  })
})

describe('mapAdminFeeStatus', () => {
  test('adds id from fee_id', () => {
    const row = { fee_id: 'fee-1', amount: 100 }
    expect(mapAdminFeeStatus(row)).toEqual({ ...row, id: 'fee-1' })
  })
})

describe('isRpcSuccessResponse', () => {
  test('returns true for object with success boolean', () => {
    expect(isRpcSuccessResponse({ success: true })).toBe(true)
    expect(isRpcSuccessResponse({ success: false })).toBe(true)
  })

  test('returns false for null', () => {
    expect(isRpcSuccessResponse(null)).toBe(false)
  })

  test('returns false for object without success', () => {
    expect(isRpcSuccessResponse({ foo: 1 })).toBe(false)
  })

  test('returns false for non-object', () => {
    expect(isRpcSuccessResponse('string')).toBe(false)
  })
})

describe('isAdminRpcResponse', () => {
  test('returns true for object with success boolean', () => {
    expect(isAdminRpcResponse({ success: true })).toBe(true)
  })

  test('returns false for null', () => {
    expect(isAdminRpcResponse(null)).toBe(false)
  })
})

describe('assertRpcSuccess', () => {
  test('does not throw for success true', () => {
    expect(() => assertRpcSuccess({ success: true })).not.toThrow()
  })

  test('throws for null', () => {
    expect(() => assertRpcSuccess(null)).toThrow()
  })

  test('throws for success false', () => {
    expect(() => assertRpcSuccess({ success: false, error: 'err' })).toThrow('err')
  })

  test('throws default error when no custom message', () => {
    expect(() => assertRpcSuccess(null, 'Custom')).toThrow('Custom')
  })
})
