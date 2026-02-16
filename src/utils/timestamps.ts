/**
 * Timestamp Parsing and Formatting Utilities
 * 
 * YouTube-style timestamp parsing for video notes, comments, and bookmarks.
 * Supports formats: m:ss, mm:ss, h:mm:ss
 */

export interface ParsedTimestamp {
  startIndex: number
  endIndex: number
  raw: string
  seconds: number
}

export interface TokenizedSegment {
  type: 'text' | 'timestamp'
  value: string
  seconds?: number
}

/**
 * Timestamp regex patterns:
 * - m:ss (e.g., 1:23)
 * - mm:ss (e.g., 12:05)
 * - h:mm:ss (e.g., 1:02:33)
 * 
 * Allows optional surrounding punctuation: (1:23), [1:23], 1:23, 1:23.
 * Rejects invalid times like 99:99 or single-digit seconds without padding (1:2)
 */
const TIMESTAMP_PATTERN = /(?<!\d)(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)(?!\d)/g

/**
 * Check if a string matches a valid timestamp pattern
 */
export function isValidTimestamp(raw: string): boolean {
  const match = raw.match(TIMESTAMP_PATTERN)
  if (!match) return false
  
  const parts = raw.split(':')
  if (parts.length === 2) {
    // m:ss or mm:ss format
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    return minutes >= 0 && seconds >= 0 && seconds < 60
  } else if (parts.length === 3) {
    // h:mm:ss format
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseInt(parts[2], 10)
    return hours >= 0 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60
  }
  return false
}

/**
 * Convert timestamp string to seconds
 * Supports: m:ss, mm:ss, h:mm:ss
 */
export function toSeconds(raw: string): number {
  const cleaned = raw.trim()
  const parts = cleaned.split(':')
  
  if (parts.length === 2) {
    // m:ss or mm:ss format
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    // h:mm:ss format
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseInt(parts[2], 10)
    return hours * 3600 + minutes * 60 + seconds
  }
  
  return 0
}

/**
 * Parse all timestamps from text
 * Returns array of parsed timestamps with positions and converted seconds
 */
export function parseTimestamps(text: string): ParsedTimestamp[] {
  const results: ParsedTimestamp[] = []
  const matches = Array.from(text.matchAll(TIMESTAMP_PATTERN))
  
  for (const match of matches) {
    const raw = match[0]
    // Remove surrounding punctuation for validation
    const cleaned = raw.replace(/^[(\[]|[)\].,;:!?]$/g, '')
    
    if (isValidTimestamp(cleaned)) {
      results.push({
        startIndex: match.index!,
        endIndex: match.index! + raw.length,
        raw: cleaned,
        seconds: toSeconds(cleaned)
      })
    }
  }
  
  return results
}

/**
 * Tokenize text into segments (text or timestamp)
 * Useful for rendering with clickable timestamp links
 */
export function tokenizeWithTimestamps(text: string): TokenizedSegment[] {
  const timestamps = parseTimestamps(text)
  if (timestamps.length === 0) {
    return [{ type: 'text', value: text }]
  }
  
  const segments: TokenizedSegment[] = []
  let lastIndex = 0
  
  for (const ts of timestamps) {
    // Add text before timestamp
    if (ts.startIndex > lastIndex) {
      const textSegment = text.substring(lastIndex, ts.startIndex)
      if (textSegment) {
        segments.push({ type: 'text', value: textSegment })
      }
    }
    
    // Add timestamp segment (include original punctuation)
    const timestampText = text.substring(ts.startIndex, ts.endIndex)
    segments.push({
      type: 'timestamp',
      value: timestampText,
      seconds: ts.seconds
    })
    
    lastIndex = ts.endIndex
  }
  
  // Add remaining text after last timestamp
  if (lastIndex < text.length) {
    const textSegment = text.substring(lastIndex)
    if (textSegment) {
      segments.push({ type: 'text', value: textSegment })
    }
  }
  
  return segments
}

/**
 * Format seconds as timestamp string
 * Returns m:ss or h:mm:ss format (whichever is shorter, unless >= 1 hour)
 */
export function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '--:--'
  }
  
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }
}

/**
 * Format seconds as short timestamp for insertion into text
 * Returns m:ss or h:mm:ss (prefers shorter format)
 */
export function formatTimestampShort(seconds: number): string {
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }
}
