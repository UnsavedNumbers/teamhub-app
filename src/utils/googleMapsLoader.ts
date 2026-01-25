/**
 * Google Maps Script Loader
 * 
 * Singleton utility to load Google Maps JavaScript API script dynamically.
 * Prevents duplicate script loads and handles race conditions.
 */

let loadPromise: Promise<void> | null = null

/**
 * Load Google Maps JavaScript API script with Places library
 * 
 * Uses singleton pattern to ensure script is only loaded once,
 * even if multiple components request it simultaneously.
 * 
 * @param apiKey - Google Places API key from environment variables
 * @returns Promise that resolves when script is loaded and ready
 * @throws Error if script fails to load
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Check if already loaded
  if (window.google?.maps?.places) {
    return Promise.resolve()
  }

  // If already loading, return existing promise
  if (loadPromise) {
    return loadPromise
  }

  // Validate API key
  if (!apiKey || apiKey.length < 20) {
    const error = new Error('Invalid Google Places API key')
    loadPromise = Promise.reject(error)
    return loadPromise
  }

  // Check if script tag already exists (from previous load attempt)
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
  if (existingScript) {
    // Script tag exists but API not ready yet - poll until ready
    loadPromise = new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('Google Maps API failed to load within timeout'))
      }, 10000)
    })
    return loadPromise
  }

  // Create new script load promise
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      // Verify API is actually available
      if (window.google?.maps?.places) {
        resolve()
      } else {
        reject(new Error('Google Maps API loaded but places library not available'))
      }
    }
    
    script.onerror = () => {
      loadPromise = null // Reset so retry is possible
      reject(new Error('Failed to load Google Maps API script'))
    }
    
    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Check if Google Maps API is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google?.maps?.places)
}

/**
 * Reset the loader state (useful for testing)
 */
export function resetLoader(): void {
  loadPromise = null
}
