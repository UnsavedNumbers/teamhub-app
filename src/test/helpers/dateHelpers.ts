import { vi } from 'vitest'

/**
 * Freeze system time for deterministic date-dependent tests.
 * Call in beforeEach; pair with unfreezeDate in afterEach.
 */
export function freezeDate(isoString: string): void {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoString))
}

/**
 * Restore real timers after freezeDate.
 * Call in afterEach.
 */
export function unfreezeDate(): void {
  vi.useRealTimers()
}
