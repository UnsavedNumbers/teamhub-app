/**
 * User-facing strings, error messages, and labels
 */

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  UNAUTHORIZED: 'You must be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'This file type is not supported.',
  MISSING_ORGANIZATION: 'Organization is required',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  INVALID_ROLE: 'Invalid role. Must be parent, coach, or admin',
  NO_ACTIVE_SESSION: 'No active authentication session found',
  SESSION_EXPIRED: 'Authentication session has expired',
  NO_FEES_SELECTED: 'No fees selected',
  INVALID_AMOUNT_CENTS: 'amountCents must be a positive integer',
  MISSING_FEE_ASSIGNMENT_ID: 'feeAssignmentId is required',
  MISSING_SUCCESS_CANCEL_URL: 'successUrl and cancelUrl are required',
  INVALID_API_KEY: 'Invalid Google Places API key',
  STREAM_API_KEY_NOT_SET: 'VITE_STREAM_API_KEY environment variable is not set',
  SLUG_REQUIRED: 'Slug is required and must be non-empty',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  CREATED: 'Created successfully.',
  DELETED: 'Deleted successfully.',
  UPDATED: 'Updated successfully.',
  UPLOADED: 'Upload complete.',
  SENT: 'Sent successfully.',
  FEE_CREATED: 'Fee created successfully',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  PAYMENT_PROCESSED: 'Payment processed successfully',
} as const

// Confirmation messages
export const CONFIRM_MESSAGES = {
  DELETE: 'Are you sure you want to delete this? This action cannot be undone.',
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  BULK_DELETE: (count: number) => `Are you sure you want to delete ${count} items?`,
  LEAVE_TEAM: 'Are you sure you want to leave this team?',
  REMOVE_MEMBER: 'Are you sure you want to remove this member?',
} as const

// Labels
export const LABELS = {
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CREATE: 'Create',
  UPLOAD: 'Upload',
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  NO_RESULTS: 'No results found.',
  SUBMIT: 'Submit',
  CONFIRM: 'Confirm',
  BACK: 'Back',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  VIEW_ALL: 'View All',
  VIEW_LESS: 'View Less',
  SELECT_ALL: 'Select All',
  DESELECT_ALL: 'Deselect All',
} as const

// Billing messages
export const BILLING_MESSAGES = {
  ERROR_LOADING: 'Error loading billing information',
  ERROR_CREATING_SESSION: 'Error creating checkout session',
  ERROR_CREATING_PORTAL: 'Error creating customer portal',
} as const

// Auth messages
export const AUTH_MESSAGES = {
  LOGIN_REQUIRED: 'You must be logged in to access this page',
  SIGNUP_SUCCESS: 'Account created successfully',
  PASSWORD_RESET_SENT: 'Password reset instructions sent to your email',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  EMAIL_VERIFICATION_SENT: 'Verification email sent',
} as const
