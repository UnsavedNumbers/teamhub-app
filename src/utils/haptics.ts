/**
 * Haptic Feedback Utilities
 * 
 * Provides vibration feedback for ticket validation results.
 * Gracefully degrades on devices without vibration support.
 */

export type HapticType = 'success' | 'error' | 'warning'

const patterns: Record<HapticType, number[]> = {
  success: [100],           // Short single vibration
  error: [100, 50, 100],    // Two quick vibrations
  warning: [200],            // Longer single vibration
}

/**
 * Trigger haptic feedback
 * 
 * @param type - Type of haptic feedback to trigger
 * @returns void (always succeeds, fails silently if not supported)
 */
export function triggerHaptic(type: HapticType): void {
  if (!navigator.vibrate) {
    return
  }

  try {
    navigator.vibrate(patterns[type])
  } catch {
    // Vibration not supported or error - ignore silently
  }
}
