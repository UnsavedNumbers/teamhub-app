/**
 * Auth Images Utility
 * 
 * This utility manages images for the login and signup pages.
 * Images should be placed in /public/images/auth/
 * 
 * To add new images:
 * 1. Add your image file (png, jpg, jpeg, or webp) to /public/images/auth/
 * 2. Add the filename to the AUTH_IMAGE_FILES array below
 * 
 * The images will be randomly selected on each page load.
 */

// List of image filenames in /public/images/auth/
// Add new image filenames here as you add them to the folder
export const AUTH_IMAGE_FILES: string[] = [
  'splash-baseball.png',
  'splash-basketball.png',
  'splash-flagfootball.png',
  'splash-soccer.png',
  'splash-trackandfield.png',
  'splash-volleyball.png',
]

// Build full paths to auth images
export const AUTH_HERO_IMAGES = AUTH_IMAGE_FILES.map(filename => `/images/auth/${filename}`)

/**
 * Fixed page-to-image mapping for auth and onboarding screens.
 * Uses named local files from /public/images/auth/.
 */
export const AUTH_PAGE_HERO_IMAGES = {
  login: '/images/auth/splash-soccer.png',
  signup: '/images/auth/splash-basketball.png',
  forgotPassword: '/images/auth/splash-trackandfield.png',
  confirmEmail: '/images/auth/splash-volleyball.png',
  organizationOnboarding: '/images/auth/splash-flagfootball.png',
} as const

/**
 * Get a random auth hero image
 * Returns a random image path, or empty string if no images available
 */
export function getRandomAuthImage(): string {
  if (AUTH_HERO_IMAGES.length === 0) {
    return ''
  }
  return AUTH_HERO_IMAGES[Math.floor(Math.random() * AUTH_HERO_IMAGES.length)]
}
