/**
 * Registration Service (placeholder)
 *
 * Stub implementation used for test imports. Replace with real logic as needed.
 */

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const registrationService = {
  registerForEvent: async (): ServiceResult => ({ data: null, error: null }),
  unregisterFromEvent: async (): ServiceResult => ({ data: null, error: null }),
  getRegistrations: async (): ServiceResult => ({ data: null, error: null }),
  checkCapacity: async (): ServiceResult => ({ data: null, error: null }),
  waitlistUser: async (): ServiceResult => ({ data: null, error: null }),
}
