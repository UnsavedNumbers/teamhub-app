/**
 * Demo Data Storage
 *
 * Persists user-mutable demo data across page refreshes using localStorage.
 * Keys are scoped by user ID so each demo user has isolated state.
 */

const STORAGE_PREFIX = 'ys_demo_'

function storageKey(userId: string, suffix: string): string {
    return `${STORAGE_PREFIX}${userId}_${suffix}`
}

function safeParse<T>(raw: string | null, fallback: T): T {
    if (raw == null) return fallback
    try {
        const parsed = JSON.parse(raw) as T
        return Array.isArray(parsed) ? parsed : fallback
    } catch {
        return fallback
    }
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return '[]'
    }
}

export interface StoredBookmark {
    id: string
    user_id: string
    event_id: string
    created_at: string
    event?: {
        id: string
        title: string
        start_time: string
        end_time: string
        location: string | null
        timezone?: string
    }
}

export interface StoredFollow {
    id: string
    user_id: string
    org_id: string
    source: 'manual' | 'post_purchase' | 'import'
    created_at: string
    org?: {
        id: string
        name: string
        slug: string | null
    }
}

/**
 * Load bookmarks for a user from localStorage
 */
export function loadBookmarks(userId: string): StoredBookmark[] {
    if (typeof window === 'undefined') return []
    const key = storageKey(userId, 'bookmarks')
    const raw = localStorage.getItem(key)
    return safeParse<StoredBookmark[]>(raw, [])
}

/**
 * Save bookmarks for a user to localStorage
 */
export function saveBookmarks(userId: string, bookmarks: StoredBookmark[]): void {
    if (typeof window === 'undefined') return
    const key = storageKey(userId, 'bookmarks')
    localStorage.setItem(key, safeStringify(bookmarks))
}

/**
 * Load follows for a user from localStorage
 */
export function loadFollows(userId: string): StoredFollow[] {
    if (typeof window === 'undefined') return []
    const key = storageKey(userId, 'follows')
    const raw = localStorage.getItem(key)
    return safeParse<StoredFollow[]>(raw, [])
}

/**
 * Save follows for a user to localStorage
 */
export function saveFollows(userId: string, follows: StoredFollow[]): void {
    if (typeof window === 'undefined') return
    const key = storageKey(userId, 'follows')
    localStorage.setItem(key, safeStringify(follows))
}

/**
 * Clear all demo data for a user (e.g., on logout or reset)
 */
export function clearUserDemoData(userId: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(storageKey(userId, 'bookmarks'))
    localStorage.removeItem(storageKey(userId, 'follows'))
}

/**
 * Clear all demo data (all users)
 */
export function clearAllDemoData(): void {
    if (typeof window === 'undefined') return
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(key)
        }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
}

// ============================================
// TICKETING (global demo state)
// ============================================

const TICKETING_KEY = `${STORAGE_PREFIX}ticketing`

export interface StoredTicketingState {
    orders: unknown[]
    orderItems: unknown[]
    tickets: unknown[]
    version: number
}

const TICKETING_VERSION = 1

export function loadTicketingState(): StoredTicketingState | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(TICKETING_KEY)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as StoredTicketingState
        if (parsed?.version === TICKETING_VERSION && Array.isArray(parsed.orders)) {
            return parsed
        }
    } catch {
        // ignore
    }
    return null
}

export function saveTicketingState(state: StoredTicketingState): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(TICKETING_KEY, JSON.stringify({
            ...state,
            version: TICKETING_VERSION,
        }))
    } catch {
        // ignore quota or other errors
    }
}
