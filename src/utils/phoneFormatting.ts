/**
 * Phone Number Display Formatting Utility
 * 
 * Formats phone numbers for consistent display across the application.
 * Handles null/empty values and common US phone number formats.
 */

/**
 * Formats phone number for display
 * Handles null/empty and common US formats
 * 
 * @param phone - Phone number string (can be null/undefined)
 * @returns Formatted phone number string, or empty string if invalid/null
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone || !phone.trim()) return ''
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  // Format as +X (XXX) XXX-XXXX if 11 digits starting with 1
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  // Return original if can't format (preserves user's input format)
  return phone
}
