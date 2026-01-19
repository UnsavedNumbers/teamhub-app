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
  // Add your image filenames here, e.g.:
  // 'hero-1.webp',
  // 'background.jpg',
  // 'sports-field.png',
]

// Build full paths to auth images
export const AUTH_HERO_IMAGES = AUTH_IMAGE_FILES.map(filename => `/images/auth/${filename}`)

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
