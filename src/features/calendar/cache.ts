const CACHE_PREFIX = 'calendar-cache-v1'

interface CachedRecord<T> {
  updatedAt: string
  data: T
}

function getStorageKey(scope: string): string {
  return `${CACHE_PREFIX}:${scope}`
}

export function writeCalendarCache<T>(scope: string, data: T): void {
  try {
    const payload: CachedRecord<T> = {
      updatedAt: new Date().toISOString(),
      data,
    }
    localStorage.setItem(getStorageKey(scope), JSON.stringify(payload))
  } catch {
    // Ignore storage failures so UI continues to function.
  }
}

export function readCalendarCache<T>(scope: string): CachedRecord<T> | null {
  try {
    const raw = localStorage.getItem(getStorageKey(scope))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CachedRecord<T>>
    if (!parsed || typeof parsed.updatedAt !== 'string' || !('data' in parsed)) {
      return null
    }

    return {
      updatedAt: parsed.updatedAt,
      data: parsed.data as T,
    }
  } catch {
    return null
  }
}
