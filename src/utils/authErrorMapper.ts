/**
 * Authentication Error Mapper
 * 
 * Maps Supabase authentication error messages to user-friendly, marketing-oriented messages.
 * This ensures all authentication errors are customer-friendly and professional.
 */

import type { TranslationKey } from '../i18n/index'

/**
 * Translation function type
 */
type TranslationFunction = (key: TranslationKey, params?: Record<string, string | number>) => string

/**
 * Maps Supabase auth error messages to user-friendly translations
 * 
 * @param error - Error object from Supabase auth (can be Error, AuthError, or string)
 * @param t - Translation function from useI18n hook
 * @returns User-friendly error message
 */
export function mapAuthError(error: unknown, t: TranslationFunction): string {
  if (!error) {
    return t('errors.auth.default')
  }

  // Handle string errors
  if (typeof error === 'string') {
    return mapErrorMessage(error, t)
  }

  // Handle Error objects
  if (error instanceof Error) {
    return mapErrorMessage(error.message, t)
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: string }).message)
    return mapErrorMessage(message, t)
  }

  // Fallback
  return t('errors.auth.default')
}

/**
 * Maps error message strings to translation keys
 */
function mapErrorMessage(message: string, t: TranslationFunction): string {
  const lowerMessage = message.toLowerCase()

  // Invalid credentials / wrong password
  if (
    lowerMessage.includes('invalid login') ||
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('email or password') ||
    lowerMessage.includes('wrong password') ||
    lowerMessage.includes('incorrect password') ||
    lowerMessage.includes('invalid password')
  ) {
    return t('errors.auth.invalidCredentials')
  }

  // Email not confirmed
  if (
    lowerMessage.includes('email not confirmed') ||
    lowerMessage.includes('email_not_confirmed') ||
    lowerMessage.includes('confirm your email') ||
    lowerMessage.includes('verification') && lowerMessage.includes('email')
  ) {
    return t('errors.auth.emailNotConfirmed')
  }

  // User banned / disabled
  if (
    lowerMessage.includes('user is banned') ||
    lowerMessage.includes('user banned') ||
    lowerMessage.includes('banned_until') ||
    lowerMessage.includes('account disabled') ||
    lowerMessage.includes('account is disabled') ||
    lowerMessage.includes('access restricted')
  ) {
    return t('errors.auth.userBanned')
  }

  // Too many requests / rate limiting
  if (
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too_many_requests') ||
    lowerMessage.includes('too many attempts')
  ) {
    return t('errors.auth.tooManyRequests')
  }

  // Email already registered
  if (
    lowerMessage.includes('user already registered') ||
    lowerMessage.includes('email already registered') ||
    lowerMessage.includes('already registered') ||
    lowerMessage.includes('user already exists') ||
    lowerMessage.includes('email already exists')
  ) {
    return t('errors.auth.emailAlreadyRegistered')
  }

  // Weak password
  if (
    lowerMessage.includes('password should be at least') ||
    lowerMessage.includes('password is too weak') ||
    lowerMessage.includes('weak password') ||
    lowerMessage.includes('password_length')
  ) {
    return t('errors.auth.weakPassword')
  }

  // Invalid email format
  if (
    lowerMessage.includes('invalid email') ||
    lowerMessage.includes('email format') ||
    lowerMessage.includes('valid email')
  ) {
    return t('errors.auth.invalidEmail')
  }

  // Expired token
  if (
    lowerMessage.includes('token expired') ||
    lowerMessage.includes('expired') && (lowerMessage.includes('link') || lowerMessage.includes('token'))
  ) {
    return t('errors.auth.expiredToken')
  }

  // Invalid token
  if (
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('token is invalid') ||
    lowerMessage.includes('invalid link') ||
    lowerMessage.includes('link is invalid')
  ) {
    return t('errors.auth.invalidToken')
  }

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return t('errors.auth.networkError')
  }

  // Session expired
  if (
    lowerMessage.includes('session expired') ||
    lowerMessage.includes('session has expired') ||
    lowerMessage.includes('jwt expired')
  ) {
    return t('errors.auth.sessionExpired')
  }

  // Signup disabled
  if (
    lowerMessage.includes('signup disabled') ||
    lowerMessage.includes('registration disabled') ||
    lowerMessage.includes('signups_disabled')
  ) {
    return t('errors.auth.signupDisabled')
  }

  // Default fallback
  return t('errors.auth.default')
}

/**
 * Hook-friendly version that uses the i18n hook internally
 * Use this in components that already have access to useI18n
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t } = useI18n()
 *   const mapError = useAuthErrorMapper()
 *   
 *   // Use mapError when handling auth errors
 *   const errorMessage = mapError(authError)
 * }
 * ```
 */
export function useAuthErrorMapper(t: TranslationFunction) {
  return (error: unknown) => mapAuthError(error, t)
}
