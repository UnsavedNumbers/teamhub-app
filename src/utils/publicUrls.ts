/**
 * Public URL Utilities
 * 
 * Builds org-scoped public URLs consistently across the app.
 * Client-only utility (uses window.location.origin).
 * 
 * @example
 * getPublicBaseUrl('riverside-soccer', 'tickets') 
 * // => 'https://youthsports.team/o/riverside-soccer/tickets'
 * 
 * getPublicBaseUrl('riverside-soccer', '') 
 * // => 'https://youthsports.team/o/riverside-soccer'
 */

/**
 * Builds a public org-scoped URL
 * 
 * @param slug - Organization slug (required, non-empty)
 * @param path - Path segment after /o/{slug}/ (optional, normalized)
 * @returns Full public URL
 * @throws If slug is empty or falsy
 */
export function getPublicBaseUrl(slug: string, path?: string): string {
  if (!slug || slug.trim() === '') {
    throw new Error('Slug is required and must be non-empty')
  }

  const origin = window.location.origin
  
  // Normalize path: strip leading/trailing slashes, avoid double slashes
  if (!path || path.trim() === '') {
    return `${origin}/o/${slug}`
  }

  const normalizedPath = path
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/$/, '') // Remove trailing slash
  
  return `${origin}/o/${slug}/${normalizedPath}`
}
