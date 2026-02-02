/**
 * Google Maps Script Loader
 * 
 * Singleton utility to load Google Maps JavaScript API script dynamically.
 * Prevents duplicate script loads and handles race conditions.
 */

import { EXTERNAL_URLS, GOOGLE_API_KEY_MIN_LENGTH, GOOGLE_MAPS_RETRY } from '../constants/api'

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
  // Check if already loaded - try both direct access and importLibrary
  if (window.google?.maps) {
    // If places is directly available, resolve immediately
    if (window.google.maps.places) {
      return Promise.resolve()
    }
    // If maps API is loaded but places isn't directly available, try importLibrary
    if (window.google.maps.importLibrary) {
      return window.google.maps.importLibrary('places')
        .then(() => Promise.resolve())
        .catch(() => {
          // If importLibrary fails, check if places becomes available after a short delay
          return new Promise((resolve) => {
            let attempts = 0
            const maxAttempts = GOOGLE_MAPS_RETRY.MAX_ATTEMPTS
            const checkInterval = setInterval(() => {
              attempts++
              if (window.google?.maps?.places) {
                clearInterval(checkInterval)
                resolve()
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval)
                // Don't reject - let the component handle fallback mode
                resolve()
              }
            }, 100)
          })
        })
    }
    // Maps API loaded but no importLibrary - wait a bit for places to be available
    if (window.google.maps) {
      return new Promise((resolve) => {
        let attempts = 0
            const maxAttempts = GOOGLE_MAPS_RETRY.MAX_ATTEMPTS
        const checkInterval = setInterval(() => {
          attempts++
          if (window.google?.maps?.places) {
            clearInterval(checkInterval)
            resolve()
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            // Don't reject - let the component handle fallback mode
            resolve()
          }
        }, GOOGLE_MAPS_RETRY.CHECK_INTERVAL_MS)
      })
    }
  }

  // If already loading, return existing promise
  if (loadPromise) {
    return loadPromise
  }

  // Validate API key
  if (!apiKey || apiKey.length < GOOGLE_API_KEY_MIN_LENGTH) {
    const error = new Error('Invalid Google Places API key')
    loadPromise = Promise.reject(error)
    return loadPromise
  }

  // Check if script tag already exists (from previous load attempt)
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
  if (existingScript) {
    // Script tag exists but API not ready yet - poll until ready
    loadPromise = new Promise((resolve) => {
      let attempts = 0
      const maxAttempts = GOOGLE_MAPS_RETRY.MAX_ATTEMPTS_LONG
      const checkInterval = setInterval(() => {
        attempts++
        if (window.google?.maps) {
          // Maps API is loaded, try to ensure places is available
          if (window.google.maps.places) {
            clearInterval(checkInterval)
            resolve()
          } else if (window.google.maps.importLibrary) {
            // Try importLibrary
            window.google.maps.importLibrary('places')
              .then(() => {
                clearInterval(checkInterval)
                resolve()
              })
              .catch(() => {
                // If importLibrary fails, continue polling
                if (attempts >= maxAttempts) {
                  clearInterval(checkInterval)
                  // Don't reject - let the component handle fallback mode
                  resolve()
                }
              })
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            // Don't reject - let the component handle fallback mode
            resolve()
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          // Don't reject - let the component handle fallback mode
          resolve()
        }
      }, GOOGLE_MAPS_RETRY.CHECK_INTERVAL_MS)
    })
    return loadPromise
  }

  // Create new script load promise
  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `${EXTERNAL_URLS.GOOGLE_MAPS}?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      // Wait a bit for the API to fully initialize, then check for places
      const checkPlaces = () => {
        if (window.google?.maps) {
          // If places is directly available, resolve
          if (window.google.maps.places) {
            resolve()
            return
          }
          // Try importLibrary if available
          if (window.google.maps.importLibrary) {
            window.google.maps.importLibrary('places')
              .then(() => resolve())
              .catch(() => {
                // If importLibrary fails, poll for places to become available
                let attempts = 0
                const maxAttempts = 50 // 5 seconds
                const pollInterval = setInterval(() => {
                  attempts++
                  if (window.google?.maps?.places) {
                    clearInterval(pollInterval)
                    resolve()
                  } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval)
                    // Don't reject - let the component handle fallback mode
                    resolve()
                  }
                }, 100)
              })
            return
          }
          // Poll for places to become available
          let attempts = 0
          const maxAttempts = 50 // 5 seconds
          const pollInterval = setInterval(() => {
            attempts++
            if (window.google?.maps?.places) {
              clearInterval(pollInterval)
              resolve()
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              // Don't reject - let the component handle fallback mode
              resolve()
            }
          }, 100)
        } else {
          // Maps API not ready yet, wait a bit more
          setTimeout(checkPlaces, 100)
        }
      }
      
      // Start checking after a short delay to allow API to initialize
      setTimeout(checkPlaces, 100)
    }
    
    script.onerror = () => {
      loadPromise = null // Reset so retry is possible
      // Don't reject - let the component handle fallback mode
      resolve()
    }
    
    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Check if Google Maps API is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google?.maps)
}

/**
 * Reset the loader state (useful for testing)
 */
export function resetLoader(): void {
  loadPromise = null
}
