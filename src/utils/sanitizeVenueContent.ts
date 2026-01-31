/**
 * Venue Content Sanitization
 * 
 * Utilities for sanitizing AI-generated venue content to prevent XSS attacks.
 * Strips all HTML tags and converts markdown to plain text.
 */

/**
 * Sanitize venue content by stripping HTML and converting markdown to plain text
 * 
 * @param content - AI-generated content (may contain markdown or HTML)
 * @returns Sanitized plain text content
 */
export function sanitizeVenueContent(content: string | null): string {
  if (!content) return ''
  
  // Remove any HTML tags (basic sanitization without DOMPurify for now)
  // We'll add DOMPurify as a dependency later if needed
  let sanitized = content
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  // Convert markdown bullets to plain text bullets
  sanitized = sanitized.replace(/^[-*]\s+/gm, '• ')
  
  // Remove any remaining markdown formatting
  sanitized = sanitized
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
  
  // Trim and return
  return sanitized.trim()
}

/**
 * Validate content length to prevent DoS
 * 
 * @param content - Content to validate
 * @param maxLength - Maximum allowed length
 * @returns Validated content (truncated if necessary)
 */
export function validateContentLength(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }
  // Truncate and add ellipsis
  return content.substring(0, maxLength - 3) + '...'
}

/**
 * Sanitize and validate venue summary
 * 
 * @param summary - AI-generated summary
 * @returns Sanitized and validated summary (max 500 chars)
 */
export function sanitizeVenueSummary(summary: string | null): string {
  if (!summary) return ''
  const sanitized = sanitizeVenueContent(summary)
  return validateContentLength(sanitized, 500)
}

/**
 * Sanitize and validate venue tips
 * 
 * @param tips - AI-generated tips
 * @returns Sanitized and validated tips (max 1000 chars)
 */
export function sanitizeVenueTips(tips: string | null): string {
  if (!tips) return ''
  const sanitized = sanitizeVenueContent(tips)
  return validateContentLength(sanitized, 1000)
}
