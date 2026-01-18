/**
 * Type Adapters
 * 
 * Utility functions to transform database rows to UI types,
 * adding required fields like `id` and validating structure.
 */

/**
 * Add an `id` field to a row by mapping from an existing field
 */
export function withId<T extends Record<string, unknown>>(
  row: T,
  idKey: keyof T
): T & { id: string } {
  const idValue = row[idKey]
  if (typeof idValue !== 'string') {
    throw new Error(`Expected ${String(idKey)} to be a string, got ${typeof idValue}`)
  }
  return { ...row, id: idValue }
}

/**
 * Generate a composite ID from multiple fields
 */
export function withCompositeId<T extends Record<string, unknown>>(
  row: T,
  ...keys: (keyof T)[]
): T & { id: string } {
  const parts = keys.map(key => {
    const value = row[key]
    return value != null ? String(value) : ''
  })
  return { ...row, id: parts.join(':') }
}

/**
 * Map feature flag override row to include id
 */
export function mapFeatureFlagOverride<T extends {
  feature_flag_id: string
  scope_id: string
  environment: string
  [key: string]: unknown
}>(row: T): T & { id: string } {
  // Use composite key: feature_flag_id:scope_id:environment
  return withCompositeId(row, 'feature_flag_id', 'scope_id', 'environment')
}

/**
 * Map admin fee status row to include id
 */
export function mapAdminFeeStatus<T extends {
  fee_id: string
  [key: string]: unknown
}>(row: T): T & { id: string } {
  return withId(row, 'fee_id')
}

/**
 * Type guard to check if RPC response is successful
 */
export function isRpcSuccessResponse(data: unknown): data is { success: boolean; error?: string; action?: string; flag_id?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as { success: unknown }).success === 'boolean'
  )
}

/**
 * Validate and extract RPC response, throwing if unsuccessful
 */
export function assertRpcSuccess<T extends { success: boolean; error?: string }>(
  data: T | null | undefined,
  defaultError = 'Unknown error'
): asserts data is T & { success: true } {
  if (!data) {
    throw new Error(defaultError)
  }
  if (!data.success) {
    throw new Error(data.error || defaultError)
  }
}
