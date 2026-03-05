export interface CalendarExportEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string | null
  description?: string | null
  url?: string | null
}

export interface CalendarExportLinks {
  googleUrl: string | null
  icsUrl: string | null
  filename: string
}

function toDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatUtcForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function sanitizeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldIcsLine(line: string): string {
  const maxLength = 74
  if (line.length <= maxLength) {
    return line
  }

  const chunks: string[] = []
  for (let index = 0; index < line.length; index += maxLength) {
    const chunk = line.slice(index, index + maxLength)
    chunks.push(index === 0 ? chunk : ` ${chunk}`)
  }
  return chunks.join('\r\n')
}

export function isCalendarExportEventValid(event: CalendarExportEvent): boolean {
  if (!event.title.trim()) return false

  const start = toDate(event.startTime)
  const end = toDate(event.endTime)

  return Boolean(start && end && end.getTime() >= start.getTime())
}

export function sanitizeCalendarFilename(title: string, fallback: string = 'calendar-event'): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized.length > 0 ? normalized : fallback
}

export function buildGoogleCalendarUrl(event: CalendarExportEvent): string | null {
  if (!isCalendarExportEventValid(event)) {
    return null
  }

  const start = toDate(event.startTime)
  const end = toDate(event.endTime)

  if (!start || !end) {
    return null
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatUtcForCalendar(start)}/${formatUtcForCalendar(end)}`,
  })

  if (event.description?.trim()) {
    params.set('details', event.description.trim())
  }

  if (event.location?.trim()) {
    params.set('location', event.location.trim())
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildIcsContent(events: CalendarExportEvent[]): string | null {
  if (events.length === 0 || events.some((event) => !isCalendarExportEventValid(event))) {
    return null
  }

  const nowStamp = formatUtcForCalendar(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YouthSports.team//Portal Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    const start = toDate(event.startTime)
    const end = toDate(event.endTime)

    if (!start || !end) {
      return null
    }

    const uid = `${event.id}@youthsports.team`
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${nowStamp}`)
    lines.push(`DTSTART:${formatUtcForCalendar(start)}`)
    lines.push(`DTEND:${formatUtcForCalendar(end)}`)
    lines.push(`SUMMARY:${sanitizeIcsText(event.title)}`)

    if (event.description?.trim()) {
      lines.push(`DESCRIPTION:${sanitizeIcsText(event.description.trim())}`)
    }

    if (event.location?.trim()) {
      lines.push(`LOCATION:${sanitizeIcsText(event.location.trim())}`)
    }

    if (event.url?.trim()) {
      lines.push(`URL:${sanitizeIcsText(event.url.trim())}`)
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldIcsLine).join('\r\n')
}

export function buildIcsDataUrl(events: CalendarExportEvent[]): string | null {
  const icsContent = buildIcsContent(events)
  if (!icsContent) {
    return null
  }

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`
}

export function buildCalendarExportLinks(event: CalendarExportEvent): CalendarExportLinks {
  return {
    googleUrl: buildGoogleCalendarUrl(event),
    icsUrl: buildIcsDataUrl([event]),
    filename: `${sanitizeCalendarFilename(event.title)}.ics`,
  }
}
