/**
 * Fees Service (placeholder)
 *
 * This file exists to satisfy imports in tests. The real implementation
 * can be added later without changing call sites.
 */

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const feesService = {
  createFee: async (): ServiceResult => ({ data: null, error: null }),
  updateFee: async (): ServiceResult => ({ data: null, error: null }),
  deleteFee: async (): ServiceResult => ({ data: null, error: null }),
  getFees: async (): ServiceResult => ({ data: null, error: null }),
  calculateFeeTotal: async (): ServiceResult => ({ data: null, error: null }),
}
