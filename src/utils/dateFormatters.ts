/**
 * Date Formatting Utilities
 * 
 * Centralized date formatting functions for consistent display across the app.
 * Handles timezone, nulls, and invalid dates safely.
 */

/**
 * Format a date string or Date object for display
 * @param date - Date string (ISO) or Date object
 * @param format - Format style: 'short' (MM/DD/YYYY), 'long' (Month DD, YYYY), 'datetime' (MM/DD/YYYY HH:MM AM/PM)
 * @returns Formatted date string, or '—' if invalid/null
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'datetime' = 'short'
): string {
  if (!date) return '—'

  let dateObj: Date
  if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  // Check if date is valid
  if (Number.isNaN(dateObj.getTime())) {
    return '—'
  }

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })

    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

    default:
      return dateObj.toLocaleDateString('en-US')
  }
}

/**
 * Format a date as relative time (e.g., "2 days ago", "in 3 weeks")
 * @param date - Date string (ISO) or Date object
 * @returns Relative time string, or formatted date if > 30 days
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '—'

  let dateObj: Date
  if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  if (Number.isNaN(dateObj.getTime())) {
    return '—'
  }

  const now = new Date()
  const diffMs = dateObj.getTime() - now.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  }

  if (diffDays === 1) {
    return diffMs > 0 ? 'Tomorrow' : 'Yesterday'
  }

  if (diffDays < 7) {
    return diffMs > 0 ? `In ${diffDays} days` : `${diffDays} days ago`
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return diffMs > 0 ? `In ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }

  // For dates > 30 days, use formatted date
  return formatDate(dateObj, 'short')
}

/**
 * Format a date range (start - end)
 * @param startDate - Start date string or Date
 * @param endDate - End date string or Date
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  const start = formatDate(startDate, 'short')
  const end = formatDate(endDate, 'short')

  if (start === '—' && end === '—') return '—'
  if (start === '—') return `— to ${end}`
  if (end === '—') return `${start} to —`

  return `${start} - ${end}`
}
