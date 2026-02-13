/**
 * Audio Feedback Utilities
 * 
 * Provides sound feedback for ticket validation results.
 * Preloads sounds for instant playback.
 */

// Preload sounds on module load
const sounds: Record<string, HTMLAudioElement> = {
  success: new Audio('/sounds/scan-success.mp3'),
  error: new Audio('/sounds/scan-error.mp3'),
  duplicate: new Audio('/sounds/scan-duplicate.mp3'),
}

// Preload all sounds
Object.values(sounds).forEach((audio) => {
  // load() is synchronous and doesn't return a Promise
  audio.load()
  audio.volume = 0.5
})

export type SoundType = 'success' | 'error' | 'duplicate'

/**
 * Play a sound effect
 * 
 * @param type - Type of sound to play
 * @returns Promise that resolves when sound starts playing (or fails silently)
 */
export function playSound(type: SoundType): Promise<void> {
  return new Promise((resolve) => {
    try {
      const sound = sounds[type]
      if (!sound) {
        resolve()
        return
      }

      // Reset to start for immediate replay
      sound.currentTime = 0
      sound.play().catch(() => {
        // Autoplay blocked or audio not supported - ignore silently
      })
      resolve()
    } catch {
      // Audio not supported or error - resolve silently
      resolve()
    }
  })
}

/**
 * Prime audio playback from a user gesture so later scan sounds are not blocked.
 */
export function unlockAudio(): void {
  Object.values(sounds).forEach((sound) => {
    const originalVolume = sound.volume
    sound.volume = 0
    sound.currentTime = 0
    void sound.play()
      .then(() => {
        sound.pause()
        sound.currentTime = 0
      })
      .catch(() => {
        // Ignore unlock failures (autoplay policy or unsupported audio)
      })
      .finally(() => {
        sound.volume = originalVolume
      })
  })
}
