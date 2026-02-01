/**
 * Formatter Utilities
 * 
 * Common formatting functions for dates, numbers, durations, etc.
 */

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00'
  
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Format a date to relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}m ago`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h ago`
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400)
    return `${days}d ago`
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800)
    return `${weeks}w ago`
  }
  
  return then.toLocaleDateString()
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}
