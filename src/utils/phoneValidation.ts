/**
 * Phone Number Validation Utility
 * 
 * Validates phone numbers with comprehensive edge case handling (Bug 6 prevention)
 */

export interface PhoneValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates phone number format and content
 * 
 * Rules:
 * - Must contain at least 10 digits (after stripping non-digits)
 * - Cannot be all zeros or repeating pattern
 * - Maximum 20 characters total (reasonable limit)
 * - Allows common formatting characters: spaces, dashes, parentheses, plus sign
 * 
 * @param phone - Phone number string to validate
 * @returns Validation result with error message if invalid
 */
export function validatePhoneFormat(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      valid: false,
      error: 'Phone number is required'
    }
  }

  const trimmed = phone.trim()
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Phone number cannot be empty'
    }
  }

  // Check maximum length (Bug 9 prevention)
  if (trimmed.length > 20) {
    return {
      valid: false,
      error: 'Phone number is too long (maximum 20 characters)'
    }
  }

  // Extract digits only
  const digits = trimmed.replace(/\D/g, '')

  // Must have at least 10 digits
  if (digits.length < 10) {
    return {
      valid: false,
      error: 'Phone number must contain at least 10 digits'
    }
  }

  // Check for all zeros or repeating pattern (Bug 6 prevention)
  if (/^0+$/.test(digits)) {
    return {
      valid: false,
      error: 'Phone number cannot be all zeros'
    }
  }

  // Check for repeating pattern (e.g., 111-111-1111, 123-123-1234)
  if (digits.length >= 6) {
    const firstThree = digits.substring(0, 3)
    const middleThree = digits.substring(3, 6)
    if (firstThree === middleThree && digits.length >= 9) {
      const lastThree = digits.substring(6, 9)
      if (firstThree === lastThree) {
        return {
          valid: false,
          error: 'Phone number appears to be invalid (repeating pattern)'
        }
      }
    }
  }

  // Basic format check - allow common formatting characters
  const formatPattern = /^[\d\s\-\+\(\)]+$/
  if (!formatPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Phone number contains invalid characters'
    }
  }

  return {
    valid: true
  }
}

/**
 * Normalizes phone number by removing all non-digit characters
 * Useful for storage or comparison
 * 
 * @param phone - Phone number string
 * @returns Digits only, or empty string if invalid
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }
  return phone.replace(/\D/g, '')
}
