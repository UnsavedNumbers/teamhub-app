/**
 * Games Service (placeholder)
 *
 * Stub implementation used for test imports. Replace with real logic as needed.
 */

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const gamesService = {
  createGame: async (): ServiceResult => ({ data: null, error: null }),
  updateGame: async (): ServiceResult => ({ data: null, error: null }),
  recordScore: async (): ServiceResult => ({ data: null, error: null }),
  getGameStats: async (): ServiceResult => ({ data: null, error: null }),
  scheduleGame: async (): ServiceResult => ({ data: null, error: null }),
}
