/**
 * Utility functions for screenshot system
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * Ensure directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Sanitize filename by removing/replacing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Redact sensitive values from config when logging
 */
export function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj }
  const sensitiveKeys = ['DEMO_CODE', 'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'AUTH']

  for (const key in redacted) {
    const upperKey = key.toUpperCase()
    if (sensitiveKeys.some((sk) => upperKey.includes(sk))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSecrets(redacted[key] as Record<string, unknown>)
    }
  }

  return redacted
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Slugify a route key or path for use in filenames
 */
export function slugifyRoute(route: string): string {
  return route
    .replace(/\./g, '-')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
