export function formatDate(value: string | Date, format: string = 'MMM d, yyyy'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  switch (format) {
    case 'MMMM yyyy':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    case 'MMM d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'MMM d, yyyy':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    case 'h:mm a':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    case 'MMM d, yyyy h:mm a':
      return `${formatDate(date, 'MMM d, yyyy')} ${formatDate(date, 'h:mm a')}`
    case 'MMM':
      return date.toLocaleDateString('en-US', { month: 'short' })
    case 'd':
      return String(date.getDate())
    default:
      return date.toLocaleDateString('en-US')
  }
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date: Date): Date {
  const next = new Date(date)
  const day = next.getDay()
  next.setDate(next.getDate() - day)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfWeek(date: Date): Date {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 6)
  next.setHours(23, 59, 59, 999)
  return next
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
