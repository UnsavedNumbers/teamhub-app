import { debug } from '../debug'

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

/**
 * Registers the application service worker in production builds.
 * Uses a singleton promise to prevent duplicate registration calls.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (import.meta.env.DEV) return null
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  if (registrationPromise) {
    return registrationPromise
  }

  registrationPromise = navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      debug.data('PWA.registerServiceWorker', 'Service worker registered', {
        scope: registration.scope,
      })
      return registration
    })
    .catch((error: unknown) => {
      debug.error('PWA.registerServiceWorker', 'Service worker registration failed', {
        error,
      })
      return null
    })

  return registrationPromise
}
