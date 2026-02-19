/**
 * TimestampedText Component
 * 
 * Renders text with clickable timestamp links (YouTube-style).
 * Parses timestamps from text and makes them clickable.
 */

import { useMemo } from 'react'
import { tokenizeWithTimestamps } from '@/utils/timestamps'
import { cn } from '@/utils/cn'

interface TimestampedTextProps {
  text: string
  onSeek?: (seconds: number) => void
  className?: string
  /** Custom styling for timestamp links */
  timestampClassName?: string
}

export default function TimestampedText({
  text,
  onSeek,
  className,
  timestampClassName
}: TimestampedTextProps) {
  const segments = useMemo(() => {
    return tokenizeWithTimestamps(text)
  }, [text])

  if (segments.length === 1 && segments[0].type === 'text') {
    // No timestamps found, render plain text
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'timestamp' && segment.seconds !== undefined) {
          const seconds = segment.seconds
          const ariaLabel = formatAriaLabel(seconds)
          
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSeek?.(seconds)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSeek?.(seconds)
                }
              }}
              aria-label={ariaLabel}
              className={cn(
                "text-[var(--org-btn-primary-bg)] hover:underline font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:ring-offset-1 rounded",
                timestampClassName
              )}
            >
              {segment.value}
            </button>
          )
        } else {
          return <span key={index}>{segment.value}</span>
        }
      })}
    </span>
  )
}

/**
 * Format seconds for aria-label (e.g., "Jump to 1 minute 23 seconds")
 */
function formatAriaLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts: string[] = []
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`)
  }
  
  return `Jump to ${parts.join(' ')}`
}
